-- M-Pesa Daraja STK Push tracking table.
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    merchant_request_id VARCHAR(255),
    checkout_request_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    account_reference VARCHAR(255),
    result_code INTEGER,
    result_desc TEXT,
    mpesa_receipt_number VARCHAR(255),
    transaction_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request_id
ON public.mpesa_transactions(checkout_request_id);

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status
ON public.mpesa_transactions(status);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mpesa_transactions'
      AND policyname = 'Enable read access for all authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for all authenticated users"
    ON public.mpesa_transactions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
