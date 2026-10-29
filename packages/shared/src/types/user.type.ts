import type { Timestamps } from "./timestamp.type";

export type UserRole = "super_admin" | "admin";

export interface User extends Timestamps {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    username: string;
    displayUsername: string;
    role: UserRole;
    banned: boolean;
    banReason: string | null;
    banExpires: Date | null;
}
