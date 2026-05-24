-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.stock_receipts;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.stock_receipt_items;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.stock_adjustments;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.stock_receipts;

-- Create more permissive policies for development
CREATE POLICY "Enable all access for stock_receipts" ON public.stock_receipts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for stock_receipt_items" ON public.stock_receipt_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for stock_adjustments" ON public.stock_adjustments
  FOR ALL USING (true) WITH CHECK (true);
