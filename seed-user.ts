import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedUser() {
  try {
    console.log('Connecting to database...');

    // Test connection
    await pool.query('SELECT 1');
    console.log('Database connected successfully');

    // Delete existing users
    console.log('Deleting existing users...');
    await pool.query('TRUNCATE TABLE "session" CASCADE');
    await pool.query('TRUNCATE TABLE "account" CASCADE');
    await pool.query('TRUNCATE TABLE "verification" CASCADE');
    await pool.query('TRUNCATE TABLE "user" CASCADE');
    console.log('Existing users deleted');

    // Create super admin user
    console.log('Creating super admin user...');
    const userResult = await pool.query(`
      INSERT INTO "user" (id, email, "emailVerified", name, image, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'admin@test.com', true, 'Test Admin', NULL, 'super_admin', NOW(), NOW())
      RETURNING id
    `);

    const userId = userResult.rows[0].id;
    console.log('User created with ID:', userId);

    // Create account with password
    console.log('Creating account with password...');
    await pool.query(`
      INSERT INTO "account" (id, "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        'admin@test.com',
        'credential',
        $1,
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        NOW(),
        NOW()
      )
    `, [userId]);

    console.log('Account created successfully');
    console.log('Super admin user created: admin@test.com / password123');

  } catch (error) {
    console.error('Error seeding user:', error);
  } finally {
    await pool.end();
  }
}

seedUser();
