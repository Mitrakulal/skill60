-- ============================================================
-- ForgeTrack — Auth User Setup
-- Run this AFTER schema.sql and seed.sql
--
-- This script creates auth users and their public.users records.
-- For the mentor and test student accounts.
--
-- NOTE: In Supabase, you'll need to create auth users either:
--   1. Via the Supabase Dashboard > Auth > Users > "Add User"
--   2. Or via the Management API
--
-- After creating auth users, run the INSERT statements below
-- to create the corresponding public.users records.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: Create Auth Users via Supabase Dashboard
--
-- Create these 3 users in Supabase Dashboard > Auth > Users:
--
-- 1. Mentor:
--    Email: kulalmitra@gmail.com
--    Password: ForgeTrack2026!
--
-- 2. Co-facilitator:
--    Email: mithrakulal@gmail.com
--    Password: ForgeTrack2026!
--
-- 3. Test Student:
--    Email: 4sh24cs001@forge.local
--    Password: 4SH24CS001
--
-- After creating them, get their UUIDs from the Auth dashboard
-- and use them in the INSERT statements below.
-- ────────────────────────────────────────────────────────────

-- STEP 2: Insert public.users records for already-created auth users

INSERT INTO public.users (id, email, role, student_id, display_name) VALUES
  ('b3bdee46-759c-46d2-96b7-fe9093ece530', 'kulalmitra@gmail.com',   'mentor',  NULL, 'Mitra Kulal'),
  ('9c8234e7-b863-43eb-b8fa-255ea5a17df1', 'mithrakulal@gmail.com',  'mentor',  NULL, 'Varun Kulal'),
  ('cbaf8940-b96b-4a0a-9d88-67769d4ca6a5', '4sh24cs001@forge.local', 'student', 1,    'Abhishek Sharma')
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- ALTERNATIVE: Auto-create public.users from auth.users
-- This function can be called after users are created in Auth
-- ────────────────────────────────────────────────────────────

-- Trigger: automatically create public.users row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  s_id INTEGER;
  d_name TEXT;
BEGIN
  -- Determine role based on email domain
  IF NEW.email LIKE '%@forge.local' THEN
    -- Student account: extract USN from email (before @forge.local)
    user_role := 'student';
    
    -- Find the student by matching USN-based email
    SELECT id, name INTO s_id, d_name
    FROM public.students
    WHERE email = NEW.email
    LIMIT 1;
    
    -- If no match by email, try by USN (email prefix)
    IF s_id IS NULL THEN
      SELECT id, name INTO s_id, d_name
      FROM public.students
      WHERE UPPER(usn) = UPPER(SPLIT_PART(NEW.email, '@', 1))
      LIMIT 1;
    END IF;
    
    IF d_name IS NULL THEN
      d_name := SPLIT_PART(NEW.email, '@', 1);
    END IF;
  ELSE
    -- Mentor account
    user_role := 'mentor';
    s_id := NULL;
    d_name := COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1));
  END IF;

  INSERT INTO public.users (id, email, role, student_id, display_name)
  VALUES (NEW.id, NEW.email, user_role, s_id, d_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();