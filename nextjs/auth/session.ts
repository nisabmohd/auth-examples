import { db } from "@/db/drizzle/client";
import { usersTable } from "@/db/drizzle/schema";
import { redis } from "@/db/redis";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { cookies as nextCookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";

const EXPIRATION_TIME_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days

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

export async function createSession(user: CreateSessionPayload) {
    const id = createSessionId();
    await saveSession(id, user);
    const cookies = await nextCookies();
    cookies.set("session", id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000),
    });
}

export async function destroySession() {
    const cookies = await nextCookies();
    const sessionId = cookies.get("session")?.value;
    if (!sessionId) return;
    await redis.del(`session:${sessionId}`);
    cookies.delete("session");
}

export const getSession = cache(async () => {
    const cookies = await nextCookies();
    const sessionId = cookies.get("session")?.value;
    if (!sessionId) return null;
    const sessionUser = await redis.get(`session:${sessionId}`) as
        | CreateSessionPayload
        | null;
    if (!sessionUser) return null;
    return sessionUser;
});

export const getSessionUser = cache(async () => {
    const sessionUser = await getSession();
    if (!sessionUser) return null;
    const [user] = await db.select().from(usersTable).where(
        eq(usersTable.id, sessionUser.id),
    );
    if (!user) return null;
    return user;
});
