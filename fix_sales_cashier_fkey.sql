-- Fix the foreign key for cashier_id on the sales table
-- Currently it points to public.profiles, but the system relies on public.app_users for staff accounts.
-- This mismatch is causing the "violates foreign key constraint 'sales_cashier_id_fkey'" error during checkout.

BEGIN;

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.app_users(id);

NOTIFY pgrst, 'reload schema';

COMMIT;
