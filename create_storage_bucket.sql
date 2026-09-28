-- Create Supabase Storage bucket for inspection photos
-- Run this in Supabase SQL Editor

-- Create the bucket (run once)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

-- Enable RLS on storage.objects (already enabled by default)
-- Create policies for public read and authenticated write
-- Note: Since we use anon key for everything, we need policies that allow anon access

-- Policy: Allow public read access to inspection-photos bucket
CREATE POLICY "Public read access for inspection photos" ON storage.objects
FOR SELECT USING (bucket_id = 'inspection-photos');

-- Policy: Allow anon insert to inspection-photos bucket
CREATE POLICY "Anon insert for inspection photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'inspection-photos');

-- Policy: Allow anon update to inspection-photos bucket
CREATE POLICY "Anon update for inspection photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'inspection-photos');

-- Policy: Allow anon delete from inspection-photos bucket
CREATE POLICY "Anon delete for inspection photos" ON storage.objects
FOR DELETE USING (bucket_id = 'inspection-photos');

-- Verify
SELECT * FROM storage.buckets WHERE id = 'inspection-photos';
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%inspection%';