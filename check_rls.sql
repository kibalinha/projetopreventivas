-- Check RLS policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check if RLS is enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles';