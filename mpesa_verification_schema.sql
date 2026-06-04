-- 1. Make checkout_request_id nullable in mpesa_transactions (to allow manual entries)
ALTER TABLE public.mpesa_transactions 
  ALTER COLUMN checkout_request_id DROP NOT NULL;

-- 2. Add customer_name column to mpesa_transactions
ALTER TABLE public.mpesa_transactions 
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- 3. Add unique constraint to mpesa_receipt_number to prevent double-spending
ALTER TABLE public.mpesa_transactions 
  ADD CONSTRAINT unique_mpesa_receipt_number UNIQUE (mpesa_receipt_number);

-- 4. Add mpesa_transaction_id to sales table for receipt lookup
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS mpesa_transaction_id VARCHAR(255);

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
