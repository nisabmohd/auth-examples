import { getOAuthClient } from "@/auth/oauth-client";
import { OAuthUser } from "@/auth/oauth";
import { createSession } from "@/auth/session";
import { db } from "@/db/drizzle/client";
import { oauthTable, Provider, userTable } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/utils";

const searchParamsSchema = z.object({
    code: z.string(),
    state: z.string(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: Provider }> },
) {
    try {
        const data = searchParamsSchema.parse(
            Object.fromEntries(request.nextUrl.searchParams),
        );
        const provider = (await params).provider;
        const user = await getOAuthClient(provider).fetchUser(
            data.code,
            data.state,
            await cookies(),
        );

        const result = await connectUser(user);
        await createSession(result, await cookies());
    } catch (err) {
        const message = getErrorMessage(err);
        redirect(`/login?error=${encodeURIComponent(message)}`);
    }
    redirect("/");
}

async function connectUser(oauthUser: OAuthUser) {
    let user = (await db.select().from(userTable).where(
        eq(userTable.email, oauthUser.email),
    ))[0];

    if (user == null) {
        [user] = await db
            .insert(userTable)
            .values({
                email: oauthUser.email,
                fullName: oauthUser.fullName,
            })
            .returning();
    }

    await db
        .insert(oauthTable)
        .values({
            provider: oauthUser.provider,
            providerAccountId: oauthUser.id,
            userId: user.id,
        })
        .onConflictDoNothing();

    return user;
}
