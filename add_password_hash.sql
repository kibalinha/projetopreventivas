-- Add password_hash column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create unique constraint on username if not exists
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles (username);

-- Temporarily drop foreign key to allow internal users without auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create initial users with bcrypt hashed passwords
-- Password for both: "123456"

-- Supervisor
INSERT INTO profiles (id, name, username, role, password_hash)
VALUES (
  gen_random_uuid(),
  'Supervisor',
  'supervisor',
  'supervisor',
  '$2b$10$iGw3HbBO2dd5x7EuOjtR3ObO9cmXftpj5bgIFMGMmaYk/jLRy.vQq'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Técnico
INSERT INTO profiles (id, name, username, role, password_hash)
VALUES (
  gen_random_uuid(),
  'Técnico',
  'tecnico',
  'tecnico',
  '$2b$10$iGw3HbBO2dd5x7EuOjtR3ObO9cmXftpj5bgIFMGMmaYk/jLRy.vQq'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Verify
SELECT username, name, role, password_hash IS NOT NULL as has_password FROM profiles;