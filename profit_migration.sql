-- Profit Tracking Migration

-- 1. Add cost_price and profit columns to sale_items
ALTER TABLE public.sale_items 
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) DEFAULT 0;

-- 2. Add total_profit column to sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(10, 2) DEFAULT 0;

-- 3. Force PostgREST schema cache reload so the API picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
