import { db } from './client';
import { users } from './schema';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

export async function seedUsers() {
  const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 10);

  await db.insert(users).values([
    {
      name: 'febri',
      email: 'superadmin@mail.com',
      phone: '081234567890',
      password: hashedPassword,
      role: 'super_admin',
    },
    {
      name: 'Admin',
      email: 'admin@example.com',
      phone: '081234567891',
      password: hashedPassword,
      role: 'admin',
    },
  ]);
}

seedUsers()
  .then(() => {
    console.log('Users seeded successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error seeding users:', error);
    process.exit(1);
  });
