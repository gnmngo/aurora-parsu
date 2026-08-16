/**
 * Academic Year Utility for AURORA
 *
 * Returns the current Philippine academic year in "YYYY-YYYY+1" format.
 * The PH academic year runs August–July, so:
 *   - August 2025 → July 2026  = "2025-2026"
 *   - January 2026 → July 2026 = "2025-2026"
 *   - August 2026 → July 2027  = "2026-2027"
 *
 * Never hardcode academic year strings — always use this function.
 */
export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 7=Aug

  // PH academic year starts in August (month index 7)
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
