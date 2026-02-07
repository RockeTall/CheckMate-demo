import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a numeric grade (7-12) to Hebrew letters
 * 7 → ז׳, 8 → ח׳, 9 → ט׳, 10 → י׳, 11 → י״א, 12 → י״ב
 */
export function gradeToHebrew(grade: number | string): string {
  const gradeNum = typeof grade === 'string' ? parseInt(grade, 10) : grade;
  const hebrewGrades: Record<number, string> = {
    7: "ז׳",
    8: "ח׳",
    9: "ט׳",
    10: "י׳",
    11: "י״א",
    12: "י״ב",
  };
  return hebrewGrades[gradeNum] || String(grade);
}
