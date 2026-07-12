-- ============================================================
-- MY HUB — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. HUBS table
CREATE TABLE IF NOT EXISTS hubs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type       text NOT NULL CHECK (type IN ('core', 'section', 'lab')),
  btech_year text,
  branch     text,
  section    text,
  name       text NOT NULL,
  cr_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. HUB MEMBERS table
CREATE TABLE IF NOT EXISTS hub_members (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id    uuid REFERENCES hubs(id) ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, user_id)
);

-- 3. HUB MESSAGES table
CREATE TABLE IF NOT EXISTS hub_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id     uuid REFERENCES hubs(id) ON DELETE CASCADE NOT NULL,
  sender_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text,
  image_url  text,
  audio_url  text,
  file_url   text,
  file_name  text,
  mentions   text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. Add hub_id column to vault_links (for hub-scoped resources)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_links' AND column_name = 'hub_id'
  ) THEN
    ALTER TABLE vault_links ADD COLUMN hub_id uuid REFERENCES hubs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_hub_members_hub   ON hub_members(hub_id);
CREATE INDEX IF NOT EXISTS idx_hub_members_user  ON hub_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_messages_hub  ON hub_messages(hub_id);
CREATE INDEX IF NOT EXISTS idx_hubs_lookup       ON hubs(type, btech_year, branch, section);

-- 6. Enable RLS
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "hubs_select"  ON hubs         FOR SELECT TO authenticated USING (true);
CREATE POLICY "hubs_insert"  ON hubs         FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hubs_update"  ON hubs         FOR UPDATE TO authenticated USING (cr_id = auth.uid());
CREATE POLICY "hubs_delete"  ON hubs         FOR DELETE TO authenticated USING (cr_id = auth.uid());

CREATE POLICY "hub_members_select" ON hub_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_members_insert" ON hub_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hub_members_delete" ON hub_members FOR DELETE TO authenticated USING (true);

CREATE POLICY "hub_messages_select" ON hub_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_messages_insert" ON hub_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- 8. Enable Realtime
ALTER publication supabase_realtime ADD TABLE hub_messages;
ALTER publication supabase_realtime ADD TABLE hub_members;
