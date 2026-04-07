import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function deleteUser() {
  try {
    await pool.query('DELETE FROM "account" WHERE "accountId" = \'admin@test.com\'');
    await pool.query('DELETE FROM "user" WHERE email = \'admin@test.com\'');
    console.log('Deleted existing user and account');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

deleteUser();
