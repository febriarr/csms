import { Auth } from '@/auth/auth';
import { BusinessRuleException } from '@/common/exception/app.exception';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { AuthService, Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import {
    changePasswordInput,
    type ChangePasswordInput,
    createUserInput,
    type CreateUserInput,
    updateProfileInput,
    type UpdateProfileInput,
    updateRoleInput,
    type UpdateRoleInput,
    updateUserInput,
    type UpdateUserInput,
} from '@workspace/validator';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

/**
 * Two groups of endpoints:
 *
 * - `me` routes: any signed-in user changes their own name or password. No @Roles, the default auth guard
 *   is enough, and the target is always the caller's own session, never an id from the request.
 * - the rest: super admins managing other users. Every call goes through Better Auth's admin plugin with the
 *   caller's own headers, so the plugin checks the caller's permission (see `ac` / `roles`) on top of @Roles.
 *
 * The `me` routes must stay above the `:id` ones, or "me" would be matched as an id.
 */
@Controller('user')
export class UserController {
    constructor(private readonly authService: AuthService<Auth>) {}

    @Patch('me')
    async updateProfile(
        @Body(new ZodValidationPipe(updateProfileInput)) input: UpdateProfileInput,
        @Req() req: Request,
    ) {
        await this.authService.api.updateUser({
            body: { name: input.name },
            headers: fromNodeHeaders(req.headers),
        });

        return { name: input.name };
    }

    /** Needs the current password. The caller's other sessions are ended, the one in use stays signed in. */
    @Patch('me/password')
    @HttpCode(HttpStatus.NO_CONTENT)
    async changePassword(
        @Body(new ZodValidationPipe(changePasswordInput)) input: ChangePasswordInput,
        @Req() req: Request,
    ): Promise<void> {
        await this.authService.api.changePassword({
            body: {
                currentPassword: input.currentPassword,
                newPassword: input.newPassword,
                revokeOtherSessions: true,
            },
            headers: fromNodeHeaders(req.headers),
        });
    }

    @Roles(['super_admin'])
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body(new ZodValidationPipe(createUserInput)) input: CreateUserInput, @Req() req: Request) {
        const username = input.username.toLowerCase();

        const { user } = await this.authService.api.createUser({
            body: {
                // sign-in is by username; the email only exists because Better Auth requires one
                email: `${username}@csms.local`,
                password: input.password,
                name: input.name,
                role: input.role,
                data: { username, displayUsername: input.username },
            },
            headers: fromNodeHeaders(req.headers),
        });

        return { id: user.id, name: user.name, username, role: user.role };
    }

    /** Admin reset of someone else's password: no current password needed, and they are signed out everywhere. */
    @Roles(['super_admin'])
    @Patch(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateUserInput)) input: UpdateUserInput,
        @Req() req: Request,
    ): Promise<void> {
        const headers = fromNodeHeaders(req.headers);

        await this.authService.api.setUserPassword({ body: { userId: id, newPassword: input.password }, headers });

        // setUserPassword leaves existing sessions alive: end them so the old password stops working everywhere
        await this.authService.api.revokeUserSessions({ body: { userId: id }, headers });
    }

    @Roles(['super_admin'])
    @Patch(':id/role')
    async updateRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ZodValidationPipe(updateRoleInput)) input: UpdateRoleInput,
        @Req() req: Request,
        @Session() session: UserSession,
    ) {
        if (session.user.id === id) {
            throw new BusinessRuleException('Tidak bisa mengubah role akun sendiri');
        }
        const { user } = await this.authService.api.setRole({
            body: { userId: id, role: input.role },
            headers: fromNodeHeaders(req.headers),
        });

        return { id: user.id, role: user.role };
    }
}
