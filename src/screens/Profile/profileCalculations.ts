// Pure calculation helpers and static data for the Profile screen — no
// React, no state, independently testable.
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { LABELS } from '../../constants/labels';
import { GENDER_OPTIONS } from '../../constants/genderOptions';

export const genderLabel = (value) => GENDER_OPTIONS.find((g) => g.value === value)?.label;
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// The database runs in WAL mode (storage.js: PRAGMA journal_mode = WAL), so
// SQLite writes accumulate in a separate rhythm.db-wal file and only get
// merged back into rhythm.db itself at a checkpoint. Measuring just rhythm.db
// undercounts real usage, often down to ~0 — the bulk of actual data lives in
// -wal (and -shm) until that happens.
export function getDbSizeMb() {
  try {
    const names = ['rhythm.db', 'rhythm.db-wal', 'rhythm.db-shm'];
    const totalBytes = names.reduce((sum, name) => {
      const file = new File(Paths.document, 'SQLite', name);
      return sum + (file.exists ? file.size : 0);
    }, 0);
    return totalBytes / (1024 * 1024);
  } catch {
    return null;
  }
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function computeBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

export const bmiCategories = (colors) => [
  { label: LABELS.profile.bmiUnderweight, range: LABELS.profile.bmiUnderweightRange, min: -Infinity, max: 18.5, color: colors.water },
  { label: LABELS.profile.bmiNormal, range: LABELS.profile.bmiNormalRange, min: 18.5, max: 25, color: colors.primary },
  { label: LABELS.profile.bmiOverweight, range: LABELS.profile.bmiOverweightRange, min: 25, max: 30, color: colors.steps },
  { label: LABELS.profile.bmiObese, range: LABELS.profile.bmiObeseRange, min: 30, max: Infinity, color: colors.danger },
];

export function bmiCategoryFor(bmiValue, categories) {
  const n = Number(bmiValue);
  return categories.find((c) => n >= c.min && n < c.max);
}

export const GOAL_META = {
  steps: { title: LABELS.profile.goalStepsTitle, icon: 'footsteps-outline', unit: LABELS.profile.goalStepsUnit, description: LABELS.profile.goalStepsDescription },
  water: { title: LABELS.profile.goalWaterTitle, icon: 'water-outline', unit: LABELS.profile.goalWaterUnit, description: LABELS.profile.goalWaterDescription },
  sleep: { title: LABELS.profile.goalSleepTitle, icon: 'moon-outline', unit: LABELS.profile.goalSleepUnit, description: LABELS.profile.goalSleepDescription },
};

// Reminder categories — breakfast/lunch/dinner/snack are separate picker
// choices (matching the Nutrition screen's meal types) but all route to the
// same "meals" Android channel (see CATEGORY_CHANNEL in
// src/notifications/scheduler.ts). Every one of these except water is
// fixed-time-only: a meal, bedtime, or workout reminder happens once at a
// specific moment, not "every N minutes".
export const REMINDER_CATEGORIES = (colors) => [
  { value: 'water' as const, label: LABELS.notifications.categoryWater, icon: 'water-outline', color: colors.water, soft: colors.waterSoft },
  { value: 'breakfast' as const, label: LABELS.notifications.categoryBreakfast, icon: 'cafe-outline', color: colors.steps, soft: colors.stepsSoft },
  { value: 'lunch' as const, label: LABELS.notifications.categoryLunch, icon: 'restaurant-outline', color: colors.steps, soft: colors.stepsSoft },
  { value: 'dinner' as const, label: LABELS.notifications.categoryDinner, icon: 'pizza-outline', color: colors.steps, soft: colors.stepsSoft },
  { value: 'snack' as const, label: LABELS.notifications.categorySnack, icon: 'flask-outline', color: colors.steps, soft: colors.stepsSoft },
  { value: 'sleep' as const, label: LABELS.notifications.categorySleep, icon: 'moon-outline', color: colors.sleep, soft: colors.sleepSoft },
  { value: 'steps' as const, label: LABELS.notifications.categorySteps, icon: 'footsteps-outline', color: colors.primary, soft: colors.primarySoft },
];

// Only water supports "every N minutes" — every other category is a
// once-a-day, fixed-time thing (a meal, bedtime, a workout).
export const supportsInterval = (category) => category === 'water';

// [startHour, endHour] window (24h, inclusive) each category's fixed-time
// picker is restricted to — nobody needs to scroll through a full-day hour
// grid to find a Lunch reminder time. Sleep wraps past midnight (8 PM-2 AM)
// the same way the existing Bedtime Goal picker does.
export const CATEGORY_HOUR_RANGE = {
  water: [6, 23],
  breakfast: [5, 11],
  lunch: [11, 15],
  dinner: [17, 22],
  snack: [7, 22],
  sleep: [20, 26],
  steps: [6, 21],
};

// Whether "HH:mm" falls inside a category's [start, end] hour window
// (windows can wrap past midnight, e.g. sleep's 20-26).
export function timeInCategoryRange(time, category) {
  const [start, end] = CATEGORY_HOUR_RANGE[category] || [0, 23];
  const hour = Number((time || '00:00').split(':')[0]);
  const hourUnwrapped = hour < start ? hour + 24 : hour;
  return hourUnwrapped >= start && hourUnwrapped <= end;
}

// Used when switching category in the reminder form — snaps to the new
// category's window start instead of leaving a now out-of-range time
// selected with nothing showing as active.
export function defaultTimeForCategory(category) {
  const [start] = CATEGORY_HOUR_RANGE[category] || [8, 8];
  return `${String(start % 24).padStart(2, '0')}:00`;
}

// Preset choices for water's "every N minutes" reminders — fine 5-minute
// steps from 10-60 min (where people actually want to tune the exact
// spacing), coarser hour steps beyond that for a less frequent nudge.
export const INTERVAL_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 90, 120, 180, 240];

export function formatIntervalLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
}

// The row value shown for each reminder in the list — a fixed clock time
// for 'daily', or "Every Xh" for 'interval'.
export function reminderTimeLabel(reminder, formatClockLabel) {
  if (reminder.mode === 'interval') return `Every ${formatIntervalLabel(reminder.intervalMinutes || 30)}`;
  return formatClockLabel(reminder.time);
}
