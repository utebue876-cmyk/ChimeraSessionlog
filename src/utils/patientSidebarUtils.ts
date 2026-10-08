import type { SyntheticEvent } from 'react';

// Kills a browser event.
// Prevents default behavior.
// Stops event propagation.
// @param e - The event.
export function killEvent(e: Event | SyntheticEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

export function calculateAgeString(birthDate: string): string {
  const age = calculateAge(birthDate);
  return age !== null ? `Age ${age}` : 'Age --';
}

export function calculateAge(birthDate: string): number | null {
  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - year;
  const hasHadBirthdayThisYear = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
