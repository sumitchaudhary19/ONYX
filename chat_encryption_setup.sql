-- ══════════════════════════════════════════════════════════════
-- CHAT ENCRYPTION & STRICT RLS — SQL Setup
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════
-- NOTE: pgsodium TCE requires Supabase Pro plan.
-- Existing messages will NOT be retroactively encrypted.
-- ══════════════════════════════════════════════════════════════

-- 1. Enable pgsodium extension
-- ─────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Create encryption key for message content
-- ─────────────────────────────────────────────
-- Only run this ONCE. If the key already exists, this will error (safe to ignore).
SELECT pgsodium.create_key(
  name := 'onyx_chat_key',
  key_type := 'aead-det'
);

-- 3. Enable Transparent Column Encryption on messages.content
-- ────────────────────────────────────────────────────────────
-- This encrypts data at rest. Supabase API auto-decrypts for authorized users.
SECURITY LABEL FOR pgsodium ON COLUMN messages.content
  IS 'ENCRYPT WITH KEY ID (select id from pgsodium.valid_key where name = ''onyx_chat_key'') SECURITY INVOKER';

-- 4. Strict RLS on messages table
-- ────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies for clean recreation
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;
DROP POLICY IF EXISTS "Users can select own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- SELECT: Only sender or receiver can read their messages
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: Only the sender can insert (sender_id must match auth.uid)
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Only sender can update, and only within 15 minutes (for edits/delete-for-everyone)
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id AND created_at > now() - interval '15 minutes')
  WITH CHECK (auth.uid() = sender_id);

-- DELETE: Disabled globally (we use soft-delete via is_deleted flag)
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated
  USING (false);
