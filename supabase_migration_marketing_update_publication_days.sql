-- Add publication_days column
ALTER TABLE marketing_clients ADD COLUMN IF NOT EXISTS publication_days TEXT;

-- Update status constraint
ALTER TABLE marketing_clients DROP CONSTRAINT IF EXISTS marketing_clients_status_check;
ALTER TABLE marketing_clients ADD CONSTRAINT marketing_clients_status_check CHECK (status IN ('mensalista', 'semanal', 'anúncio', 'encerrado', 'ativo', 'prospect', 'inativo'));
