-- Add amount_paid column to chacara_bills table
ALTER TABLE chacara_bills 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
