import { Category, BroadcastMode, AttendanceStatus, TechnicianStatus } from '@/types';

export const CATEGORY_LABELS: Record<Category, string> = {
  bulletin:       'نشرة إخبارية',
  short_briefing: 'موجز أخبار',
  program:        'برنامج',
};

export const BROADCAST_LABELS: Record<BroadcastMode, string> = {
  live:       'مباشر',
  recording:  'تسجيل',
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present:    'حاضر',
  absent:     'غائب',
  late:       'متأخر',
  left_early: 'غادر أثناء العمل',
  on_leave:   'إجازة',
  excused:    'معتذر',
};

/** Short labels for compact buttons */
export const ATTENDANCE_SHORT: Record<AttendanceStatus, string> = {
  present:    'حاضر',
  absent:     'غائب',
  late:       'متأخر',
  left_early: 'غادر',
  on_leave:   'إجازة',
  excused:    'معتذر',
};

/** Single/two-letter Arabic weekday abbreviations (Sun=0 … Sat=6) */
export const WEEKDAY_LABELS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
export const WEEKDAY_FULL   = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const CATEGORY_COLORS: Record<Category, string> = {
  bulletin:       'bg-blue-100 text-blue-700',
  short_briefing: 'bg-purple-100 text-purple-700',
  program:        'bg-emerald-100 text-emerald-700',
};

export const BROADCAST_COLORS: Record<BroadcastMode, string> = {
  live:       'bg-red-100 text-red-700',
  recording:  'bg-gray-100 text-gray-600',
};

/** Light background — used for chips/badges and card borders */
export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent:     'bg-red-100 text-red-700 border-red-200',
  late:       'bg-amber-100 text-amber-700 border-amber-200',
  left_early: 'bg-orange-100 text-orange-700 border-orange-200',
  on_leave:   'bg-sky-100 text-sky-700 border-sky-200',
  excused:    'bg-violet-100 text-violet-700 border-violet-200',
};

/** Solid/active — used for selected buttons so the selection is obvious */
export const ATTENDANCE_ACTIVE_COLORS: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-500 text-white border-emerald-500',
  absent:     'bg-red-500 text-white border-red-500',
  late:       'bg-amber-500 text-white border-amber-500',
  left_early: 'bg-orange-500 text-white border-orange-500',
  on_leave:   'bg-sky-500 text-white border-sky-500',
  excused:    'bg-violet-500 text-white border-violet-500',
};

// Generate 3 months of events when creating a schedule
export const GENERATE_MONTHS_AHEAD = 3;

/** App-wide currency symbol — change here to update everywhere */
export const CURRENCY = 'د.ك';

export const TECHNICIAN_STATUS_LABELS: Record<TechnicianStatus, string> = {
  active:   'نشط',
  on_leave: 'في إجازة',
  left:     'غادر العمل',
};

export const TECHNICIAN_STATUS_COLORS: Record<TechnicianStatus, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-amber-100 text-amber-700',
  left:     'bg-gray-100 text-gray-500',
};
