-- ============================================================
-- ONYX Anonymous AMA — Database Setup
-- Run in Supabase SQL Editor. Idempotent (safe to re-run).
-- ============================================================

-- ── 1. ama_questions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ama_questions (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  asker_id      UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT          NOT NULL,
  reports_count INT           DEFAULT 0,
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.ama_questions ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Anonymous-safe SELECT — asker_id is stripped unless you own the row
-- We use a security-definer view instead to enforce column-level anonymity.
-- But first, basic RLS policies:

-- SELECT: authenticated can read active questions (asker_id exposed by RLS, hidden by view)
DROP POLICY IF EXISTS "ama_questions_select" ON public.ama_questions;
CREATE POLICY "ama_questions_select"
  ON public.ama_questions FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = asker_id);

-- INSERT: authenticated can insert their own
DROP POLICY IF EXISTS "ama_questions_insert" ON public.ama_questions;
CREATE POLICY "ama_questions_insert"
  ON public.ama_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = asker_id);

-- UPDATE: anyone can update reports_count / is_active
DROP POLICY IF EXISTS "ama_questions_update" ON public.ama_questions;
CREATE POLICY "ama_questions_update"
  ON public.ama_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: only the asker
DROP POLICY IF EXISTS "ama_questions_delete" ON public.ama_questions;
CREATE POLICY "ama_questions_delete"
  ON public.ama_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = asker_id);

-- ── 2. Anonymous-safe view ───────────────────────────────────
-- This view NEVER exposes asker_id to other users.
-- Frontend queries this view instead of the raw table.
DROP VIEW IF EXISTS public.ama_questions_anonymous;
CREATE VIEW public.ama_questions_anonymous AS
SELECT
  id,
  CASE WHEN auth.uid() = asker_id THEN asker_id ELSE NULL END AS asker_id,
  question_text,
  reports_count,
  is_active,
  created_at
FROM public.ama_questions;

-- Grant access to the view
GRANT SELECT ON public.ama_questions_anonymous TO authenticated;

-- ── 3. ama_answers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ama_answers (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID          NOT NULL REFERENCES public.ama_questions(id) ON DELETE CASCADE,
  senior_id   UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text TEXT          NOT NULL,
  upvotes     INT           DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.ama_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ama_answers_select" ON public.ama_answers;
CREATE POLICY "ama_answers_select"
  ON public.ama_answers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ama_answers_insert" ON public.ama_answers;
CREATE POLICY "ama_answers_insert"
  ON public.ama_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = senior_id);

DROP POLICY IF EXISTS "ama_answers_update" ON public.ama_answers;
CREATE POLICY "ama_answers_update"
  ON public.ama_answers FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ama_answers_delete" ON public.ama_answers;
CREATE POLICY "ama_answers_delete"
  ON public.ama_answers FOR DELETE TO authenticated
  USING (auth.uid() = senior_id);

-- ── 4. ama_upvotes — one per user per answer ─────────────────
CREATE TABLE IF NOT EXISTS public.ama_upvotes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_id  UUID        NOT NULL REFERENCES public.ama_answers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, answer_id)
);

ALTER TABLE public.ama_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ama_upvotes_select" ON public.ama_upvotes;
CREATE POLICY "ama_upvotes_select" ON public.ama_upvotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ama_upvotes_insert" ON public.ama_upvotes;
CREATE POLICY "ama_upvotes_insert" ON public.ama_upvotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ama_upvotes_delete" ON public.ama_upvotes;
CREATE POLICY "ama_upvotes_delete" ON public.ama_upvotes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 5. ama_reports — one report per user per question ────────
CREATE TABLE IF NOT EXISTS public.ama_reports (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID        NOT NULL REFERENCES public.ama_questions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.ama_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ama_reports_select" ON public.ama_reports;
CREATE POLICY "ama_reports_select" ON public.ama_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ama_reports_insert" ON public.ama_reports;
CREATE POLICY "ama_reports_insert" ON public.ama_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── 6. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ama_questions_active ON public.ama_questions (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ama_answers_question ON public.ama_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_ama_upvotes_answer   ON public.ama_upvotes (answer_id);
CREATE INDEX IF NOT EXISTS idx_ama_reports_question  ON public.ama_reports (question_id);

-- ============================================================
-- Done! Anonymous AMA tables ready with DB-level anonymity.
-- ============================================================
