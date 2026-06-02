-- Add is_divergent and observations columns to chacara_bills table
ALTER TABLE chacara_bills 
ADD COLUMN IF NOT EXISTS is_divergent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS observations TEXT DEFAULT '';
