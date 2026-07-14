-- ============================================================
-- SKILL-FORGE — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. FORGE_LISTINGS table
CREATE TABLE IF NOT EXISTS forge_listings (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id             uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_type         text NOT NULL CHECK (listing_type IN ('looking_for_skill', 'offering_skill', 'startup_cofounder')),
  title                text NOT NULL,
  description          text,
  required_skill       text,
  compensation_type    text DEFAULT 'cash' CHECK (compensation_type IN ('cash', 'barter', 'equity')),
  barter_offer_details text,
  startup_stage        text CHECK (startup_stage IN ('idea', 'mvp', 'ready')),
  stealth_mode         boolean DEFAULT false,
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at           timestamptz DEFAULT now()
);

-- 2. FORGE_REVIEWS table
CREATE TABLE IF NOT EXISTS forge_reviews (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   uuid REFERENCES forge_listings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating       integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text  text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(listing_id, reviewer_id)
);

-- 3. Add forge columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='forge_rating_avg') THEN
    ALTER TABLE profiles ADD COLUMN forge_rating_avg real DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_gigs_completed') THEN
    ALTER TABLE profiles ADD COLUMN total_gigs_completed integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='top_hustler') THEN
    ALTER TABLE profiles ADD COLUMN top_hustler boolean DEFAULT false;
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_forge_listings_owner  ON forge_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_forge_listings_type   ON forge_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_forge_listings_status ON forge_listings(status);
CREATE INDEX IF NOT EXISTS idx_forge_reviews_listing ON forge_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_forge_reviews_reviewee ON forge_reviews(reviewee_id);

-- 5. Enable RLS
ALTER TABLE forge_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_reviews ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "forge_listings_select" ON forge_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "forge_listings_insert" ON forge_listings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "forge_listings_update" ON forge_listings FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "forge_listings_delete" ON forge_listings FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "forge_reviews_select" ON forge_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "forge_reviews_insert" ON forge_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- 7. Enable Realtime
ALTER publication supabase_realtime ADD TABLE forge_listings;

-- 8. Function to recalculate forge rating after a review
CREATE OR REPLACE FUNCTION recalc_forge_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles SET
    forge_rating_avg = COALESCE((SELECT AVG(rating)::real FROM forge_reviews WHERE reviewee_id = NEW.reviewee_id), 0),
    top_hustler = (
      COALESCE((SELECT AVG(rating)::real FROM forge_reviews WHERE reviewee_id = NEW.reviewee_id), 0) > 4.5
      AND COALESCE((SELECT total_gigs_completed FROM profiles WHERE id = NEW.reviewee_id), 0) >= 5
    )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalc_forge_rating ON forge_reviews;
CREATE TRIGGER trg_recalc_forge_rating
  AFTER INSERT ON forge_reviews
  FOR EACH ROW EXECUTE FUNCTION recalc_forge_rating();
