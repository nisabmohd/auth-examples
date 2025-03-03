import { getSession } from "./auth/session";
import { NextRequest, NextResponse } from "next/server";

const public_routes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
    const protected_path = !public_routes.includes(request.nextUrl.pathname);

    if (protected_path) {
        const user = await getSession();
        if (!user) return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
