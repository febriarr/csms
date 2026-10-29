import type { PaginationMeta, User } from "@workspace/shared";

export type UserListItem = Pick<
    User,
    "id" | "name" | "username" | "displayUsername" | "role" | "banned" | "createdAt" | "image"
>;

export type UserList = {
    data: UserListItem[];
    metadata: PaginationMeta;
};

export type CreatedUser = Pick<UserListItem, "id" | "name" | "username" | "role">;
