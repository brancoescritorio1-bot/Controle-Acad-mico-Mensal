-- Add active status columns to chacara_users table
ALTER TABLE chacara_users 
ADD COLUMN IF NOT EXISTS energy_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS water_active BOOLEAN DEFAULT true;

-- Update existing records to have active status true
UPDATE chacara_users SET energy_active = true WHERE energy_active IS NULL;
UPDATE chacara_users SET water_active = true WHERE water_active IS NULL;
