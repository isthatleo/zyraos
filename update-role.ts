import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateUserRole() {
  try {
    await pool.query('UPDATE "user" SET role = \'super_admin\' WHERE email = \'admin@test.com\'');
    console.log('Updated user role to super_admin');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

updateUserRole();
