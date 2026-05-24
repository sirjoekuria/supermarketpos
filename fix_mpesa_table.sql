-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This fixes the mpesa_transactions table and adds all missing RLS policies

-- Create the table if it doesn't exist
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

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON public.mpesa_transactions(status);

-- Enable RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.mpesa_transactions;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.mpesa_transactions;
DROP POLICY IF EXISTS "Enable update for service role" ON public.mpesa_transactions;
DROP POLICY IF EXISTS "Allow all for service role" ON public.mpesa_transactions;

-- Allow service_role (used by server-side code) full access
CREATE POLICY "Allow all for service role"
  ON public.mpesa_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Enable read access for all authenticated users"
  ON public.mpesa_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
