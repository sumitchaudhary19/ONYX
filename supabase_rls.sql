-- Supabase RLS Script for Multi-Tenant Data Isolation

-- 1. Create a helper function to get the current user's tenant_id efficiently
-- This avoids recursive policy checks on the profiles table
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id() RETURNS text AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Policies
-- Users can read profiles from their own tenant, OR read their own profile
CREATE POLICY "Tenant isolation for profiles select" ON profiles
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
  OR id = auth.uid()
);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- 4. Posts Policies
CREATE POLICY "Tenant isolation for posts select" ON posts
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Users can insert own posts in their tenant" ON posts
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  AND (tenant_id = public.get_auth_tenant_id() OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL))
);

CREATE POLICY "Users can update own posts" ON posts
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON posts
FOR DELETE USING (user_id = auth.uid());

-- 5. Vault Links Policies
CREATE POLICY "Tenant isolation for vault_links select" ON vault_links
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Users can insert vault_links in their tenant" ON vault_links
FOR INSERT WITH CHECK (
  uploader_id = auth.uid()
  AND (tenant_id = public.get_auth_tenant_id() OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL))
);

-- 6. Forge Listings Policies
CREATE POLICY "Tenant isolation for forge_listings select" ON forge_listings
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Users can insert forge_listings in their tenant" ON forge_listings
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  AND (tenant_id = public.get_auth_tenant_id() OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL))
);

CREATE POLICY "Users can update own forge_listings" ON forge_listings
FOR UPDATE USING (owner_id = auth.uid());

-- 7. Mess Menus & Votes
CREATE POLICY "Tenant isolation for mess_menus select" ON mess_menus
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Tenant isolation for mess_votes select" ON mess_votes
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Users can insert mess_votes in their tenant" ON mess_votes
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (tenant_id = public.get_auth_tenant_id() OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL))
);

-- 8. Hubs 
CREATE POLICY "Tenant isolation for hubs select" ON hubs
FOR SELECT USING (
  tenant_id = public.get_auth_tenant_id()
  OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL)
);

CREATE POLICY "Users can insert hubs in their tenant" ON hubs
FOR INSERT WITH CHECK (
  cr_id = auth.uid()
  AND (tenant_id = public.get_auth_tenant_id() OR (tenant_id IS NULL AND public.get_auth_tenant_id() IS NULL))
);
