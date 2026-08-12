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

// Reminder categories map 1:1 to the Android notification channels
// (src/notifications/setup.ts) — picking a category is what determines
// which channel (and therefore which mute switch) a reminder belongs to.
export const REMINDER_CATEGORIES = (colors) => [
  { value: 'water' as const, label: LABELS.notifications.categoryWater, icon: 'water-outline', color: colors.water, soft: colors.waterSoft },
  { value: 'meals' as const, label: LABELS.notifications.categoryMeals, icon: 'restaurant-outline', color: colors.steps, soft: colors.stepsSoft },
  { value: 'sleep' as const, label: LABELS.notifications.categorySleep, icon: 'moon-outline', color: colors.sleep, soft: colors.sleepSoft },
  { value: 'steps' as const, label: LABELS.notifications.categorySteps, icon: 'footsteps-outline', color: colors.primary, soft: colors.primarySoft },
];
