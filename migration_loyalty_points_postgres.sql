-- SQL MIGRATION FILE FOR LOYALTY POINTS SYSTEM IN POSTGRES (SUPABASE)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create the customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 2. Add loyalty point tracking fields to public.sales (transactions) table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0;

-- 3. Create point_transactions audit table
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'void_earn', 'void_redeem')),
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reference VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for points history lookup
CREATE INDEX IF NOT EXISTS idx_point_transactions_customer ON public.point_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_sale ON public.point_transactions(sale_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist (safe re-run ability)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable write access for all authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Allow all for service role" ON public.customers;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.point_transactions;
DROP POLICY IF EXISTS "Enable write access for all authenticated users" ON public.point_transactions;
DROP POLICY IF EXISTS "Allow all for service role" ON public.point_transactions;

-- 6. Create permissive RLS policies for our POS cashiers & manager roles
CREATE POLICY "Enable read access for all authenticated users" ON public.customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for all authenticated users" ON public.customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON public.customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);


CREATE POLICY "Enable read access for all authenticated users" ON public.point_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for all authenticated users" ON public.point_transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON public.point_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
