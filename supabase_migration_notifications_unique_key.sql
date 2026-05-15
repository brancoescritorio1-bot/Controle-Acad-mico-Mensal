ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS unique_key TEXT;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_unique_key_user_key UNIQUE (user_id, unique_key);
