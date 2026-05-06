-- ============================================================
-- ForgeTrack — Database Schema
-- Reference: ForgeTrack Spec Sheet §3.1–3.6
-- Run this in Supabase SQL Editor (in order)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Students Table (§3.1)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  usn         TEXT UNIQUE NOT NULL,
  admission_number TEXT,
  email       TEXT,
  branch_code TEXT NOT NULL,
  batch       TEXT DEFAULT '2024-2028',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.students IS 'All enrolled students in The Forge bootcamp';

-- ────────────────────────────────────────────────────────────
-- 2. Sessions Table (§3.2)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id             SERIAL PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  topic          TEXT NOT NULL,
  month_number   INTEGER NOT NULL,
  duration_hours DECIMAL(3,1) DEFAULT 2.0,
  session_type   TEXT DEFAULT 'offline',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sessions IS 'One session per day — bootcamp class sessions';

-- ────────────────────────────────────────────────────────────
-- 3. ImportLog Table (§3.5 — must exist before attendance)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_log (
  id             SERIAL PRIMARY KEY,
  filename       TEXT NOT NULL,
  uploaded_by    TEXT NOT NULL,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
  total_rows     INTEGER NOT NULL DEFAULT 0,
  imported_rows  INTEGER NOT NULL DEFAULT 0,
  skipped_rows   INTEGER NOT NULL DEFAULT 0,
  warnings       TEXT,           -- JSON array of warning messages
  column_mapping TEXT,           -- JSON of AI agent's column mapping
  status         TEXT NOT NULL DEFAULT 'pending'  -- completed / partial / failed / pending / in_progress
);

COMMENT ON TABLE public.import_log IS 'Audit trail for every CSV import operation';

-- ────────────────────────────────────────────────────────────
-- 4. Attendance Table (§3.3)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id  INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  present     BOOLEAN NOT NULL,
  marked_at   TIMESTAMPTZ DEFAULT NOW(),
  marked_by   TEXT DEFAULT 'system',
  import_id   INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
  
  -- Prevent duplicate attendance records for the same student-session pair
  UNIQUE(student_id, session_id)
);

COMMENT ON TABLE public.attendance IS 'Junction table: student × session attendance records';

-- ────────────────────────────────────────────────────────────
-- 5. Materials Table (§3.4)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materials (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,       -- slides / recording / document / link
  url         TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.materials IS 'Class materials linked to sessions — slides, recordings, docs, links';

-- ────────────────────────────────────────────────────────────
-- 6. Users Table (§3.6 — extends Supabase Auth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
  student_id   INTEGER REFERENCES public.students(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'App-level user profiles linked to Supabase Auth — determines role-based access';


-- ============================================================
-- CONSTRAINTS & TRIGGERS
-- ============================================================

-- ── Prevent attendance for future dates ──
CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
  session_date DATE;
BEGIN
  SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
  
  IF session_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot mark attendance for a future date: %', session_date;
  END IF;
  
  IF session_date < '2025-08-04'::DATE THEN
    RAISE EXCEPTION 'Cannot mark attendance before program start date (2025-08-04): %', session_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_attendance_date ON public.attendance;
CREATE TRIGGER trg_check_attendance_date
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION check_attendance_date();


-- ============================================================
-- ROW LEVEL SECURITY (§3.7)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;

-- ── Students Table Policies ──
CREATE POLICY "mentors_full_access_students" ON public.students
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );

CREATE POLICY "students_read_own" ON public.students
  FOR SELECT
  USING (
    id = (SELECT student_id FROM public.users WHERE id = auth.uid())
  );

-- ── Sessions Table Policies ──
CREATE POLICY "mentors_full_access_sessions" ON public.sessions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );

CREATE POLICY "students_read_sessions" ON public.sessions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student')
  );

-- ── Attendance Table Policies ──
CREATE POLICY "mentors_full_access_attendance" ON public.attendance
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );

CREATE POLICY "students_read_own_attendance" ON public.attendance
  FOR SELECT
  USING (
    student_id = (SELECT student_id FROM public.users WHERE id = auth.uid())
  );

-- ── Materials Table Policies ──
CREATE POLICY "mentors_full_access_materials" ON public.materials
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );

CREATE POLICY "students_read_materials" ON public.materials
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student')
  );

-- ── ImportLog Table Policies ──
CREATE POLICY "mentors_access_import_log" ON public.import_log
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );
-- Students have NO access to import_log (no policy = no access when RLS is on)

-- ── Users Table Policies ──
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "mentors_read_all_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'mentor')
  );


-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_import_id  ON public.attendance(import_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date         ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_materials_session_id  ON public.materials(session_id);
CREATE INDEX IF NOT EXISTS idx_users_role            ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id      ON public.users(student_id);
