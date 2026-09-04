export interface DoseSchedule {
  id: string;
  label: string;
  timeHint?: string;
  period?: 'morning' | 'afternoon' | 'evening' | 'night' | 'general';
}

export interface MedicationDurationInfo {
  isActive: boolean;
  totalDays: number | null;
  daysElapsed: number;
  daysRemaining: number | null;
  statusText: string;
  isOngoing: boolean;
  startDateFormatted: string;
  endDateFormatted?: string;
}

/**
 * Parses duration strings like "5 Days", "1 Week", "2 Months", "Ongoing", etc.
 * Returns the total duration in days, or null for indefinite/ongoing.
 */
export function parseDurationToDays(durationStr?: string): number | null {
  if (!durationStr) return null;
  const cleaned = durationStr.toLowerCase().trim();

  if (
    cleaned.includes('ongoing') ||
    cleaned.includes('chronic') ||
    cleaned.includes('sos') ||
    cleaned.includes('needed') ||
    cleaned.includes('life') ||
    cleaned.includes('regular') ||
    cleaned.includes('continuous') ||
    cleaned.includes('long term') ||
    cleaned.includes('forever')
  ) {
    return null;
  }

  // Weeks (e.g. "1 week", "2 weeks")
  const weekMatch = cleaned.match(/(\d+)\s*week/i);
  if (weekMatch) {
    return parseInt(weekMatch[1], 10) * 7;
  }

  // Months (e.g. "1 month", "3 months")
  const monthMatch = cleaned.match(/(\d+)\s*month/i);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10) * 30;
  }

  // Years (e.g. "1 year")
  const yearMatch = cleaned.match(/(\d+)\s*year/i);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) * 365;
  }

  // Days (e.g. "5 days", "10 day")
  const dayMatch = cleaned.match(/(\d+)\s*day/i);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10);
  }

  // Bare number (assume days)
  const numMatch = cleaned.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Calculates duration metrics and checks if medication is still active.
 */
