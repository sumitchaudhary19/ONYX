-- ============================================================
-- CAMPUS RADAR — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. CAMPUS_RADAR table
CREATE TABLE IF NOT EXISTS campus_radar (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_type   text NOT NULL CHECK (post_type IN ('lost', 'found')),
  title       text NOT NULL,
  category    text NOT NULL DEFAULT 'Other',
  location    text NOT NULL DEFAULT 'Unknown',
  description text,
  photo_url   text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'resolved')),
  claimer_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_campus_radar_owner    ON campus_radar(owner_id);
CREATE INDEX IF NOT EXISTS idx_campus_radar_status   ON campus_radar(status);
CREATE INDEX IF NOT EXISTS idx_campus_radar_type     ON campus_radar(post_type);
CREATE INDEX IF NOT EXISTS idx_campus_radar_created  ON campus_radar(created_at DESC);

-- 3. Enable RLS
ALTER TABLE campus_radar ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "radar_select"  ON campus_radar FOR SELECT TO authenticated USING (true);
CREATE POLICY "radar_insert"  ON campus_radar FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "radar_update"  ON campus_radar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "radar_delete"  ON campus_radar FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 5. Enable Realtime
ALTER publication supabase_realtime ADD TABLE campus_radar;

-- 6. Auto-expire: delete unresolved posts older than 15 days (runs daily at 3AM UTC)
-- NOTE: pg_cron must be enabled. If not available, skip this block.
-- To enable: Go to Supabase Dashboard > Database > Extensions > Enable pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-campus-radar',
      '0 3 * * *',
      $cron$DELETE FROM campus_radar WHERE status != 'resolved' AND created_at < now() - interval '15 days';$cron$
    );
  END IF;
END $$;
