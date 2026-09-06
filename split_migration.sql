-- Add split_payments to sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS split_payments JSONB;

-- Notify pgrst
NOTIFY pgrst, 'reload schema';
