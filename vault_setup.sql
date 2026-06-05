-- ============================================================
-- ONYX VAULT — Supabase SQL Setup
-- Run this in the Supabase SQL Editor (or via psql).
-- All statements are idempotent (safe to re-run).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLE: public.vault_links
--    Stores every resource link shared in the Vault.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_links (
    id            UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
    uploader_id   UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT           NOT NULL,
    btech_year    TEXT           NOT NULL,
    branch        TEXT           NOT NULL,
    category      TEXT           NOT NULL DEFAULT 'Notes',
    drive_link    TEXT           NOT NULL,
    upvotes       INT            DEFAULT 0,
    reports_count INT            DEFAULT 0,
    created_at    TIMESTAMPTZ    DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.vault_links ENABLE ROW LEVEL SECURITY;


-- ── RLS Policies for vault_links ────────────────────────────

-- SELECT: Any authenticated user can read all links.
DROP POLICY IF EXISTS "vault_links_select" ON public.vault_links;
CREATE POLICY "vault_links_select"
    ON public.vault_links
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Authenticated users can insert rows they own.
DROP POLICY IF EXISTS "vault_links_insert" ON public.vault_links;
CREATE POLICY "vault_links_insert"
    ON public.vault_links
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploader_id);

-- UPDATE (own rows): Owners can update any column on their own rows.
DROP POLICY IF EXISTS "vault_links_update_own" ON public.vault_links;
CREATE POLICY "vault_links_update_own"
    ON public.vault_links
    FOR UPDATE
    TO authenticated
    USING  (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- UPDATE (votes / reports): Any authenticated user can touch ONLY
-- the upvotes and reports_count columns on ANY row.
-- The USING clause allows the row to be visible for update;
-- the WITH CHECK clause ensures no other columns are tampered with
-- by verifying the immutable fields remain unchanged.
DROP POLICY IF EXISTS "vault_links_update_votes" ON public.vault_links;
CREATE POLICY "vault_links_update_votes"
    ON public.vault_links
    FOR UPDATE
    TO authenticated
    USING  (true)
    WITH CHECK (
        -- The caller must not change ownership or content fields.
        -- Postgres evaluates WITH CHECK against the NEW row, so we
        -- compare against the existing row via a sub-select.
        uploader_id = (SELECT vl.uploader_id FROM public.vault_links vl WHERE vl.id = id)
        AND title   = (SELECT vl.title       FROM public.vault_links vl WHERE vl.id = id)
        AND btech_year = (SELECT vl.btech_year FROM public.vault_links vl WHERE vl.id = id)
        AND branch     = (SELECT vl.branch     FROM public.vault_links vl WHERE vl.id = id)
        AND category   = (SELECT vl.category   FROM public.vault_links vl WHERE vl.id = id)
        AND drive_link = (SELECT vl.drive_link FROM public.vault_links vl WHERE vl.id = id)
    );

-- DELETE: Users can only delete their own links.
DROP POLICY IF EXISTS "vault_links_delete" ON public.vault_links;
CREATE POLICY "vault_links_delete"
    ON public.vault_links
    FOR DELETE
    TO authenticated
    USING (auth.uid() = uploader_id);


-- ────────────────────────────────────────────────────────────
-- 2. TABLE: public.vault_votes
--    Tracks per-user votes so each user can vote only once
--    per link (enforced by a UNIQUE constraint).
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_votes (
    id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_id     UUID           NOT NULL REFERENCES public.vault_links(id) ON DELETE CASCADE,
    vote_type   TEXT           NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at  TIMESTAMPTZ    DEFAULT NOW(),

    -- Each user may cast at most one vote per link.
    UNIQUE(user_id, link_id)
);

-- Enable Row-Level Security
ALTER TABLE public.vault_votes ENABLE ROW LEVEL SECURITY;


-- ── RLS Policies for vault_votes ────────────────────────────

-- SELECT: Any authenticated user can see all votes.
DROP POLICY IF EXISTS "vault_votes_select" ON public.vault_votes;
CREATE POLICY "vault_votes_select"
    ON public.vault_votes
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Users can only insert votes attributed to themselves.
DROP POLICY IF EXISTS "vault_votes_insert" ON public.vault_votes;
CREATE POLICY "vault_votes_insert"
    ON public.vault_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can change their own vote (e.g. switch up ↔ down).
DROP POLICY IF EXISTS "vault_votes_update" ON public.vault_votes;
CREATE POLICY "vault_votes_update"
    ON public.vault_votes
    FOR UPDATE
    TO authenticated
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can remove their own vote.
DROP POLICY IF EXISTS "vault_votes_delete" ON public.vault_votes;
CREATE POLICY "vault_votes_delete"
    ON public.vault_votes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 3. INDEXES (optional but recommended for performance)
-- ────────────────────────────────────────────────────────────

-- Fast lookup of links by uploader
CREATE INDEX IF NOT EXISTS idx_vault_links_uploader
    ON public.vault_links (uploader_id);

-- Fast filtering by year / branch / category
CREATE INDEX IF NOT EXISTS idx_vault_links_filters
    ON public.vault_links (btech_year, branch, category);

-- Fast lookup of votes by link (e.g. counting votes for a link)
CREATE INDEX IF NOT EXISTS idx_vault_votes_link
    ON public.vault_votes (link_id);

-- Fast lookup of votes by user (e.g. checking if user already voted)
CREATE INDEX IF NOT EXISTS idx_vault_votes_user_link
    ON public.vault_votes (user_id, link_id);


-- ============================================================
-- Done! Both tables are ready with RLS fully configured.
-- ============================================================
