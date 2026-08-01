-- ══════════════════════════════════════════════════════════════
-- SMART FEED & POST MODERATION — SQL Setup
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. user_interests: tracks hashtag affinity per user
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hashtag TEXT NOT NULL,
  weight INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, hashtag)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interests" ON user_interests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interests" ON user_interests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interests" ON user_interests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interests" ON user_interests
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. post_hashtags: junction linking posts to their hashtags
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  hashtag TEXT NOT NULL,
  PRIMARY KEY (post_id, hashtag)
);

ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read post_hashtags" ON post_hashtags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Post author can insert hashtags" ON post_hashtags
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));

-- 3. post_reports: moderation reports on posts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake_info', 'abuse', 'nsfw', 'not_interested', 'other')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports" ON post_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can read own reports" ON post_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- 4. Add moderation columns to posts
-- ───────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- 5. Auto-flag trigger: flag post when >= 3 unique reports
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_post_report_threshold()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM post_reports WHERE post_id = NEW.post_id) >= 3 THEN
    UPDATE posts SET is_flagged = true WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_flag_reported_posts ON post_reports;
CREATE TRIGGER auto_flag_reported_posts
  AFTER INSERT ON post_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_post_report_threshold();

-- 6. RPC: Increment user interest weights (called on like)
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_interests(p_user_id UUID, p_hashtags TEXT[])
RETURNS void AS $$
BEGIN
  INSERT INTO user_interests (user_id, hashtag, weight)
  SELECT p_user_id, unnest(p_hashtags), 1
  ON CONFLICT (user_id, hashtag)
  DO UPDATE SET weight = user_interests.weight + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Decrement user interest weights (called on "Not Interested")
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_interests(p_user_id UUID, p_hashtags TEXT[])
RETURNS void AS $$
BEGIN
  UPDATE user_interests
  SET weight = GREATEST(weight - 2, 0), updated_at = now()
  WHERE user_id = p_user_id AND hashtag = ANY(p_hashtags);
  -- Clean up zero-weight entries
  DELETE FROM user_interests WHERE user_id = p_user_id AND weight <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
