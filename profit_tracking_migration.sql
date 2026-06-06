-- ============================================================
-- PROFIT TRACKING MIGRATION
-- Run this in your Supabase SQL Editor if the columns
-- don't already exist. Using IF NOT EXISTS so it's safe
-- to re-run at any time.
-- ============================================================

-- 1. Add cost_price per item to sale_items
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;

-- 2. Add profit per item to sale_items
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) DEFAULT 0;

-- 3. Add total profit to the sales header row
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(10, 2) DEFAULT 0;

-- 4. Speed up date-range queries on sales
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);

-- 5. Allow authenticated users to read sale_items (needed for reports join)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.sale_items;
CREATE POLICY "Enable read access for all authenticated users"
  ON public.sale_items FOR SELECT TO authenticated USING (true);

-- 6. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
