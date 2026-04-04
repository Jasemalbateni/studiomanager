-- Migration: expand attendance status values to include on_leave and excused
-- Run this in Supabase SQL Editor → New Query

ALTER TABLE my_attendance
  DROP CONSTRAINT IF EXISTS my_attendance_status_check;
ALTER TABLE my_attendance
  ADD CONSTRAINT my_attendance_status_check
    CHECK (status IN ('present', 'absent', 'late', 'left_early', 'on_leave', 'excused'));

ALTER TABLE technician_attendance
  DROP CONSTRAINT IF EXISTS technician_attendance_status_check;
ALTER TABLE technician_attendance
  ADD CONSTRAINT technician_attendance_status_check
    CHECK (status IN ('present', 'absent', 'late', 'left_early', 'on_leave', 'excused'));
