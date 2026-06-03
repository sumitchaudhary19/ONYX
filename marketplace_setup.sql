-- ============================================================
-- MNIT SHOP: marketplace_items table + RLS + storage bucket
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Other',
  image_urls   TEXT[] DEFAULT '{}',
  is_sold      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_items;
CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_items FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Sellers can insert their own items" ON public.marketplace_items;
CREATE POLICY "Sellers can insert their own items"
  ON public.marketplace_items FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can update their own items" ON public.marketplace_items;
CREATE POLICY "Sellers can update their own items"
  ON public.marketplace_items FOR UPDATE
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can delete their own items" ON public.marketplace_items;
CREATE POLICY "Sellers can delete their own items"
  ON public.marketplace_items FOR DELETE
  USING (auth.uid() = seller_id);

-- Storage bucket for marketplace images (run in SQL Editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace', 'marketplace', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Anyone can view marketplace images') THEN
    CREATE POLICY "Anyone can view marketplace images" ON storage.objects FOR SELECT USING (bucket_id = 'marketplace');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Authenticated users can upload marketplace images') THEN
    CREATE POLICY "Authenticated users can upload marketplace images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'marketplace' AND auth.role() = 'authenticated');
  END IF;
END $$;
