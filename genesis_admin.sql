-- 1. Add genesis_passcode column to clubs
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS genesis_passcode varchar(255);

-- 2. Seed passcodes for specific clubs
UPDATE clubs SET genesis_passcode = 'BLITZ-ONX-9Z4Q' WHERE name = 'Blitzschlag';
UPDATE clubs SET genesis_passcode = 'SPHX-ONX-5V1D' WHERE name = 'Sphinx';
UPDATE clubs SET genesis_passcode = 'ROBO-ONX-7C8P' WHERE name = 'Robotics Club';
UPDATE clubs SET genesis_passcode = 'MAV-ONX-79X2' WHERE name = 'The Mavericks MNIT';
UPDATE clubs SET genesis_passcode = 'SNAP-ONX-8N2T' WHERE name = 'Photography Club';
UPDATE clubs SET genesis_passcode = 'FILM-ONX-9P1W' WHERE name = 'Film Making Club';
UPDATE clubs SET genesis_passcode = 'ART-ONX-8K5M' WHERE name = 'Creative Arts Club';
UPDATE clubs SET genesis_passcode = 'ACT-ONX-6F2X' WHERE name = 'Drama Club';
UPDATE clubs SET genesis_passcode = 'TUNE-ONX-4M9Y' WHERE name = 'Music Club';
UPDATE clubs SET genesis_passcode = 'RAAG-ONX-2Y7L' WHERE name = 'Classical Music';
UPDATE clubs SET genesis_passcode = 'DEB-ONX-4T9B' WHERE name = 'Debating Club';
UPDATE clubs SET genesis_passcode = 'QUIZ-ONX-K84P' WHERE name = 'Quiz Club MNIT';
UPDATE clubs SET genesis_passcode = 'POET-ONX-1C4F' WHERE name = 'Poetry Club';
UPDATE clubs SET genesis_passcode = 'EPC-ONX-5H8N' WHERE name = 'English Press Club';
UPDATE clubs SET genesis_passcode = 'HPC-ONX-2D6K' WHERE name = 'Hindi Press Club';
UPDATE clubs SET genesis_passcode = 'ELAC-ONX-3J7C' WHERE name = 'English Language Activities Club';
UPDATE clubs SET genesis_passcode = 'HLAC-ONX-7L3R' WHERE name = 'Hindi Language Activities Club';
UPDATE clubs SET genesis_passcode = 'THINK-ONX-5W8B' WHERE name = 'Think India';
UPDATE clubs SET genesis_passcode = 'NSS-ONX-3W6H' WHERE name = 'NSS';
UPDATE clubs SET genesis_passcode = 'ELC-ONX-9V2M' WHERE name = 'Electoral Literacy';
UPDATE clubs SET genesis_passcode = 'THC-ONX-3R7J' WHERE name = 'Travel and Heritage Visit Club';

-- 3. Create RPC for secure verification
CREATE OR REPLACE FUNCTION verify_genesis_admin(p_club_id UUID, p_passcode TEXT, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  v_db_passcode TEXT;
BEGIN
  -- Fetch the actual passcode for the club
  SELECT genesis_passcode INTO v_db_passcode
  FROM clubs
  WHERE id = p_club_id;

  -- Verify match
  IF v_db_passcode IS NOT NULL AND v_db_passcode = p_passcode THEN
    -- Match found!
    
    -- 1. Clear passcode so it can't be reused, and set admin_id
    UPDATE clubs SET genesis_passcode = NULL, admin_id = p_user_id WHERE id = p_club_id;
    
    -- 2. Ensure they are a member (upsert)
    INSERT INTO club_members (club_id, user_id, status)
    VALUES (p_club_id, p_user_id, 'approved')
    ON CONFLICT (club_id, user_id) 
    DO UPDATE SET status = 'approved';
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
