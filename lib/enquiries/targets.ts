/** Calendar periods, independent of enquiry due dates and the host timezone. */
export function currentTargetMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function validTargetMonth(value: unknown): value is string {
  return typeof value === 'string' && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
}
export function targetWeekLabel(month: string, week: number | null): string {
  if (week === null) return 'Whole month';
  const last = validTargetMonth(month) ? new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate() : 31;
  return `${['1st', '2nd', '3rd', '4th'][week - 1]} week (${(week - 1) * 7 + 1}–${week === 4 ? validTargetMonth(month) ? last : 'month end' : week * 7})`;
}
export function targetMonthLabel(month: string): string {
  return validTargetMonth(month) ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)) : month;
}
export function targetPeriodsOverlap(a: number | null, b: number | null): boolean {
  return a === null || b === null || a === b;
}
export function targetTitle(month: string, week: number | null): string {
  return `${targetMonthLabel(month)}${week === null ? '' : ` - ${['1st', '2nd', '3rd', '4th'][week - 1]} Week`}`;
}
export type TargetInput = { business_id: string; month: string; week: number | null };
export type TargetChange =
  | { operation: 'period'; month: string; week: number | null }
  | { operation: 'add_enquiries'; country_id: string; region_id: string; enquiry_ids: string[]; note: string }
  | { operation: 'edit_note'; enquiry_id: string; note: string }
  | { operation: 'remove_enquiry'; enquiry_id: string }
  | { operation: 'add_members'; user_ids: string[] }
  | { operation: 'remove_member'; user_id: string };
