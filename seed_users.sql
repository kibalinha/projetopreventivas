-- Seed initial users for preventiva-app
-- Run this in Supabase SQL Editor

-- Create supervisor user
-- Note: You need to create the auth user first via Dashboard or API,
-- then insert the profile with the same UUID.

-- Option 1: Use Supabase Dashboard to create auth users, then run this for profiles:
-- INSERT INTO profiles (id, email, name, username, role) VALUES
-- ('AUTH_USER_UUID_HERE', 'supervisor@test.com', 'Supervisor', 'supervisor', 'supervisor'),
-- ('AUTH_USER_UUID_HERE', 'tecnico@test.com', 'Técnico', 'tecnico', 'tecnico');

-- Option 2: Create users via Supabase Admin API (requires service_role key)
-- This cannot be run in SQL Editor directly - use the Dashboard or a script.

-- Quick way: In Supabase Dashboard → Authentication → Users → "Add user"
-- 1. Email: supervisor@test.com, Password: 123456
--    User Metadata: {"name": "Supervisor", "username": "supervisor", "role": "supervisor"}
-- 2. Email: tecnico@test.com, Password: 123456
--    User Metadata: {"name": "Técnico", "username": "tecnico", "role": "tecnico"}
-- Then copy the UUIDs and insert into profiles table.