-- Migration: Merged Updates for Marketing Module (publication_days, status constraint, and client_id in posts)
-- Execute this SQL query in your Supabase Dashboard SQL Editor to apply these updates.

-- ==========================================
-- 1. UPDATES FOR TABLE: marketing_clients
-- ==========================================

-- Add publication_days column if it doesn't exist
ALTER TABLE marketing_clients ADD COLUMN IF NOT EXISTS publication_days TEXT;

-- Drop the old status check constraint if it exists to allow new status options
ALTER TABLE marketing_clients DROP CONSTRAINT IF EXISTS marketing_clients_status_check;

-- Add the updated check constraint including: 'mensalista', 'semanal', 'anúncio', 'encerrado' (along with the legacy ones 'ativo', 'prospect', 'inativo')
ALTER TABLE marketing_clients ADD CONSTRAINT marketing_clients_status_check CHECK (status IN ('mensalista', 'semanal', 'anúncio', 'encerrado', 'ativo', 'prospect', 'inativo'));


-- ==========================================
-- 2. UPDATES FOR TABLE: marketing_posts
-- ==========================================

-- Add client_id column to marketing_posts if it doesn't exist
ALTER TABLE marketing_posts ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES marketing_clients(id) ON DELETE SET NULL;

-- Create index for performance on client_id
CREATE INDEX IF NOT EXISTS idx_marketing_posts_client_id ON marketing_posts(client_id);
