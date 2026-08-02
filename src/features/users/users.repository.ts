import { eq } from 'drizzle-orm';
import { Database, InsertUsers, SelectUsers, users } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export class UsersRepository extends BaseRepository<typeof users> {
  constructor(db: Database) {
    super(db, users);
  }

  async findMany(): Promise<SelectUsers[]> {
    return this.db.query.users.findMany();
  }

  async findByEmail(email: string): Promise<SelectUsers | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    return user ?? null;
  }

  async updateById(id: string, input: Partial<InsertUsers>): Promise<SelectUsers | undefined> {
    return this.update(eq(users.id, id), input);
  }

  async findByName(name: string): Promise<SelectUsers | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.name, name),
    });

    return user ?? null;
  }
}
