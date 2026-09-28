-- Add password_hash column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create initial users with bcrypt hashed passwords
-- Password for both: "123456"

-- Supervisor
INSERT INTO profiles (id, name, username, role, password_hash)
VALUES (
  gen_random_uuid(),
  'Supervisor',
  'supervisor',
  'supervisor',
  '$2b$10$2tLQCBGwik7HgMz1tLRoS.bbK5Z9ovdKfegugiIAMV.hy4HQicReS'
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
  '$2b$10$2tLQCBGwik7HgMz1tLRoS.bbK5Z9ovdKfegugiIAMV.hy4HQicReS'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Verify
SELECT username, name, role FROM profiles;