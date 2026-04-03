-- Migration: add bonus_amount columns
-- Run this in Supabase SQL Editor → New Query

ALTER TABLE program_schedules
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10, 3);

ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS bonus_amount_override NUMERIC(10, 3);
