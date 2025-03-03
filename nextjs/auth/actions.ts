"use server";

import { getErrorMessage } from "@/lib/utils";
import { signIn, SignInPayload, signUp, SignUpPayload } from "./credential";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "./session";

export async function credentialsLogin(payload: SignInPayload) {
    try {
        const user = await signIn(payload);
        await createSession(user);
    } catch (err) {
        const message = getErrorMessage(err);
        redirect(`/login?error=${encodeURIComponent(message)}`);
    }
    redirect("/");
}

export async function credentialsRegister(payload: SignUpPayload) {
    try {
        const user = await signUp(payload);
        await createSession(user);
    } catch (err) {
        const message = getErrorMessage(err);
        redirect(`/register?error=${encodeURIComponent(message)}`);
    }
    redirect("/");
}

export async function logout() {
    await destroySession();
    redirect("/login");
}
