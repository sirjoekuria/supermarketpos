-- Add phone column to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
