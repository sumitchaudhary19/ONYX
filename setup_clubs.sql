-- ══════════════════════════════════════════════════════════════
-- CLUBS ECOSYSTEM — "The Nexus"
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. CLUBS table
CREATE TABLE IF NOT EXISTS clubs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  category     text NOT NULL,
  description  text,
  avatar_emoji text DEFAULT '🏛️',
  admin_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_category ON clubs(category);

-- 2. CLUB_ROLES table (must exist before club_members references it)
CREATE TABLE IF NOT EXISTS club_roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  role_name   text NOT NULL,
  badge_color text DEFAULT '#8b5cf6',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_roles_club ON club_roles(club_id);

-- 3. CLUB_MEMBERS table
CREATE TABLE IF NOT EXISTS club_members (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id   uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id   uuid REFERENCES club_roles(id) ON DELETE SET NULL,
  status    text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_status ON club_members(status);

-- 4. CLUB_EVENTS table
CREATE TABLE IF NOT EXISTS club_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  event_date  timestamptz NOT NULL,
  location    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_events_club ON club_events(club_id);
CREATE INDEX IF NOT EXISTS idx_club_events_date ON club_events(event_date);

-- 5. CLUB_ANNOUNCEMENTS table
CREATE TABLE IF NOT EXISTS club_announcements (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  author_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_announcements_club ON club_announcements(club_id);

-- 6. CLUB_MESSAGES table (Lounge chat)
CREATE TABLE IF NOT EXISTS club_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  sender_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created ON club_messages(created_at);


-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE clubs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages      ENABLE ROW LEVEL SECURITY;

-- clubs: anyone authenticated can read
CREATE POLICY "clubs_read"  ON clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "clubs_admin" ON clubs FOR ALL    TO authenticated USING (admin_id = auth.uid());

-- club_members: read all, insert own, update/delete by club admin
CREATE POLICY "members_read"   ON club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_join"   ON club_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_admin"  ON club_members FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.admin_id = auth.uid())
);
CREATE POLICY "members_delete" ON club_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.admin_id = auth.uid())
);

-- club_roles: read all, admin manages
CREATE POLICY "roles_read"  ON club_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin" ON club_roles FOR ALL    TO authenticated USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_roles.club_id AND clubs.admin_id = auth.uid())
);

-- club_events: read all, admin manages
CREATE POLICY "events_read"  ON club_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_admin" ON club_events FOR ALL    TO authenticated USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_events.club_id AND clubs.admin_id = auth.uid())
);

-- club_announcements: read all, admin manages
CREATE POLICY "announcements_read"  ON club_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_admin" ON club_announcements FOR ALL    TO authenticated USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_announcements.club_id AND clubs.admin_id = auth.uid())
);

-- club_messages: approved members read & write
CREATE POLICY "messages_read" ON club_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_members.club_id = club_messages.club_id AND club_members.user_id = auth.uid() AND club_members.status = 'approved')
  OR EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_messages.club_id AND clubs.admin_id = auth.uid())
);
CREATE POLICY "messages_send" ON club_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM club_members WHERE club_members.club_id = club_messages.club_id AND club_members.user_id = auth.uid() AND club_members.status = 'approved')
    OR EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_messages.club_id AND clubs.admin_id = auth.uid())
  )
);


-- ══════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE club_members;
ALTER PUBLICATION supabase_realtime ADD TABLE club_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE club_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE club_events;


-- ══════════════════════════════════════════════════════════════
-- SEED DATA — All 20 MNIT Clubs
-- ══════════════════════════════════════════════════════════════

INSERT INTO clubs (name, category, description, avatar_emoji) VALUES
  -- Megashows
  ('Blitzschlag',       'Megashows',             'The annual cultural extravaganza of MNIT Jaipur. A celebration of art, culture, and creativity.', '⚡'),
  ('Sphinx',            'Megashows',             'The annual techno-management fest of MNIT Jaipur. Innovation meets competition.', '🦁'),

  -- Tech & Innovation
  ('Robotics Club',     'Tech & Innovation',     'Building the future with autonomous robots, drones, and intelligent machines.', '🤖'),
  ('The Mavericks MNIT','Tech & Innovation',     'The entrepreneurship and innovation cell driving startup culture at MNIT.', '🚀'),

  -- Media & Arts
  ('Photography Club',  'Media & Arts',          'Capturing campus life through the lens. From portraits to landscapes.', '📸'),
  ('Film Making Club',  'Media & Arts',          'Crafting cinematic stories. Short films, documentaries, and campus reels.', '🎬'),
  ('Creative Arts Club','Media & Arts',          'Painting, sketching, and digital art. Where creativity knows no bounds.', '🎨'),
  ('Drama Club',        'Media & Arts',          'Theatre, street plays, and nukkad natak. The stage is our canvas.', '🎭'),

  -- Music & Sound
  ('Music Club',        'Music & Sound',         'From rock bands to acoustic nights. All genres, one passion.', '🎵'),
  ('Classical Music',   'Music & Sound',         'Preserving the beauty of Indian classical music. Ragas, taal, and rhythm.', '🎶'),

  -- Literary & Oratory
  ('Debating Club',     'Literary & Oratory',    'Sharpening minds through parliamentary and competitive debate.', '🗣️'),
  ('Quiz Club MNIT',    'Literary & Oratory',    'Testing knowledge across domains. Weekly quizzes and national competitions.', '🧠'),
  ('Poetry Club',       'Literary & Oratory',    'Verses, rhymes, and spoken word. Express yourself through poetry.', '✍️'),
  ('English Press Club','Literary & Oratory',    'Campus journalism in English. News, features, and editorials.', '📰'),
  ('Hindi Press Club',  'Literary & Oratory',    'हिंदी पत्रकारिता। कैंपस की खबरें हिंदी में।', '📝'),
  ('English Language Activities Club', 'Literary & Oratory', 'Elocution, essay writing, and creative expression in English.', '📖'),
  ('Hindi Language Activities Club',   'Literary & Oratory', 'हिंदी भाषा गतिविधियाँ। वाद-विवाद, निबंध, और कविता।', '📚'),

  -- Culture & Outreach
  ('Think India',       'Culture & Outreach',    'Policy research, governance discussions, and nation-building initiatives.', '🇮🇳'),
  ('NSS',               'Culture & Outreach',    'National Service Scheme. Community service, blood drives, and social impact.', '🤝'),
  ('Electoral Literacy','Culture & Outreach',    'Promoting voter awareness and democratic participation on campus.', '🗳️'),
  ('Travel and Heritage Visit Club', 'Culture & Outreach', 'Exploring India''s heritage sites, treks, and cultural expeditions.', '🏛️')

ON CONFLICT DO NOTHING;
