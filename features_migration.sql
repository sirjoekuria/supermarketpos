-- =========================================================================
-- SETTINGS, LOYALTY SMS, AND SHIFTS MIGRATION
-- =========================================================================

-- 1. Add new columns to settings table
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS auto_print_receipt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_loyalty_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_api_key TEXT,
  ADD COLUMN IF NOT EXISTS sms_username VARCHAR(255);

-- 2. Create shifts table for End of Day management
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES public.branches(id),
    cashier_id UUID REFERENCES public.app_users(id) NOT NULL,
    starting_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actual_cash DECIMAL(10, 2),
    difference DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON public.shifts(cashier_id);

-- 3. RLS for shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.shifts;
CREATE POLICY "Enable read access for all authenticated users" ON public.shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.shifts;
CREATE POLICY "Enable insert for authenticated users" ON public.shifts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.shifts;
CREATE POLICY "Enable update for authenticated users" ON public.shifts FOR UPDATE TO authenticated USING (true);

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
