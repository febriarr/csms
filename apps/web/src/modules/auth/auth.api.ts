import type { User } from "@workspace/shared";
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from "@workspace/validator";

import { http } from "@/lib/http-client";

import type { LoginResult } from "./auth.type";

/** Must match `basePath` in the backend's betterAuth() config (default "/api/auth"). */
const AUTH_PATH = "/auth";

// 401 is a normal answer for all three calls, so they opt out of the global "session expired" handler.
const authRequest = { skipUnauthorizedHandler: true } as const;

/**
 * Used on page load/refresh to find out who the cookie belongs to.
 * Resolves to null when nobody is signed in (Better Auth answers 200 with a null body).
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<User | null> {
    const { data } = await http.get<{ user: User } | null>(`${AUTH_PATH}/get-session`, { ...authRequest, signal });
    return data?.user ?? null;
}

export async function signInWithUsername(input: LoginInput): Promise<LoginResult> {
    const { data } = await http.post<LoginResult>(`${AUTH_PATH}/sign-in/username`, input, authRequest);
    return data;
}

export async function signOut(): Promise<void> {
    await http.post(`${AUTH_PATH}/sign-out`, {}, authRequest);
}

/**
 * Own-account endpoints of the NestJS `UserController` (not Better Auth's `/auth/*`). The target account is
 * always the caller's session, so no id is sent. Unlike the calls above, a 401 here really means the session
 * expired, so the global handler stays on.
 */
export async function updateOwnProfile(input: UpdateProfileInput): Promise<{ name: string }> {
    const { data } = await http.patch<{ name: string }>("/user/me", input);
    return data;
}

export async function changeOwnPassword(input: ChangePasswordInput): Promise<void> {
    await http.patch("/user/me/password", input);
}
