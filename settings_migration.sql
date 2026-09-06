-- Add missing settings columns for shop info
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS shop_address TEXT,
  ADD COLUMN IF NOT EXISTS shop_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shop_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shop_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
