-- ============================================================
-- ForgeTrack — Seed Data
-- Reference: SKILL_build_forgetrack.md §3 (Phase 1)
--
-- Run this AFTER schema.sql in Supabase SQL Editor.
-- Also run AFTER creating the mentor/student auth accounts.
--
-- Order: students → sessions → attendance → materials → import_log
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. STUDENTS (25 students — realistic Indian names, USNs)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.students (name, usn, admission_number, email, branch_code, batch, is_active) VALUES
  ('Abhishek Sharma',    '4SH24CS001', '24CS001', 'abhishek.sharma@forge.local',    'CS', '2024-2028', true),
  ('Divya Kulkarni',     '4SH24CS002', '24CS002', 'divya.kulkarni@forge.local',     'AI', '2024-2028', true),
  ('Ravi Kumar',         '4SH24CS003', '24CS003', 'ravi.kumar@forge.local',         'CS', '2024-2028', true),
  ('Priya Hegde',        '4SH24CS004', '24CS004', 'priya.hegde@forge.local',        'IS', '2024-2028', true),
  ('Karthik Shetty',     '4SH24CS005', '24CS005', 'karthik.shetty@forge.local',     'CS', '2024-2028', true),
  ('Sneha Reddy',        '4SH24CS006', '24CS006', 'sneha.reddy@forge.local',        'AI', '2024-2028', true),
  ('Rahul Gowda',        '4SH24CS007', '24CS007', 'rahul.gowda@forge.local',        'CS', '2024-2028', true),
  ('Meghana Patil',      '4SH24CS008', '24CS008', 'meghana.patil@forge.local',      'IS', '2024-2028', true),
  ('Aditya Rao',         '4SH24CS009', '24CS009', 'aditya.rao@forge.local',         'CS', '2024-2028', true),
  ('Ananya Nair',        '4SH24CS010', '24CS010', 'ananya.nair@forge.local',        'AI', '2024-2028', true),
  ('Vishal Jain',        '4SH24CS011', '24CS011', 'vishal.jain@forge.local',        'CS', '2024-2028', true),
  ('Lakshmi Devi',       '4SH24CS012', '24CS012', 'lakshmi.devi@forge.local',       'IS', '2024-2028', true),
  ('Nikhil Bhat',        '4SH24CS013', '24CS013', 'nikhil.bhat@forge.local',        'CS', '2024-2028', true),
  ('Kavya Murthy',       '4SH24CS014', '24CS014', 'kavya.murthy@forge.local',       'AI', '2024-2028', true),
  ('Suhas Kamath',       '4SH24CS015', '24CS015', 'suhas.kamath@forge.local',       'CS', '2024-2028', true),
  ('Tanvi Acharya',      '4SH24CS016', '24CS016', 'tanvi.acharya@forge.local',      'IS', '2024-2028', true),
  ('Rohit Desai',        '4SH24CS017', '24CS017', 'rohit.desai@forge.local',        'CS', '2024-2028', true),
  ('Ishita Prasad',      '4SH24CS018', '24CS018', 'ishita.prasad@forge.local',      'AI', '2024-2028', true),
  ('Manoj Hegde',        '4SH24CS019', '24CS019', 'manoj.hegde@forge.local',        'CS', '2024-2028', true),
  ('Pooja Srinivas',     '4SH24CS020', '24CS020', 'pooja.srinivas@forge.local',     'IS', '2024-2028', true),
  ('Sanjay Naik',        '4SH24CS021', '24CS021', 'sanjay.naik@forge.local',        'CS', '2024-2028', true),
  ('Deepa Bhandari',     '4SH24CS022', '24CS022', 'deepa.bhandari@forge.local',     'AI', '2024-2028', true),
  ('Varun Patel',        '4SH24CS023', '24CS023', 'varun.patel@forge.local',        'CS', '2024-2028', true),
  ('Shruti Iyer',        '4SH24CS024', '24CS024', 'shruti.iyer@forge.local',        'IS', '2024-2028', true),
  ('Akash Kulkarni',     '4SH24CS025', '24CS025', 'akash.kulkarni@forge.local',     'CS', '2024-2028', true)
