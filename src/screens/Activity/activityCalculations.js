// Pure calculation helpers for the Activity screen — no React, no state.
import { dayBuckets, monthBuckets, weekBuckets } from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';

// Each range computes its own buckets (day/week/month granularity — a full
// year as 365 daily points would be unreadable) plus how many real days it
// spans, so the "Avg/day" figure stays accurate regardless of bucket size.
export const RANGE_OPTIONS = [
  { key: 'week', label: LABELS.activity.rangeThisWeek, icon: 'today-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 0, 'narrow') },
  { key: 'lastWeek', label: LABELS.activity.rangeLastWeek, icon: 'arrow-undo-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 7, 'narrow') },
  { key: '2weeks', label: LABELS.activity.range2Weeks, icon: 'calendar-outline', totalDays: 14, getBuckets: () => dayBuckets(14, 0, 'narrow') },
  { key: 'month', label: LABELS.activity.range1Month, icon: 'calendar-number-outline', totalDays: 30, getBuckets: () => weekBuckets(4) },
  { key: '3months', label: LABELS.activity.range3Months, icon: 'calendar-clear-outline', totalDays: 91, getBuckets: () => monthBuckets(3) },
  { key: '6months', label: LABELS.activity.range6Months, icon: 'stats-chart-outline', totalDays: 182, getBuckets: () => monthBuckets(6) },
  { key: '9months', label: LABELS.activity.range9Months, icon: 'bar-chart-outline', totalDays: 273, getBuckets: () => monthBuckets(9) },
  { key: 'year', label: LABELS.activity.range1Year, icon: 'trending-up-outline', totalDays: 365, getBuckets: () => monthBuckets(12) },
];

// Rough daily target used only to score the "Move" ring once real workouts
// exist — matches common general-activity guidance (~30 active min/day).
export const ACTIVE_MINUTES_GOAL = 30;

export function workoutSubtitle(w) {
  const parts = [];
  if (w.distanceKm) parts.push(`${w.distanceKm} km`);
  if (w.durationMin) parts.push(`${w.durationMin} min`);
  if (w.caloriesKcal) parts.push(`${w.caloriesKcal} kcal`);
  return parts.join(' · ') || '—';
}
