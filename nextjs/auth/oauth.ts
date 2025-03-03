import { Provider } from "@/db/drizzle/schema";
import axios from "axios";

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

    public getAuthorizeUrl() {
        const url = new URL(this.configOptions.urls.authorize);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("client_id", this.configOptions.clientId);
        url.searchParams.set("scope", this.configOptions.scope.join(" "));
        url.searchParams.set("redirect_uri", this.redirectUri);
        return url.toString();
    }

    public async fetchUser(code: string) {
        try {
            const { data: { access_token } } = await this.getToken(code);
            const { data } = await axios.get(this.configOptions.urls.user, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
            return this.configOptions.userSchema.transform(data);
        } catch (err) {
            console.error(err);
        }
    }

    private getToken(code: string) {
        return axios.post<TokenResponse>(this.configOptions.urls.token, {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": this.redirectUri,
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
