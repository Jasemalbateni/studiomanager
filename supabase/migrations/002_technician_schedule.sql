-- Migration: add technician schedule fields
-- Run this in Supabase SQL Editor → New Query

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'left')),
  ADD COLUMN IF NOT EXISTS default_days INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_start_time TEXT,
  ADD COLUMN IF NOT EXISTS work_end_time TEXT;
