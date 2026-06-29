// A date-only string (e.g. "2026-06-20") parses as that day's UTC midnight,
// so using it as-is for a range's upper bound makes same-day ranges
// (e.g. "Today") a zero-width window that excludes every real record
// created later that day. Push it to the last millisecond of that day instead.
export function endOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
