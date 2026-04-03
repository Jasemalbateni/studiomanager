-- ============================================================
-- Studio Manager — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TECHNICIANS
-- ============================================================
CREATE TABLE IF NOT EXISTS technicians (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  role             TEXT NOT NULL,
  phone            TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'left')),
  default_days     INTEGER[] NOT NULL DEFAULT '{}',  -- 0=Sun … 6=Sat
  work_start_time  TEXT,                             -- HH:MM (24h), optional
  work_end_time    TEXT,                             -- HH:MM (24h), optional
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PROGRAM SCHEDULES (recurring rules / templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS program_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN ('bulletin', 'short_briefing', 'program')),
  broadcast_mode      TEXT NOT NULL CHECK (broadcast_mode IN ('live', 'recording')),
  recurrence_type     TEXT NOT NULL CHECK (recurrence_type IN ('one_time', 'daily', 'weekdays')),
  weekdays            INTEGER[] NOT NULL DEFAULT '{}',
  start_time          TEXT NOT NULL,   -- HH:MM (24h)
  end_time            TEXT NOT NULL,   -- HH:MM (24h)
  valid_from          DATE NOT NULL,
  valid_until         DATE,            -- NULL = open-ended
  parent_schedule_id  UUID REFERENCES program_schedules(id) ON DELETE SET NULL,
  bonus_amount        NUMERIC(10, 3),  -- optional per-schedule bonus override
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_schedules_valid_from  ON program_schedules(valid_from);
CREATE INDEX IF NOT EXISTS idx_program_schedules_valid_until ON program_schedules(valid_until);

-- ============================================================
-- 3. SCHEDULE CREW (technicians assigned to a schedule template)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_crew (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES program_schedules(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  UNIQUE (schedule_id, technician_id)
);

-- ============================================================
-- 4. EVENT INSTANCES (persisted occurrences — generated from schedule)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_instances (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id             UUID NOT NULL REFERENCES program_schedules(id) ON DELETE CASCADE,
  date                    DATE NOT NULL,
  -- One-day override fields (NULL = use schedule value)
  name_override           TEXT,
  start_time_override     TEXT,
  end_time_override       TEXT,
  category_override       TEXT CHECK (category_override IN ('bulletin', 'short_briefing', 'program')),
  broadcast_mode_override TEXT CHECK (broadcast_mode_override IN ('live', 'recording')),
  bonus_amount_override   NUMERIC(10, 3),  -- per-event bonus override
  is_overridden           BOOLEAN NOT NULL DEFAULT FALSE,
  is_cancelled            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, date)
);

CREATE INDEX IF NOT EXISTS idx_event_instances_date        ON event_instances(date);
CREATE INDEX IF NOT EXISTS idx_event_instances_schedule_id ON event_instances(schedule_id);

-- ============================================================
-- 5. EVENT CREW (per-event crew — seeded from schedule_crew, independently editable)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_crew (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES event_instances(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  UNIQUE (event_id, technician_id)
);

CREATE INDEX IF NOT EXISTS idx_event_crew_event_id ON event_crew(event_id);

-- ============================================================
-- 6. MY ATTENDANCE (one record per event instance)
-- ============================================================
CREATE TABLE IF NOT EXISTS my_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES event_instances(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'left_early')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_my_attendance_event_id ON my_attendance(event_id);

-- ============================================================
-- 7. TECHNICIAN ATTENDANCE (per event per technician)
-- ============================================================
CREATE TABLE IF NOT EXISTS technician_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES event_instances(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'left_early')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, technician_id)
);

CREATE INDEX IF NOT EXISTS idx_tech_attendance_event_id      ON technician_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_tech_attendance_technician_id ON technician_attendance(technician_id);

-- ============================================================
-- 8. PRICING SETTINGS
-- category + broadcast_mode composite: allows per-type AND per-mode rates
-- broadcast_mode NULL means "applies to all modes" (fallback)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL CHECK (category IN ('bulletin', 'short_briefing', 'program')),
  broadcast_mode  TEXT CHECK (broadcast_mode IN ('live', 'recording')),
  rate            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, broadcast_mode)
);

-- ============================================================
-- DEFAULT PRICING ROWS (insert once)
-- ============================================================
INSERT INTO pricing_settings (category, broadcast_mode, rate)
VALUES
  ('bulletin',       NULL, 50),
  ('short_briefing', NULL, 75),
  ('program',        NULL, 150)
ON CONFLICT (category, broadcast_mode) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY — open policies (no auth required for personal app)
-- ============================================================
ALTER TABLE technicians          ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_crew        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_instances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_crew           ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings     ENABLE ROW LEVEL SECURITY;

-- Full access for anon (personal app, no auth)
CREATE POLICY "allow_all_technicians"           ON technicians           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_program_schedules"     ON program_schedules     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_schedule_crew"         ON schedule_crew         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_event_instances"       ON event_instances       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_event_crew"            ON event_crew            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_my_attendance"         ON my_attendance         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tech_attendance"       ON technician_attendance FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pricing_settings"      ON pricing_settings      FOR ALL TO anon USING (true) WITH CHECK (true);
