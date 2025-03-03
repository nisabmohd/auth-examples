import { Provider } from "@/db/drizzle/schema";
import { Cookies } from "@/lib/utils";
import axios from "axios";
import crypto from "crypto";
import { EXPIRATION_TIME_IN_SECONDS } from "./session";

const redirectBaseUri = process.env.REDIRECT_URI!;

export type OAuthUser = {
    email: string;
    fullName: string;
    id: string;
    provider: Provider;
};

type OAuthConfig = {
    name: Provider;
    scope: string[];
    clientId: string;
    clientSecret: string;
    urls: {
        authorize: string;
        user: string;
        token: string;
    };
    userSchema: {
        transform: (
            data: unknown,
        ) => OAuthUser;
    };
};

type TokenResponse = {
    token_type: string;
    access_token: string;
    scope: string;
};

export class OAuthClient {
    private configOptions: OAuthConfig;

    public constructor(config: OAuthConfig) {
        this.configOptions = config;
    }

    private get redirectUri() {
        return new URL(this.configOptions.name, redirectBaseUri)
            .toString();
    }

    public getAuthorizeUrl(cookies: Cookies) {
        const state = createState(cookies);
        const challenge = createCodeChallenge(cookies);
        const url = new URL(this.configOptions.urls.authorize);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("client_id", this.configOptions.clientId);
        url.searchParams.set("scope", this.configOptions.scope.join(" "));
        url.searchParams.set("redirect_uri", this.redirectUri);
        url.searchParams.set("state", state);
        url.searchParams.set("code_challenge_method", "S256");
        url.searchParams.set(
            "code_challenge",
            crypto.hash("sha256", challenge, "base64url"),
        );
        return url.toString();
    }

    public async fetchUser(code: string, state: string, cookies: Cookies) {
        if (!validateState(state, cookies)) throw new Error("Invalid state");

        const { data: { access_token } } = await this.getToken(code, cookies);
        const { data } = await axios.get(this.configOptions.urls.user, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        return this.configOptions.userSchema.transform(data);
    }

    private getToken(code: string, cookies: Cookies) {
        const challenge = getCodeChallenge(cookies);
        if (!challenge) throw new Error("Invalid code challenge");

        return axios.post<TokenResponse>(this.configOptions.urls.token, {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": this.redirectUri,
            code_verifier: challenge,
        }, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            auth: {
                username: this.configOptions.clientId,
                password: this.configOptions.clientSecret,
            },
        });
    }
}

function createState(cookies: Cookies) {
    const state = crypto.randomBytes(64).toString("hex").normalize();
    cookies.set("state", state, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000,
    });
    return state;
}

function validateState(state: string, cookies: Cookies) {
    return state == cookies.get("state")?.value;
}

function createCodeChallenge(cookies: Cookies) {
    const challenge = crypto.randomBytes(64).toString("hex").normalize();
    cookies.set("challenge", challenge, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000,
    });
    return challenge;
}

function getCodeChallenge(cookies: Cookies) {
    return cookies.get("challenge")?.value;
}
