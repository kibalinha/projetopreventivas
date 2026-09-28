-- Add resolver tracking fields to non_conformities table
-- Run this in Supabase SQL Editor

ALTER TABLE non_conformities 
ADD COLUMN IF NOT EXISTS resolved_by TEXT,
ADD COLUMN IF NOT EXISTS resolved_by_name TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'non_conformities' 
AND column_name IN ('resolved_by', 'resolved_by_name');