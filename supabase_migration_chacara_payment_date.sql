-- Add payment_date column to chacara_bills table
ALTER TABLE chacara_bills 
ADD COLUMN IF NOT EXISTS payment_date DATE;
