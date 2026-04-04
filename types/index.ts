export type Category = 'bulletin' | 'short_briefing' | 'program';
export type BroadcastMode = 'live' | 'recording';
export type RecurrenceType = 'one_time' | 'daily' | 'weekdays';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'left_early' | 'on_leave' | 'excused';

export type TechnicianStatus = 'active' | 'on_leave' | 'left';

export interface Technician {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  notes: string | null;
  status: TechnicianStatus;
  default_days: number[];
  work_start_time: string | null;
  work_end_time: string | null;
  created_at: string;
}

export interface ProgramSchedule {
  id: string;
  name: string;
  category: Category;
  broadcast_mode: BroadcastMode;
  recurrence_type: RecurrenceType;
  weekdays: number[];
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_until: string | null;
  parent_schedule_id: string | null;
  bonus_amount: number | null;
  created_at: string;
}

export interface ScheduleCrew {
  id: string;
  schedule_id: string;
  technician_id: string;
  technician?: Technician;
}

export interface EventInstance {
  id: string;
  schedule_id: string;
  date: string;
  name_override: string | null;
  start_time_override: string | null;
  end_time_override: string | null;
  category_override: Category | null;
  broadcast_mode_override: BroadcastMode | null;
  bonus_amount_override: number | null;
  is_overridden: boolean;
  is_cancelled: boolean;
  created_at: string;
}

export interface EventCrew {
  id: string;
  event_id: string;
  technician_id: string;
  technician?: Technician;
}

export interface MyAttendance {
  id: string;
  event_id: string;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
}

export interface TechnicianAttendance {
  id: string;
  event_id: string;
  technician_id: string;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  technician?: Technician;
}

export interface PricingSetting {
  id: string;
  category: Category;
  broadcast_mode: BroadcastMode | null;
  rate: number;
  updated_at: string;
}

// Rich event display type (schedule values merged with overrides)
export interface EventDisplay {
  id: string;
  schedule_id: string;
  date: string;
  name: string;
  category: Category;
  broadcast_mode: BroadcastMode;
  start_time: string;
  end_time: string;
  is_overridden: boolean;
  is_cancelled: boolean;
  crew_count: number;
  my_attendance_status: AttendanceStatus | null;
  bonus_amount: number | null;
}

// For schedule form
export interface ScheduleFormData {
  name: string;
  category: Category;
  broadcast_mode: BroadcastMode;
  recurrence_type: RecurrenceType;
  weekdays: number[];
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_until: string;
  crew_ids: string[];
  bonus_amount: number | null;
}

// Technician stats
export interface TechnicianStats {
  technician: Technician;
  total: number;
  present: number;
  absent: number;
  late: number;
  left_early: number;
  on_leave: number;
  excused: number;
  bulletin: number;
  short_briefing: number;
  program: number;
  live: number;
  recording: number;
}

// My personal stats
export interface MyStats {
  expected_amount: number;
  total: number;
  bulletin: number;
  short_briefing: number;
  program: number;
  live: number;
  recording: number;
  present: number;
  absent: number;
  late: number;
  left_early: number;
  on_leave: number;
  excused: number;
}
