-- ============================================================
-- FIX: Infinite recursion in RLS policies
-- 
-- Problem: policies on other tables check public.users for role,
-- and public.users itself has policies that check public.users → infinite loop.
--
-- Solution: Use auth.jwt() to read role from JWT metadata instead of
-- querying public.users. For the users table itself, use a simple
-- auth.uid() check that doesn't recurse.
-- ============================================================

-- ── Step 1: Drop ALL existing policies ──
DROP POLICY IF EXISTS "mentors_full_access_students" ON public.students;
DROP POLICY IF EXISTS "students_read_own" ON public.students;
DROP POLICY IF EXISTS "mentors_full_access_sessions" ON public.sessions;
DROP POLICY IF EXISTS "students_read_sessions" ON public.sessions;
DROP POLICY IF EXISTS "mentors_full_access_attendance" ON public.attendance;
DROP POLICY IF EXISTS "students_read_own_attendance" ON public.attendance;
DROP POLICY IF EXISTS "mentors_full_access_materials" ON public.materials;
DROP POLICY IF EXISTS "students_read_materials" ON public.materials;
DROP POLICY IF EXISTS "mentors_access_import_log" ON public.import_log;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "mentors_read_all_users" ON public.users;

-- ── Step 2: Create a helper function that checks role WITHOUT hitting RLS ──
-- This function runs as SECURITY DEFINER (bypasses RLS) to avoid recursion.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_student_id()
RETURNS INTEGER AS $$
  SELECT student_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── Step 3: Recreate policies using the helper functions ──

-- Users table — simple, no recursion possible
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_mentor_read_all" ON public.users
  FOR SELECT USING (public.get_user_role() = 'mentor');

-- Students table
CREATE POLICY "students_mentor_all" ON public.students
  FOR ALL
  USING (public.get_user_role() = 'mentor')
  WITH CHECK (public.get_user_role() = 'mentor');

CREATE POLICY "students_read_own" ON public.students
  FOR SELECT
  USING (id = public.get_user_student_id());

-- Sessions table
CREATE POLICY "sessions_mentor_all" ON public.sessions
  FOR ALL
  USING (public.get_user_role() = 'mentor')
  WITH CHECK (public.get_user_role() = 'mentor');

CREATE POLICY "sessions_student_read" ON public.sessions
  FOR SELECT
  USING (public.get_user_role() = 'student');

-- Attendance table
CREATE POLICY "attendance_mentor_all" ON public.attendance
  FOR ALL
  USING (public.get_user_role() = 'mentor')
  WITH CHECK (public.get_user_role() = 'mentor');

CREATE POLICY "attendance_student_read_own" ON public.attendance
  FOR SELECT
  USING (student_id = public.get_user_student_id());

-- Materials table
CREATE POLICY "materials_mentor_all" ON public.materials
  FOR ALL
  USING (public.get_user_role() = 'mentor')
  WITH CHECK (public.get_user_role() = 'mentor');

CREATE POLICY "materials_student_read" ON public.materials
  FOR SELECT
  USING (public.get_user_role() = 'student');

-- Import Log table (mentors only, students have NO access)
CREATE POLICY "import_log_mentor_all" ON public.import_log
  FOR ALL
  USING (public.get_user_role() = 'mentor')
  WITH CHECK (public.get_user_role() = 'mentor');
