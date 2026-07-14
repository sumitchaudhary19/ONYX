-- ============================================================
-- STEALTH MULTI-TENANT — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add tenant_id to profiles (default: 'mnit' for existing users)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tenant_id') THEN
    ALTER TABLE profiles ADD COLUMN tenant_id text NOT NULL DEFAULT 'mnit';
  END IF;
END $$;

-- 2. Index for tenant scoping
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
