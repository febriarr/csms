import { apiData, http } from "@/lib/http-client";
import type { ApiSuccessResponse, UserRole } from "@workspace/shared";
import type { CreateUserInput, ListUsersQuery } from "@workspace/validator";

import type { CreatedUser, UserList, UserListItem } from "./user.type";

export async function getUsers(query: Partial<ListUsersQuery> = {}, signal?: AbortSignal): Promise<UserList> {
    // The list needs the pagination metadata too, so the envelope is not unwrapped with apiData here.
    const { data: body } = await http.get<ApiSuccessResponse<UserListItem[]>>("/user", { params: query, signal });

    return {
        data: body.data,
        metadata: body.metadata ?? {
            page: 1,
            pageSize: body.data.length,
            totalItems: body.data.length,
            totalPages: 1,
        },
    };
}

export function createUser(input: CreateUserInput): Promise<CreatedUser> {
    return apiData(http.post<ApiSuccessResponse<CreatedUser>>("/user", input));
}

export type UserChanges = {
    role?: UserRole;
    /** Admin reset: the user is signed out everywhere. */
    password?: string;
};

/** Role and password live on two endpoints, so only the ones that changed are called. */
export async function updateUser(id: string, changes: UserChanges): Promise<void> {
    if (changes.role) await http.patch(`/user/${id}/role`, { role: changes.role });
    if (changes.password) await http.patch(`/user/${id}`, { password: changes.password });
}

export async function deleteUser(id: string): Promise<void> {
    await http.delete(`/user/${id}`);
}