ON CONFLICT (usn) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 2. SESSIONS (15 sessions across Month 4, 5, 6)
--    Real topics from The Forge bootcamp curriculum
-- ────────────────────────────────────────────────────────────
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type) VALUES
  -- Month 4 (November 2025)
  ('2025-11-05', '8-Layer AI Application Stack',         4, 2.0, 'offline'),
  ('2025-11-06', 'Prompt Engineering Deep Dive',         4, 2.0, 'offline'),
  ('2025-11-12', 'LangChain Fundamentals',               4, 2.5, 'offline'),
  ('2025-11-13', 'RAG Architecture with pgvector',       4, 2.0, 'offline'),
  ('2025-11-19', 'Vector Embeddings & Similarity Search', 4, 2.0, 'online'),
  
  -- Month 5 (December 2025)
  ('2025-12-03', 'ReAct Agent Pattern',                  5, 2.0, 'offline'),
  ('2025-12-04', 'Tool-Use & Function Calling',          5, 2.5, 'offline'),
  ('2025-12-10', 'Multi-Agent Orchestration',            5, 2.0, 'offline'),
  ('2025-12-11', 'Tiered Autonomy Multi-Agent Systems',  5, 2.0, 'offline'),
  ('2025-12-17', 'Agent Memory & State Management',      5, 2.0, 'online'),
  
  -- Month 6 (January 2026)
  ('2026-01-07', 'Production RAG Pipeline',              6, 2.5, 'offline'),
  ('2026-01-08', 'Evaluation & Testing for LLM Apps',    6, 2.0, 'offline'),
  ('2026-01-14', 'Deployment: Docker + Supabase Edge',   6, 2.0, 'offline'),
  ('2026-01-15', 'Monitoring & Observability',           6, 2.0, 'offline'),
  ('2026-01-21', 'Capstone Project Kickoff',             6, 3.0, 'offline')
ON CONFLICT (date) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 3. ATTENDANCE (every student × session combination)
--    Realistic distribution: ~70-90% attendance
--    Students 1-20: good attendance (80-95%)
--    Students 21-23: moderate (65-75%)
--    Students 24-25: low (50-60%)
--
--    Uses a deterministic pattern based on student_id + session_id
-- ────────────────────────────────────────────────────────────

-- Helper: generate attendance for all students × all sessions
-- Pattern: present = true unless (student_id * 7 + session_id * 13) % divisor < threshold
DO $$
DECLARE
  s_id INTEGER;
  sess_id INTEGER;
  is_present BOOLEAN;
  divisor INTEGER;
  threshold INTEGER;
