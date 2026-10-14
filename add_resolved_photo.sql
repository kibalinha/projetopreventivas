-- Add resolved_photo column to non_conformities table
-- Run this in Supabase SQL Editor

ALTER TABLE non_conformities 
ADD COLUMN IF NOT EXISTS resolved_photo TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'non_conformities' 
AND column_name = 'resolved_photo';
