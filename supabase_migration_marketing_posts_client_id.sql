-- Add client_id column to marketing_posts if it doesn't exist
ALTER TABLE marketing_posts ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES marketing_clients(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_marketing_posts_client_id ON marketing_posts(client_id);
