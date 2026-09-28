-- Add frequency column to boards table
-- Run this in Supabase SQL Editor

ALTER TABLE boards ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'semester' CHECK (frequency IN ('monthly', 'semester', 'annual'));

-- Update existing boards to semester (6 months)
UPDATE boards SET frequency = 'semester' WHERE frequency IS NULL;

-- Verify
SELECT code, frequency FROM boards LIMIT 10;