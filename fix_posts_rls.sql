-- ══════════════════════════════════════════════════════════════
-- FEED & RLS FIX — Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Ensure the 'posts' table has RLS enabled (it likely is, but good to be safe)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 2. Drop the existing select policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;
DROP POLICY IF EXISTS "Posts are readable by everyone." ON public.posts;
DROP POLICY IF EXISTS "posts_select" ON public.posts;

-- 3. Create the permissive read policy so the feed can fetch posts
CREATE POLICY "Enable read access for all users" 
ON public.posts 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Verify hashtags and post_hashtags tables are also readable
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.hashtags;
CREATE POLICY "Enable read access for all users" ON public.hashtags FOR SELECT TO authenticated USING (true);

ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.post_hashtags;
CREATE POLICY "Enable read access for all users" ON public.post_hashtags FOR SELECT TO authenticated USING (true);
