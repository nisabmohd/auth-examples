import crypto from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { redis } from "../db/redis/index.js";
import { db } from "../db/drizzle/client.js";
import { userTable } from "../db/drizzle/schema.js";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

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
    c: Context,
) {
    const id = createSessionId();
    await saveSession(id, user);
    setCookie(c, "session", id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000),
    });
}

export async function destroySession(c: Context) {
    const sessionId = getCookie(c, "session");
    if (!sessionId) return;
    await redis.del(`session:${sessionId}`);
    deleteCookie(c, "session");
}

async function queryDbSession(sessionId: string) {
    return await redis.get(`session:${sessionId}`) as
        | CreateSessionPayload
        | null;
}

// TODO: use in middleware
export function getSession(c: Context) {
    const sessionId = getCookie(c, "session");
    if (!sessionId) return null;
    return queryDbSession(sessionId);
}

export async function getSessionUser(c: Context) {
    const sessionUser = await getSession(c);
    if (!sessionUser) return null;
    const [user] = await db.select({
        id: userTable.id,
        fullName: userTable.fullName,
        email: userTable.email,
    }).from(userTable).where(
        eq(userTable.id, sessionUser.id),
    );
    if (!user) return null;
    return user;
}

// TODO: use in middleware
// export async function updateSession(req: NextRequest) {
//     const sessionId = req.cookies.get("session")?.value;
//     if (!sessionId) return null;
//     const sessionUser = await queryDbSession(sessionId);
//     if (!sessionUser) return null;
//     await saveSession(sessionId, sessionUser);

//     const res = NextResponse.next();
//     res.cookies.set({
//         name: "session",
//         value: sessionId,
//         httpOnly: true,
//         secure: true,
//         sameSite: "lax",
//         expires: new Date(Date.now() + EXPIRATION_TIME_IN_SECONDS * 1000),
//     });
//     return res;
// }
