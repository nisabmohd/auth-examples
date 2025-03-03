import { Provider } from "@/db/drizzle/schema";
import { OAuthClient } from "./oauth";
import { z } from "zod";

const discordUserSchema = z.object({
    id: z.string(),
    username: z.string().optional(),
    global_name: z.string(),
    email: z.string().email(),
});

const aAuthDiscordClient = new OAuthClient({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    name: "discord",
    scope: ["identify", "email"],
    urls: {
        authorize: "https://discord.com/oauth2/authorize",
        token: "https://discord.com/api/oauth2/token",
        user: "https://discord.com/api/users/@me",
    },
    userSchema: {
        transform(data) {
            const { email, id, global_name, username } = discordUserSchema
                .parse(data);
            return {
                email,
                id,
                fullName: username ?? global_name,
                provider: "discord",
            };
        },
    },
});

const githubUserSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
});

const aAuthGithubClient = new OAuthClient({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    name: "github",
    scope: ["read:user", "user:email"],
    urls: {
        authorize: "https://github.com/login/oauth/authorize",
        token: "https://github.com/login/oauth/access_token",
        user: "https://api.github.com/user",
    },
    userSchema: {
        transform(data) {
            const { email, id, name } = githubUserSchema
                .parse(data);
            return {
                email,
                id: id.toString(),
                fullName: name,
                provider: "github",
            };
        },
    },
});

export function getOAuthClient(provider: Provider) {
    switch (provider) {
        case "discord":
            return aAuthDiscordClient;
        case "github":
            return aAuthGithubClient;
    }
}
