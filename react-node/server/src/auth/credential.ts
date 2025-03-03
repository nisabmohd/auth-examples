import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db/drizzle/client.js";
import { userTable } from "../db/drizzle/schema.js";

export const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(18),
    fullName: z.string(),
});

export type SignUpPayload = z.infer<typeof signUpSchema>;

export async function signUp(payload: SignUpPayload) {
    const { email, password, fullName } = payload;
    let [user] = await db.select().from(userTable).where(
        eq(userTable.email, email),
    );
    if (user) throw new Error("User already exist");
    const salt = generateSalt();
    const hashedPassword = await hashPassword(password, salt);
    [user] = await db.insert(userTable).values({
        email,
        password: hashedPassword,
        fullName,
        salt,
    }).returning();
    return user;
}

export const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(18),
});

export type SignInPayload = z.infer<typeof signInSchema>;

export async function signIn(payload: SignInPayload) {
    const { email, password } = payload;
    const [user] = await db.select().from(userTable).where(
        eq(userTable.email, email),
    );
    if (!user) throw new Error("User not found");
    if (!user.password || !user.salt) throw new Error("Unable to login");
    const correctPassword = await checkPassword(
        password,
        user.password,
        user.salt,
    );
    if (!correctPassword) throw new Error("Invalid credentials");
    return user;
}

async function checkPassword(
    givenPassword: string,
    hashedPassword: string,
    salt: string,
) {
    const givenHashed = await hashPassword(givenPassword, salt);
    return crypto.timingSafeEqual(
        Buffer.from(givenHashed, "hex"),
        Buffer.from(hashedPassword, "hex"),
    );
}

function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, hash) => {
            if (err) reject(err);
            resolve(hash.toString("hex"));
        });
    });
}

function generateSalt() {
    return crypto.randomBytes(24).toString("hex");
}
