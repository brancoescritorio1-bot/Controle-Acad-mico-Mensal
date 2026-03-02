
-- Adicionar colunas de data de início para atividades e provas
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_1_inicio DATE;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_2_inicio DATE;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS prova_inicio DATE;

-- Garantir que as colunas de prazo final existam (caso não existam)
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_1_prazo DATE;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_2_prazo DATE;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS prova_data DATE;

-- Garantir que as colunas de notas existam
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_1_nota NUMERIC DEFAULT 0;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_2_nota NUMERIC DEFAULT 0;
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS prova_nota NUMERIC DEFAULT 0;

-- Garantir que as colunas de status existam
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_1_status TEXT DEFAULT 'Não iniciada';
ALTER TABLE notas_atividades ADD COLUMN IF NOT EXISTS atividade_2_status TEXT DEFAULT 'Não iniciada';
