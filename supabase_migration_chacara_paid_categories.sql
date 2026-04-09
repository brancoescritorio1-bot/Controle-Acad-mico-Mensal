-- Add paid_categories column to chacara_bills table
ALTER TABLE chacara_bills 
ADD COLUMN IF NOT EXISTS paid_categories JSONB DEFAULT '{}';
