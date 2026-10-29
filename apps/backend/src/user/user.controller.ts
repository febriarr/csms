import { Auth } from '@/auth/auth';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { AuthService, Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { PaginationMeta } from '@workspace/shared';
import {
    changePasswordInput,
    type ChangePasswordInput,
    createUserInput,
    type CreateUserInput,
    listUsersQuery,
    type ListUsersQuery,
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
 * Three groups of endpoints:
 *
 * - `me` routes: any signed-in user changes their own name or password. No @Roles, the default auth guard
 *   is enough, and the target is always the caller's own session, never an id from the request.
 * - the rest: super admins managing other users. Every call goes through Better Auth's admin plugin with the
 *   caller's own headers, so the plugin checks the caller's permission (see `ac` / `roles`) on top of @Roles.
 *   A super admin cannot change the role of, or delete, their own account (the system could end up without one).
 * - the list (`GET /user`): returns `{ data, metadata }` and leaves the `{ success, data, metadata }` envelope
 *   to the response interceptor (see ApiSuccessResponse / WithMetadata).
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

    /**
     * Paginated user list, newest first. `search` matches the display name (the admin plugin can only search
     * `name` and `email`, and the email here is a placeholder), `role` filters by exact role.
     */
    @Roles(['super_admin'])
    @Get()
    async list(@Query(new ZodValidationPipe(listUsersQuery)) query: ListUsersQuery, @Req() req: Request) {
        const { page, pageSize, search, role } = query;

        const { users, total } = await this.authService.api.listUsers({
            query: {
                limit: pageSize,
                offset: (page - 1) * pageSize,
                sortBy: 'createdAt',
                sortDirection: 'desc',
                ...(search ? ({ searchValue: search, searchField: 'name', searchOperator: 'contains' } as const) : {}),
                ...(role ? ({ filterField: 'role', filterValue: role, filterOperator: 'eq' } as const) : {}),
            },
            headers: fromNodeHeaders(req.headers),
        });

        // The admin plugin types its users as `UserWithRole`, which does not know the columns the username plugin
        // adds. They are on the rows at runtime (listUsers returns the raw user rows), so only the type is widened.
        const listed = users as Array<
            (typeof users)[number] & { username?: string | null; displayUsername?: string | null }
        >;

        const metadata: PaginationMeta = {
            page,
            pageSize,
            totalItems: total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };

        return {
            // only what the list screen needs: no email (placeholder), no ban details, no image
            data: listed.map((user) => ({
                id: user.id,
                name: user.name,
                username: user.username,
                displayUsername: user.displayUsername,
                role: user.role,
                banned: user.banned ?? false,
                createdAt: user.createdAt,
            })),
            metadata,
        };
    }

    @Roles(['super_admin'])
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body(new ZodValidationPipe(createUserInput)) input: CreateUserInput, @Req() req: Request) {
        const username = input.username.toLowerCase();

        const images = [
            'https://pub-ed50815cb6224b8d8c84f55474767c07.r2.dev/profile/profile-user-1.png',
            'https://cdn.febriardiansyah.my.id/profile/profile-user-2.png',
            'https://cdn.febriardiansyah.my.id/profile/profile-user-3.png',
            'https://cdn.febriardiansyah.my.id/profile/profile-user-4.png',
            'https://cdn.febriardiansyah.my.id/profile/profile-user-5.png',
        ];

        const image = images[Math.floor(Math.random() * images.length)];

        const { user } = await this.authService.api.createUser({
            body: {
                // sign-in is by username; the email only exists because Better Auth requires one
                email: `${username}@csms.local`,
                password: input.password,
                name: input.name,
                role: input.role,
                data: { username, displayUsername: input.username, image },
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
        if (session.user.id === id) throw new ForbiddenException('Tidak bisa mengubah role akun sendiri');

        const { user } = await this.authService.api.setRole({
            body: { userId: id, role: input.role },
            headers: fromNodeHeaders(req.headers),
        });

        return { id: user.id, role: user.role };
    }

    /** Removes the user together with their sessions and accounts (Better Auth admin plugin). */
    @Roles(['super_admin'])
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: Request,
        @Session() session: UserSession,
    ): Promise<void> {
        if (session.user.id === id) throw new ForbiddenException('Tidak bisa menghapus akun sendiri');

        await this.authService.api.removeUser({
            body: { userId: id },
            headers: fromNodeHeaders(req.headers),
        });
    }
}
