import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAccounts() {
  try {
    const res = await pool.query('SELECT id, "accountId", "providerId", "userId" FROM "account"');
    console.log('Accounts in database:', res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAccounts();
