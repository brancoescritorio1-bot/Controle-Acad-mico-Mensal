ALTER TABLE escalas ADD COLUMN IF NOT EXISTS email_subject_template TEXT;
ALTER TABLE escalas ADD COLUMN IF NOT EXISTS email_body_template TEXT;
