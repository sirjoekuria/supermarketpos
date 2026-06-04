-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category_id UUID REFERENCES public.categories(id),
    unit VARCHAR(50) DEFAULT 'pcs',
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create profiles/users table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'cashier',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create app users table for POS staff authentication and approvals
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
    password_hash TEXT NOT NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending_manager' CHECK (approval_status IN ('approved', 'pending_admin', 'pending_manager', 'rejected')),
    approved_by UUID REFERENCES public.app_users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create audit log table visible to admins
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID,
    actor_email VARCHAR(255),
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_users_approval_status ON public.app_users(approval_status);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    cashier_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create M-Pesa transactions table for Daraja STK Push tracking
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

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON public.mpesa_transactions(status);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_name VARCHAR(255) NOT NULL DEFAULT 'SuperMarket POS',
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 16,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    mpesa_enabled BOOLEAN DEFAULT true,
    dark_mode_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add initial default categories
INSERT INTO public.categories (name, description) VALUES 
('Dairy & Eggs', 'Milk, eggs, cheese and other dairy products'),
('Bakery', 'Bread, pastries, and baked goods'),
('Pantry Staples', 'Flour, sugar, rice, cooking oil, and salt');

-- Add RLS (Row Level Security) Policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.categories;
CREATE POLICY "Enable read access for all authenticated users" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.products;
CREATE POLICY "Enable read access for all authenticated users" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for all authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.app_users;
CREATE POLICY "Enable read access for all authenticated users" ON public.app_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.audit_logs;
CREATE POLICY "Enable read access for all authenticated users" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.sales;
CREATE POLICY "Enable read access for all authenticated users" ON public.sales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.sale_items;
CREATE POLICY "Enable read access for all authenticated users" ON public.sale_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.mpesa_transactions;
CREATE POLICY "Enable read access for all authenticated users" ON public.mpesa_transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.settings;
CREATE POLICY "Enable read access for all authenticated users" ON public.settings FOR SELECT TO authenticated USING (true);

-- Allow full access for now (you can restrict this later based on user role)
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.products;
CREATE POLICY "Enable insert access for all authenticated users" ON public.products FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.products;
CREATE POLICY "Enable update access for all authenticated users" ON public.products FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON public.products;
CREATE POLICY "Enable delete access for all authenticated users" ON public.products FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.sales;
CREATE POLICY "Enable insert access for all authenticated users" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.sale_items;
CREATE POLICY "Enable insert access for all authenticated users" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Optional: If you want to disable RLS entirely during development to avoid permission issues, 
-- you can run these instead:
/*
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
*/

-- =========================================================================
-- EXPIRY DATES + MULTI-BRANCH MIGRATIONS
-- =========================================================================

-- 1. Add expiry_date to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 2. Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Per-branch stock table
CREATE TABLE IF NOT EXISTS public.branch_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(branch_id, product_id)
);

-- 4. Add branch_id to app_users
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 5. Add branch_id to sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 6. Add branch_id to stock_adjustments (if exists)
ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 7. Add branch_id to stock_receipts (if exists)
ALTER TABLE public.stock_receipts
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 8. Insert a default "Main Branch" so existing data isn't orphaned
INSERT INTO public.branches (name, address) VALUES ('Main Branch', 'Head Office')
  ON CONFLICT DO NOTHING;

-- 9. Populate branch_stock with current stock for Main Branch
INSERT INTO public.branch_stock (branch_id, product_id, stock_quantity, min_stock_level)
SELECT b.id, p.id, p.stock_quantity, p.min_stock_level
FROM public.products p
CROSS JOIN (SELECT id FROM public.branches WHERE name = 'Main Branch' LIMIT 1) b
ON CONFLICT (branch_id, product_id) DO NOTHING;

-- 10. RLS policies for branches and branch_stock
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.branches;
CREATE POLICY "Enable read access for all authenticated users" ON public.branches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.branch_stock;
CREATE POLICY "Enable read access for all authenticated users" ON public.branch_stock FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.branches;
CREATE POLICY "Enable insert for authenticated users" ON public.branches FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.branches;
CREATE POLICY "Enable update for authenticated users" ON public.branches FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.branch_stock;
CREATE POLICY "Enable insert for authenticated users" ON public.branch_stock FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.branch_stock;
CREATE POLICY "Enable update for authenticated users" ON public.branch_stock FOR UPDATE TO authenticated USING (true);
