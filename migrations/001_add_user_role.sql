-- Add role column to user table if it doesn't exist
-- This migration adds admin role support to the user table

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user"("role");

