export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Confirms the value is both YYYY-MM-DD formatted and a real calendar date (rejects e.g. 2024-02-30).
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Today's date in the browser's local timezone (not UTC, which can be a day off near midnight).
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
