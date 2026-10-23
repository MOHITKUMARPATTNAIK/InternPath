import { ApplicationStatus } from '@/types';

// Standard Indian Standard Time Offset in minutes (+05:30 = 330 mins)
const IST_OFFSET_MINUTES = 330;

/**
 * Get current timestamp normalized to Asia/Kolkata timezone
 */
export function getNowIST(referenceDate?: Date): Date {
  const base = referenceDate ? new Date(referenceDate) : new Date();
  // Get UTC time in ms
  const utc = base.getTime() + base.getTimezoneOffset() * 60000;
  // Apply IST offset
  return new Date(utc + IST_OFFSET_MINUTES * 60000);
}

/**
 * Format a Date or ISO string into readable Indian Standard Time string
 */
export function formatIndianDate(dateStr?: string | null, includeYear = true): string {
  if (!dateStr) return 'Not specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: includeYear ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Compute days remaining until deadline based on IST
 */
export function getDaysRemaining(
  deadline?: string | null,
  referenceDate?: Date
): number | null {
  if (!deadline) return null;
  try {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return null;

    // Set deadline end of day in IST (23:59:59)
    const deadlineMs = deadlineDate.getTime();
    const nowMs = referenceDate ? referenceDate.getTime() : new Date().getTime();

    const diffDays = Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

/**
 * Determine exact application status considering Asia/Kolkata timezone
 */
export function computeApplicationStatus(
  openingDate?: string | null,
  deadline?: string | null,
  lastVerifiedAt?: string | null,
  referenceDate?: Date
): ApplicationStatus {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const nowMs = now.getTime();

  // If no deadline and no opening date, or if last verified is older than 180 days, mark unconfirmed
  if (!deadline && !openingDate) {
    return 'status_unconfirmed';
  }

  if (deadline) {
    const deadlineDate = new Date(deadline);
    // If deadline passed (end of day)
    const deadlineEndOfDay = new Date(deadlineDate);
    deadlineEndOfDay.setHours(23, 59, 59, 999);

    if (nowMs > deadlineEndOfDay.getTime()) {
      return 'closed';
    }

    const daysRemaining = (deadlineEndOfDay.getTime() - nowMs) / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 14) {
      return 'closing_soon';
    }
  }

  if (openingDate) {
    const openDate = new Date(openingDate);
    openDate.setHours(0, 0, 0, 0);
    if (nowMs < openDate.getTime()) {
      return 'upcoming';
    }
  }

  return 'open';
}

/**
 * Check if application deadline has passed in Indian Standard Time
 */
export function isDeadlineExpired(deadline?: string | null, referenceDate?: Date): boolean {
  const days = getDaysRemaining(deadline, referenceDate);
  return days !== null && days < 0;
}

/**
 * Check if application deadline is closing within the specified days (default 14) in IST
 */
export function isDeadlineClosingSoon(
  deadline?: string | null,
  daysThreshold = 14,
  referenceDate?: Date
): boolean {
  const days = getDaysRemaining(deadline, referenceDate);
  return days !== null && days >= 0 && days <= daysThreshold;
}

/**
 * Helper to compute application status directly from an internship object or date strings
 */
export function getComputedApplicationStatus(
  itemOrOpening?:
    | {
        application_opening_date?: string | null;
        application_deadline?: string | null;
        last_verified_at?: string | null;
      }
    | string
    | null,
  deadlineOrRef?: string | Date | null,
  lastVerifiedOrRef?: string | Date | null,
  referenceDate?: Date
): ApplicationStatus {
  if (typeof itemOrOpening === 'object' && itemOrOpening !== null && !(itemOrOpening instanceof Date)) {
    const ref = deadlineOrRef instanceof Date ? deadlineOrRef : undefined;
    return computeApplicationStatus(
      itemOrOpening.application_opening_date,
      itemOrOpening.application_deadline,
      itemOrOpening.last_verified_at,
      ref
    );
  }

  const openingDate = typeof itemOrOpening === 'string' ? itemOrOpening : null;
  const deadlineDate = typeof deadlineOrRef === 'string' ? deadlineOrRef : null;
  const lastVerified = typeof lastVerifiedOrRef === 'string' ? lastVerifiedOrRef : null;
  const ref =
    deadlineOrRef instanceof Date
      ? deadlineOrRef
      : lastVerifiedOrRef instanceof Date
      ? lastVerifiedOrRef
      : referenceDate;

  return computeApplicationStatus(openingDate, deadlineDate, lastVerified, ref);
}

/**
 * Format date in Indian Standard Time (Asia/Kolkata)
 */
export const formatKolkataDate = formatIndianDate;

/**
 * Human-readable countdown string in IST
 */
export function formatKolkataCountdown(deadline?: string | null, referenceDate?: Date): string {
  const days = getDaysRemaining(deadline, referenceDate);
  if (days === null) return 'Rolling admissions';
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Closes today';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

