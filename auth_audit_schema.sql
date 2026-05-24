-- Auth and audit tables for POS staff accounts.
-- Run this once in the Supabase SQL editor.

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

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_users'
      AND policyname = 'Enable read access for all authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for all authenticated users"
    ON public.app_users FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Enable read access for all authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for all authenticated users"
    ON public.audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