export function getMedicationDurationInfo(
  createdAt?: string | Date,
  durationStr?: string
): MedicationDurationInfo {
  const startDate = createdAt ? new Date(createdAt) : new Date();
  const validDate = !isNaN(startDate.getTime()) ? startDate : new Date();
  const totalDays = parseDurationToDays(durationStr);

  const startDateFormatted = validDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (totalDays === null) {
    return {
      isActive: true,
      totalDays: null,
      daysElapsed: 1,
      daysRemaining: null,
      statusText: 'Ongoing Treatment',
      isOngoing: true,
      startDateFormatted
    };
  }

  // Calculate end time by adding totalDays (end of the last day: 23:59:59.999)
  const startOfDay = new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate()).getTime();
  const endOfDay = startOfDay + (totalDays * 24 * 60 * 60 * 1000);
  const now = new Date().getTime();

  const diffMs = now - startOfDay;
  const daysElapsed = Math.max(1, Math.min(totalDays, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1));
  const msRemaining = endOfDay - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  const isActive = now <= endOfDay;

  const endDate = new Date(endOfDay);
  const endDateFormatted = endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  let statusText = '';
  if (isActive) {
    statusText = `Day ${daysElapsed} of ${totalDays} • ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;
  } else {
    statusText = `Course completed (${totalDays} days)`;
  }

  return {
    isActive,
    totalDays,
    daysElapsed,
    daysRemaining,
    statusText,
    isOngoing: false,
    startDateFormatted,
    endDateFormatted
  };
}

/**
 * Breaks down medication frequency into individual daily dose sub-buttons.
 */
export function getDosesForFrequency(frequencyStr?: string): DoseSchedule[] {
  if (!frequencyStr) {
    return [{ id: 'dose_1', label: 'Take Dose', period: 'general' }];
  }

  const freq = frequencyStr.toLowerCase().trim();

  // Pattern 1: Explicit 1-0-1, 1-1-1, 1-0-0, 0-1-0, 0-0-1, 1-1-1-1
  if (/^\d-\d-\d(-\d)?$/.test(freq)) {
    const parts = freq.split('-').map(Number);
    const doses: DoseSchedule[] = [];
    if (parts[0] > 0) doses.push({ id: 'morning', label: `Morning (${parts[0]})`, timeHint: 'Morning', period: 'morning' });
    if (parts[1] > 0) doses.push({ id: 'afternoon', label: `Afternoon (${parts[1]})`, timeHint: 'Afternoon', period: 'afternoon' });
    if (parts[2] > 0) doses.push({ id: 'night', label: `Night (${parts[2]})`, timeHint: 'Night', period: 'night' });
    if (parts[3] !== undefined && parts[3] > 0) doses.push({ id: 'bedtime', label: `Bedtime (${parts[3]})`, timeHint: 'Bedtime', period: 'night' });
    if (doses.length > 0) return doses;
  }

  // Pattern 2: Morning & Night / Morning and Night / Morning, Night
  if (
    (freq.includes('morning') || freq.includes('breakfast')) &&
    (freq.includes('night') || freq.includes('evening') || freq.includes('dinner') || freq.includes('bedtime')) &&
    !(freq.includes('afternoon') || freq.includes('noon') || freq.includes('lunch'))
  ) {
    return [
      { id: 'morning', label: 'Morning Dose', timeHint: 'Morning', period: 'morning' },
      { id: 'night', label: 'Night Dose', timeHint: 'Night', period: 'night' }
    ];
  }

  // Pattern 3: Morning, Afternoon & Night / 3 times with named periods
  if (
    (freq.includes('morning') || freq.includes('breakfast')) &&
    (freq.includes('afternoon') || freq.includes('noon') || freq.includes('lunch')) &&
    (freq.includes('night') || freq.includes('evening') || freq.includes('dinner'))
  ) {
    return [
      { id: 'morning', label: 'Morning', timeHint: 'Breakfast', period: 'morning' },
      { id: 'afternoon', label: 'Afternoon', timeHint: 'Lunch', period: 'afternoon' },
      { id: 'night', label: 'Night', timeHint: 'Dinner', period: 'night' }
    ];
  }

  // Pattern 4: 4 times daily / QID / Every 6 hours
  if (freq.includes('4 time') || freq.includes('4x') || freq.includes('qid') || freq.includes('four time') || freq.includes('every 6 hour')) {
    return [
      { id: 'dose_1', label: 'Dose 1 (Morning)', timeHint: '06:00 AM', period: 'morning' },
      { id: 'dose_2', label: 'Dose 2 (Noon)', timeHint: '12:00 PM', period: 'afternoon' },
      { id: 'dose_3', label: 'Dose 3 (Evening)', timeHint: '06:00 PM', period: 'evening' },
      { id: 'dose_4', label: 'Dose 4 (Night)', timeHint: '10:00 PM', period: 'night' }
    ];
  }

  // Pattern 5: 3 times daily / TDS / TID / Thrice
  if (freq.includes('3 time') || freq.includes('3x') || freq.includes('thrice') || freq.includes('tid') || freq.includes('tds') || freq.includes('three time') || freq.includes('every 8 hour')) {
    return [
      { id: 'dose_1', label: 'Dose 1 (Morning)', timeHint: 'Morning', period: 'morning' },
      { id: 'dose_2', label: 'Dose 2 (Afternoon)', timeHint: 'Afternoon', period: 'afternoon' },
      { id: 'dose_3', label: 'Dose 3 (Night)', timeHint: 'Night', period: 'night' }
    ];
  }

  // Pattern 6: Twice a day / 2 times daily / BID / BD
  if (freq.includes('2 time') || freq.includes('2x') || freq.includes('twice') || freq.includes('bid') || freq.includes('bd') || freq.includes('two time') || freq.includes('every 12 hour')) {
    return [
      { id: 'dose_1', label: 'Dose 1 (Morning)', timeHint: 'Morning', period: 'morning' },
      { id: 'dose_2', label: 'Dose 2 (Night)', timeHint: 'Night', period: 'night' }
    ];
  }

  // Pattern 7: Single specific timing
  if (freq.includes('morning') || freq.includes('breakfast')) {
    return [{ id: 'morning', label: 'Morning Dose', timeHint: 'Morning', period: 'morning' }];
  }
  if (freq.includes('afternoon') || freq.includes('lunch') || freq.includes('noon')) {
    return [{ id: 'afternoon', label: 'Afternoon Dose', timeHint: 'Afternoon', period: 'afternoon' }];
  }
  if (freq.includes('evening')) {
    return [{ id: 'evening', label: 'Evening Dose', timeHint: 'Evening', period: 'evening' }];
  }
  if (freq.includes('night') || freq.includes('bedtime') || freq.includes('sleep') || freq.includes('dinner')) {
    return [{ id: 'night', label: 'Night Dose', timeHint: 'Night', period: 'night' }];
  }

  // Pattern 8: Once daily / OD
  if (freq.includes('once') || freq.includes('1 time') || freq.includes('1x') || freq.includes('od') || freq.includes('daily')) {
    return [{ id: 'dose_1', label: 'Daily Dose', timeHint: 'Once Daily', period: 'general' }];
  }

  // Fallback default
  return [{ id: 'dose_1', label: 'Confirm Dose', period: 'general' }];
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a unique stable identifier for a medication
 */
export function getMedicationKey(med: { name: string; frequency?: string; prescriptionId?: string }): string {
  const name = (med.name || '').trim().toLowerCase();
  const freq = (med.frequency || '').trim().toLowerCase();
  return `${name}_${freq}`;
}
