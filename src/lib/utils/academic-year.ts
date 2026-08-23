import { DEFAULT_ACADEMIC_YEAR, DEFAULT_DEFENSE_SEASON } from "@/constants/app";

/**
 * Academic Year Utility for AURORA
 *
 * Returns the current Philippine academic year in "YYYY-YYYY+1" format (e.g. "2026-2027").
 * The PH academic year runs August–July.
 */
export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 7=Aug

  // PH academic year starts in August (month index 7)
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  if (year >= 2026) {
    return DEFAULT_ACADEMIC_YEAR;
  }
  return `${year - 1}-${year}`;
}

export function currentDefenseSeason(): string {
  return `AY ${currentAcademicYear()}`;
}
