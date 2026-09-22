import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../../src/features/users/users.service';
import { NotFoundError } from '../../../../src/shared/errors';
import { AuthenticationError } from '../../../../src/shared/errors/authentication-error';
import type { UsersRepository } from '../../../../src/features/users/users.repository';

function makeRepo(): UsersRepository {
  return {
    findMany: vi.fn(),
    findByEmail: vi.fn(),
    findByName: vi.fn(),
    updateById: vi.fn(),
    create: vi.fn(),
  } as unknown as UsersRepository;
}

const dbUser = {
  id: 'user-1',
  name: 'admin',
  email: 'admin@example.com',
  phone: null,
  password: '',
  role: 'admin' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let repo: UsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepo();
    service = new UsersService(repo);
  });

  describe('findMany', () => {
    it('should map raw users to response DTOs without leaking the password field', async () => {
      vi.mocked(repo.findMany).mockResolvedValue([dbUser]);

      const result = await service.findMany();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).toMatchObject({ id: 'user-1', name: 'admin', email: 'admin@example.com' });
    });
  });

  describe('create', () => {
    it('should hash the password before persisting and return the DTO without it', async () => {
      vi.mocked(repo.create).mockImplementation(async input => ({ ...dbUser, ...input }) as any);

      const result = await service.create({
        name: 'admin',
        email: 'admin@example.com',
        password: 'plaintext',
        role: 'admin',
      });

      const createCallArg = vi.mocked(repo.create).mock.calls[0][0];
      expect(createCallArg.password).not.toBe('plaintext');
      expect(await bcrypt.compare('plaintext', createCallArg.password as string)).toBe(true);
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('validateUser', () => {
    it('should throw NotFoundError when no user matches the given name', async () => {
      vi.mocked(repo.findByName).mockResolvedValue(null);

      await expect(service.validateUser('ghost', 'anything')).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthenticationError when the password does not match', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      vi.mocked(repo.findByName).mockResolvedValue({ ...dbUser, password: hashed });

      await expect(service.validateUser('admin', 'wrong-password')).rejects.toThrow(AuthenticationError);
    });

    it('should return the user DTO when the password matches', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      vi.mocked(repo.findByName).mockResolvedValue({ ...dbUser, password: hashed });

      const result = await service.validateUser('admin', 'correct-password');

      expect(result).toMatchObject({ id: 'user-1', name: 'admin' });
    });
  });
});
