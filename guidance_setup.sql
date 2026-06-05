-- ============================================================
-- ONYX GUIDANCE HUB — Database Setup
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
-- ============================================================

-- ── 1. guidance_posts table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.guidance_posts (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id      UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_type       TEXT          NOT NULL CHECK (tab_type IN ('career', 'academic')),
  title          TEXT          NOT NULL,
  content        TEXT          NOT NULL DEFAULT '',
  tags           TEXT[]        DEFAULT '{}',
  helpful_claps  INT           DEFAULT 0,
  is_draft       BOOLEAN       DEFAULT FALSE,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.guidance_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated can read all published posts; authors can read their own drafts
DROP POLICY IF EXISTS "guidance_posts_select" ON public.guidance_posts;
CREATE POLICY "guidance_posts_select"
  ON public.guidance_posts FOR SELECT
  TO authenticated
  USING (is_draft = false OR auth.uid() = author_id);

-- INSERT: authenticated can insert their own posts
DROP POLICY IF EXISTS "guidance_posts_insert" ON public.guidance_posts;
CREATE POLICY "guidance_posts_insert"
  ON public.guidance_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: authors can update their own; others can only increment helpful_claps
DROP POLICY IF EXISTS "guidance_posts_update_own" ON public.guidance_posts;
CREATE POLICY "guidance_posts_update_own"
  ON public.guidance_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "guidance_posts_clap" ON public.guidance_posts;
CREATE POLICY "guidance_posts_clap"
  ON public.guidance_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    author_id  = (SELECT gp.author_id  FROM public.guidance_posts gp WHERE gp.id = id)
    AND tab_type = (SELECT gp.tab_type  FROM public.guidance_posts gp WHERE gp.id = id)
    AND title    = (SELECT gp.title     FROM public.guidance_posts gp WHERE gp.id = id)
    AND content  = (SELECT gp.content   FROM public.guidance_posts gp WHERE gp.id = id)
    AND is_draft = (SELECT gp.is_draft  FROM public.guidance_posts gp WHERE gp.id = id)
  );

-- DELETE: only authors
DROP POLICY IF EXISTS "guidance_posts_delete" ON public.guidance_posts;
CREATE POLICY "guidance_posts_delete"
  ON public.guidance_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ── 2. guidance_claps — one clap per user per post ───────────
CREATE TABLE IF NOT EXISTS public.guidance_claps (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES public.guidance_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.guidance_claps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guidance_claps_select" ON public.guidance_claps;
CREATE POLICY "guidance_claps_select" ON public.guidance_claps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "guidance_claps_insert" ON public.guidance_claps;
CREATE POLICY "guidance_claps_insert" ON public.guidance_claps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "guidance_claps_delete" ON public.guidance_claps;
CREATE POLICY "guidance_claps_delete" ON public.guidance_claps FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 3. guidance_follows — senior follow tracking ─────────────
CREATE TABLE IF NOT EXISTS public.guidance_follows (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  senior_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, senior_id)
);

ALTER TABLE public.guidance_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guidance_follows_select" ON public.guidance_follows;
CREATE POLICY "guidance_follows_select" ON public.guidance_follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "guidance_follows_insert" ON public.guidance_follows;
CREATE POLICY "guidance_follows_insert" ON public.guidance_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "guidance_follows_delete" ON public.guidance_follows;
CREATE POLICY "guidance_follows_delete" ON public.guidance_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ── 4. notifications table (if not already created) ──────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}'::jsonb,
  is_read     BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = receiver_id);

-- ── 5. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guidance_posts_author    ON public.guidance_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_guidance_posts_tab_type  ON public.guidance_posts (tab_type, is_draft, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guidance_claps_post      ON public.guidance_claps (post_id);
CREATE INDEX IF NOT EXISTS idx_guidance_follows_senior  ON public.guidance_follows (senior_id);
CREATE INDEX IF NOT EXISTS idx_notifications_receiver   ON public.notifications (receiver_id, created_at DESC);
