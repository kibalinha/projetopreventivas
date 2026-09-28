-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Allow anon read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anon insert profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Disable RLS temporarily to test
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles';