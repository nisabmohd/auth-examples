import { db } from "@/db/drizzle/client";
import { userTable } from "@/db/drizzle/schema";
import { redis } from "@/db/redis";
import { Cookies } from "@/lib/utils";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { cookies as nextCookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { cache } from "react";
import { z } from "zod";

export const EXPIRATION_TIME_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days

const createSessionSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(["user", "admin"]),
});

type CreateSessionPayload = z.infer<typeof createSessionSchema>;

function createSessionId() {
    return crypto.randomBytes(32).toString("hex");
}

function saveSession(id: string, user: CreateSessionPayload) {
    return redis.set(
        `session:${id}`,
        createSessionSchema.parse(user),
        {
            ex: EXPIRATION_TIME_IN_SECONDS,
        },
    );
}

export async function createSession(
    user: CreateSessionPayload,
    cookies: Cookies,
) {
    const id = createSessionId();
    await saveSession(id, user);
    cookies.set("session", id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000,
    });
}

export async function destroySession() {
    const cookies = await nextCookies();
    const sessionId = cookies.get("session")?.value;
    if (!sessionId) return;
    await redis.del(`session:${sessionId}`);
    cookies.delete("session");
}

async function queryDbSession(sessionId: string) {
    return await redis.get(`session:${sessionId}`) as
        | CreateSessionPayload
        | null;
}

export const getSession = cache(async () => {
    const cookies = await nextCookies();
    const sessionId = cookies.get("session")?.value;
    if (!sessionId) return null;
    return queryDbSession(sessionId);
});

export const getSessionUser = cache(async () => {
    const sessionUser = await getSession();
    if (!sessionUser) return null;
    const [user] = await db.select().from(userTable).where(
        eq(userTable.id, sessionUser.id),
    );
    if (!user) return null;
    return user;
});

export async function updateSession(req: NextRequest) {
    const sessionId = req.cookies.get("session")?.value;
    if (!sessionId) return null;
    const sessionUser = await queryDbSession(sessionId);
    if (!sessionUser) return null;
    await saveSession(sessionId, sessionUser);

    const res = NextResponse.next();
    res.cookies.set({
        name: "session",
        value: sessionId,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000),
    });
    return res;
}
