import { getOAuthClient } from "@/auth/client";
import { OAuthUser } from "@/auth/oauth";
import { createSession } from "@/auth/session";
import { db } from "@/db/drizzle/client";
import { oauthTable, Provider, userTable } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const searchParamsSchema = z.object({
    code: z.string(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: Provider }> },
) {
    const { success, data } = searchParamsSchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams),
    );
    const provider = (await params).provider;

    if (success) {
        const user = await getOAuthClient(provider).fetchUser(data.code);
        if (user) {
            const result = await connectUser(user);
            await createSession(result, await cookies());
            redirect("/");
        } else return NextResponse.json({ error: "Unable to connect" });
    }
    return NextResponse.json({ error: "Something went wrong" });
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
