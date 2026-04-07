#!/usr/bin/env node

/**
 * Database initialization script for ZyraAI Education Operations System
 * Run this script once before starting the application for the first time
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Initializing database...');
    
    // Drop existing tables in correct order (respecting foreign keys)
    console.log('🔄 Cleaning up existing tables...');
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE;');
    await pool.query('DROP TABLE IF EXISTS "account" CASCADE;');
    await pool.query('DROP TABLE IF EXISTS "verification" CASCADE;');
    await pool.query('DROP TABLE IF EXISTS "user" CASCADE;');
    console.log('✅ Cleaned up existing tables');

    // Create Better Auth tables from scratch
    console.log('📦 Creating Better Auth tables...');
    await pool.query(`
      CREATE TABLE "user" (
        id TEXT NOT NULL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        name TEXT,
        image TEXT,
        role TEXT DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created user table');

    await pool.query(`
      CREATE TABLE "session" (
        id TEXT NOT NULL PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Created session table');

    await pool.query(`
      CREATE TABLE "account" (
        id TEXT NOT NULL PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created account table');

    await pool.query(`
      CREATE TABLE "verification" (
        id TEXT NOT NULL PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created verification table');

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX "user_role_idx" ON "user"("role");
    `);
    console.log('✅ Created role index');

    await pool.query(`
      CREATE UNIQUE INDEX "account_provider_id_idx" ON "account"("providerId", "accountId");
    `);
    console.log('✅ Created account provider index');
    
    // Check if any users exist
    const result = await pool.query('SELECT COUNT(*) as count FROM "user"');
    const userCount = parseInt(result.rows[0].count);
    
    console.log(`ℹ️  Current user count: ${userCount}`);
    
    if (userCount === 0) {
      console.log('✅ Database ready! First user will automatically become Super Admin.');
    } else {
      console.log('⚠️  Database already has users. The first user should already be admin.');
    }
    
    console.log('\n✨ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();

