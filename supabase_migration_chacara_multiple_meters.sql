-- Adicionar colunas para múltiplos padrões de energia e água na tabela de usuários
ALTER TABLE chacara_users 
ADD COLUMN IF NOT EXISTS has_multiple_energy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_multiple_water BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reading_2 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_water_reading_2 NUMERIC DEFAULT 0;

-- Adicionar colunas para leituras do segundo padrão/hidrômetro na tabela de contas
ALTER TABLE chacara_bills
ADD COLUMN IF NOT EXISTS prev_reading_2 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS curr_reading_2 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_prev_reading_2 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_curr_reading_2 NUMERIC DEFAULT 0;
