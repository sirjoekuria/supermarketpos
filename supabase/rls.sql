-- =============================================================
-- Row Level Security (RLS) Configuration
-- SuperMarket POS — Supabase Migration
-- Run this in the Supabase SQL Editor (or via supabase db push)
-- =============================================================

-- ─── Helper: use service-role to bypass RLS for server-side calls ──────────
-- All API routes use the service-role key (SUPABASE_SERVICE_ROLE_KEY).
-- RLS is enabled to protect direct client access (anon / authenticated keys).
-- ────────────────────────────────────────────────────────────────────────────


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  1. app_users                                                ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Deny all direct anonymous access
CREATE POLICY "app_users: deny anon" ON app_users
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Service role bypasses RLS automatically — no explicit policy needed.


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  2. products                                                 ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Authenticated users (service role) can read products freely
CREATE POLICY "products: service role full access" ON products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon users can only read products (for public kiosk / display screens)
CREATE POLICY "products: anon read" ON products
  FOR SELECT
  TO anon
  USING (true);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  3. categories                                               ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: service role full access" ON categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "categories: anon read" ON categories
  FOR SELECT TO anon USING (true);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  4. customers                                                ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers: service role full access" ON customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon cannot read customer PII
CREATE POLICY "customers: deny anon" ON customers
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  5. sales                                                    ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales: service role full access" ON sales
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "sales: deny anon" ON sales
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  6. sale_items                                               ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items: service role full access" ON sale_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "sale_items: deny anon" ON sale_items
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  7. point_transactions                                       ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_transactions: service role full access" ON point_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "point_transactions: deny anon" ON point_transactions
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  8. audit_logs                                               ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only the service role can insert or read audit logs
CREATE POLICY "audit_logs: service role full access" ON audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "audit_logs: deny anon" ON audit_logs
  AS RESTRICTIVE FOR ALL TO anon USING (false);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  9. settings (shop config)                                   ║
-- ╚══════════════════════════════════════════════════════════════╝
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings: service role full access" ON settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon to read shop settings (used for receipt header, shop name display)
CREATE POLICY "settings: anon read" ON settings
  FOR SELECT TO anon USING (true);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  10. mpesa_transactions (if table exists)                    ║
-- ╚══════════════════════════════════════════════════════════════╝
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mpesa_transactions') THEN
    ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

    -- Drop if already exists to allow idempotent re-runs
    DROP POLICY IF EXISTS "mpesa_transactions: service role full access" ON mpesa_transactions;
    DROP POLICY IF EXISTS "mpesa_transactions: deny anon" ON mpesa_transactions;

    CREATE POLICY "mpesa_transactions: service role full access" ON mpesa_transactions
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    CREATE POLICY "mpesa_transactions: deny anon" ON mpesa_transactions
      AS RESTRICTIVE FOR ALL TO anon USING (false);
  END IF;
END $$;


-- ─── Verification query ───────────────────────────────────────────────────────
-- Run this to confirm RLS is active on all expected tables:
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
-- ─────────────────────────────────────────────────────────────────────────────
