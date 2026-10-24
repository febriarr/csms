import type { User } from "@workspace/shared";

export interface LoginResult {
    redirect: boolean;
    token: string;
    user: User;
}
