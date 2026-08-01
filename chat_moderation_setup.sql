-- ══════════════════════════════════════════════════════════════
-- CHAT MODERATION — SQL Setup
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. hidden_messages: "Delete for Me" per-user message hiding
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hidden_messages (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

ALTER TABLE hidden_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hidden" ON hidden_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hidden" ON hidden_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own hidden" ON hidden_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. message_reports: report abusive chat messages
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('abuse', 'spam', 'nsfw', 'other')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, reporter_id)
);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own msg reports" ON message_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can read own msg reports" ON message_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- 3. Add is_deleted flag to messages for "Delete for Everyone"
-- ─────────────────────────────────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
