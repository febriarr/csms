import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import type { ErrorResponse } from "@workspace/shared";
import type { LoginInput } from "@workspace/validator";

import { isErrorResponse } from "@/lib/api-error";

import { fetchCurrentUser, signInWithUsername, signOut } from "./auth.api";
import type { LoginResult } from "./auth.type";

export const authKeys = {
    session: ["auth", "session"] as const,
};

export const sessionQueryOptions = queryOptions({
    queryKey: authKeys.session,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: 5 * 60_000,
    // Detects an expired session when the user comes back to the tab.
    refetchOnWindowFocus: true,
    // 4xx will not fix itself; only retry network/5xx failures.
    retry: (failureCount, error) => {
        const clientError = error.statusCode >= 400 && error.statusCode < 500;
        return !clientError && failureCount < 2;
    },
});

/** Forgets the session and every cached query that belonged to it. */
export function clearSession(queryClient: QueryClient) {
    queryClient.setQueryData(authKeys.session, null);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.session[0] });
}

export function useSession() {
    return useQuery(sessionQueryOptions);
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation<LoginResult, ErrorResponse, LoginInput>({
        mutationFn: signInWithUsername,
        // The login response already carries the user, so no extra get-session request is needed.
        onSuccess: ({ user }) => queryClient.setQueryData(authKeys.session, user),
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation<void, ErrorResponse>({
        mutationFn: async () => {
            try {
                await signOut();
            } catch (error) {
                // Already signed out on the server: the goal is reached.
                if (!(isErrorResponse(error) && error.statusCode === 401)) throw error;
            }
        },
        onSuccess: () => clearSession(queryClient),
    });
}