BEGIN
  FOR s_id IN 1..25 LOOP
    -- Set absence rate by student tier
    IF s_id <= 20 THEN
      divisor := 20;
      threshold := CASE 
        WHEN s_id <= 5 THEN 1    -- ~5% absent (top students)
        WHEN s_id <= 10 THEN 2   -- ~10% absent
        WHEN s_id <= 15 THEN 3   -- ~15% absent
        ELSE 4                    -- ~20% absent
      END;
    ELSIF s_id <= 23 THEN
      divisor := 10;
      threshold := 3;  -- ~30% absent
    ELSE
      divisor := 10;
      threshold := 4;  -- ~40% absent
    END IF;

    FOR sess_id IN 1..15 LOOP
      is_present := ((s_id * 7 + sess_id * 13) % divisor) >= threshold;
      
      INSERT INTO public.attendance (student_id, session_id, present, marked_by, marked_at)
      VALUES (
        s_id,
        sess_id,
        is_present,
        'Nischay B K',
        (SELECT date FROM public.sessions WHERE id = sess_id)::TIMESTAMPTZ + INTERVAL '10 hours 30 minutes'
      )
      ON CONFLICT (student_id, session_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. MATERIALS (2 materials per session — slides + recording)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.materials (session_id, title, type, url, description) VALUES
  -- Month 4
  (1, '8-Layer AI Stack — Slides',         'slides',    'https://docs.google.com/presentation/d/1abc-8layer/edit',      'Complete slide deck covering all 8 layers'),
  (1, '8-Layer AI Stack — Recording',      'recording', 'https://youtube.com/watch?v=8layer-session',                  'Full 2-hour session recording'),
  (2, 'Prompt Engineering — Slides',       'slides',    'https://docs.google.com/presentation/d/2abc-prompt/edit',      'Prompt patterns, chain-of-thought, few-shot'),
  (2, 'Prompt Engineering — Recording',    'recording', 'https://youtube.com/watch?v=prompt-eng-session',              'Session recording with live demos'),
  (3, 'LangChain Fundamentals — Slides',   'slides',    'https://docs.google.com/presentation/d/3abc-langchain/edit',   'Chains, memory, output parsers'),
  (3, 'LangChain Fundamentals — Recording','recording', 'https://youtube.com/watch?v=langchain-fund',                  'Hands-on coding session'),
  (4, 'RAG with pgvector — Slides',        'slides',    'https://docs.google.com/presentation/d/4abc-rag/edit',         'Retrieval Augmented Generation architecture'),
  (4, 'RAG with pgvector — Recording',     'recording', 'https://youtube.com/watch?v=rag-pgvector',                    'Building a RAG pipeline live'),
  (5, 'Vector Embeddings — Slides',        'slides',    'https://docs.google.com/presentation/d/5abc-vectors/edit',     'Embeddings, cosine similarity, HNSW'),
  (5, 'Vector Embeddings — Recording',     'recording', 'https://youtube.com/watch?v=vector-embeddings',               'Online session with Q&A'),

  -- Month 5
  (6, 'ReAct Agent Pattern — Slides',       'slides',    'https://docs.google.com/presentation/d/6abc-react/edit',       'Reasoning + Acting loop pattern'),
  (6, 'ReAct Agent Pattern — Recording',    'recording', 'https://youtube.com/watch?v=react-agent',                     'Building a ReAct agent from scratch'),
  (7, 'Tool-Use & Function Calling — Slides','slides',   'https://docs.google.com/presentation/d/7abc-tools/edit',       'Gemini function calling, tool schemas'),
  (7, 'Tool-Use & Function Calling — Rec',  'recording', 'https://youtube.com/watch?v=tool-use-func',                   'Live coding session'),
  (8, 'Multi-Agent Orchestration — Slides', 'slides',    'https://docs.google.com/presentation/d/8abc-multiagent/edit',  'Supervisor, router, handoff patterns'),
  (8, 'Multi-Agent Orchestration — Rec',    'recording', 'https://youtube.com/watch?v=multi-agent',                     'Architecture walkthrough'),
  (9, 'Tiered Autonomy — Slides',          'slides',    'https://docs.google.com/presentation/d/9abc-tiered/edit',      'L0–L4 autonomy levels for agents'),
  (9, 'Tiered Autonomy — Recording',       'recording', 'https://youtube.com/watch?v=tiered-autonomy',                 'Full session with diagrams'),
  (10, 'Agent Memory — Slides',            'slides',    'https://docs.google.com/presentation/d/10abc-memory/edit',     'Short-term, long-term, episodic memory'),
  (10, 'Agent Memory — Recording',         'recording', 'https://youtube.com/watch?v=agent-memory',                    'Online session with demos'),

  -- Month 6
  (11, 'Production RAG — Slides',          'slides',    'https://docs.google.com/presentation/d/11abc-prodrag/edit',    'Chunking strategies, reranking, caching'),
  (11, 'Production RAG — Recording',       'recording', 'https://youtube.com/watch?v=prod-rag-pipeline',               'End-to-end production pipeline'),
  (12, 'LLM Evaluation — Slides',          'slides',    'https://docs.google.com/presentation/d/12abc-eval/edit',       'RAGAS, DeepEval, custom metrics'),
  (12, 'LLM Evaluation — Recording',       'recording', 'https://youtube.com/watch?v=llm-eval-testing',                'Testing framework walkthrough'),
  (13, 'Docker + Supabase Edge — Slides',  'slides',    'https://docs.google.com/presentation/d/13abc-deploy/edit',     'Containerization and edge functions'),
  (13, 'Docker + Supabase Edge — Recording','recording', 'https://youtube.com/watch?v=docker-supabase',                 'Deploy demo'),
  (14, 'Monitoring & Observability — Slides','slides',   'https://docs.google.com/presentation/d/14abc-monitor/edit',    'Langfuse, LangSmith, custom dashboards'),
  (14, 'Monitoring & Observability — Rec',  'recording', 'https://youtube.com/watch?v=monitoring-obs',                  'Setting up Langfuse'),
  (15, 'Capstone Kickoff — Slides',        'slides',    'https://docs.google.com/presentation/d/15abc-capstone/edit',   'Project requirements, team formation'),
  (15, 'Capstone Kickoff — Recording',     'recording', 'https://youtube.com/watch?v=capstone-kickoff',                'Kickoff session with Q&A')
ON CONFLICT DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 5. IMPORT LOG (2 past entries to show history)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.import_log (filename, uploaded_by, uploaded_at, total_rows, imported_rows, skipped_rows, warnings, column_mapping, status) VALUES
  (
    'month4_attendance_forge.csv',
    'Nischay B K',
    '2025-11-20 14:30:00+05:30',
    125,
    120,
    5,
    '["Row 23: Student ''Rahul K'' fuzzy-matched to ''Rahul Gowda''", "Row 45: Duplicate date skipped"]',
    '{"SL No": "IGNORE", "name": "student_name", "email": "email", "usn": "usn", "branch_code": "branch_code", "5/11/25": "date", "6/11/25": "date"}',
    'completed'
  ),
  (
    'month5_attendance_forge.csv',
    'Nischay B K',
    '2025-12-18 11:00:00+05:30',
    125,
    125,
    0,
    NULL,
    '{"SL No": "IGNORE", "name": "student_name", "usn": "usn", "3/12/25": "date", "4/12/25": "date"}',
    'completed'
  );
