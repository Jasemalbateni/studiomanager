/**
 * Arabic date/text formatting utilities
 */

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const AR_DAYS_FULL = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
];

/** "الأحد، 3 أبريل" */
export function arDate(date: Date): string {
  return `${AR_DAYS_FULL[date.getDay()]}، ${date.getDate()} ${AR_MONTHS[date.getMonth()]}`;
}

/** "الأحد، 3 أبريل 2026" */
export function arDateLong(date: Date): string {
  return `${AR_DAYS_FULL[date.getDay()]}، ${date.getDate()} ${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "أبريل 2026" */
export function arMonthYear(date: Date): string {
  return `${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "أحد" short day name */
export function arDayShort(date: Date): string {
  const shorts = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  return shorts[date.getDay()];
}
