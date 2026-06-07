-- Performance Optimization: B-Tree Indexes
-- Run these commands in your Supabase SQL Editor to speed up database queries.

-- 1. Products Indexes
-- Frequently searched by name and barcode, and filtered by category
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);

-- 2. Customers Indexes
-- Searched heavily by phone and name during POS checkout
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);

-- 3. Sales Indexes
-- Needed for historical lookup, chronological sorting, and grouping by cashier
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON public.sales (cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);

-- 4. Sale Items Indexes
-- Needed to fetch items quickly for a specific sale or product historical stats
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);

-- 5. Users Indexes
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users (role);

-- 6. Branch Stock Indexes
-- Critical for fast stock lookups by branch and product
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_id ON public.branch_stock (branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_product_id ON public.branch_stock (product_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_product ON public.branch_stock (branch_id, product_id);
