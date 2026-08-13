import { LABELS } from '../constants/labels';

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

// Very rough estimate: ~0.04 kcal per step, adjustable later per user weight.
export function estimateCaloriesFromSteps(steps) {
  return Math.round((steps || 0) * 0.04);
}

export function estimateDistanceKm(steps) {
  // Average stride ~0.762m
  return Math.round(((steps || 0) * 0.000762) * 10) / 10;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Standard MET (metabolic equivalent) values per workout type, used with the
// standard kcal/min formula below so users don't have to guess a number they
// have no way to actually measure themselves.
export const WORKOUT_MET = {
  Run: 9.8,
  Walk: 3.5,
  HIIT: 8,
  Cycle: 7.5,
  Strength: 5,
  Yoga: 3,
};

// Single source of truth for the workout types offered when logging, and
// their icons — shared by any screen that needs to label or icon a type.
export const WORKOUT_TYPES = [
  { label: 'Run', icon: 'walk-outline', desc: 'Running or jogging outdoors or on a treadmill.' },
  { label: 'Walk', icon: 'footsteps-outline', desc: 'Walking pace, no running.' },
  {
    label: 'HIIT',
    icon: 'flash-outline',
    desc: 'High-Intensity Interval Training — short bursts of all-out effort (sprints, burpees, jump squats) alternated with brief rest.',
  },
  { label: 'Cycle', icon: 'bicycle-outline', desc: 'Cycling or indoor biking.' },
  { label: 'Strength', icon: 'barbell-outline', desc: 'Weight training, resistance bands, or bodyweight strength work.' },
  { label: 'Yoga', icon: 'body-outline', desc: 'Yoga, stretching, or mobility-focused practice.' },
];
export const iconForType = (type) => WORKOUT_TYPES.find((t) => t.label === type)?.icon || 'body-outline';

// kcal/min = MET * 3.5 * weightKg / 200 (standard ACSM formula).
export function estimateWorkoutCalories(type, durationMin, weightKg = 70) {
  const met = WORKOUT_MET[type] ?? WORKOUT_MET.Yoga;
  const kcalPerMin = (met * 3.5 * (weightKg || 70)) / 200;
  return Math.round(kcalPerMin * (durationMin || 0));
}

// Typical pace assumptions (minutes per km) for the workout types where
// distance is a meaningful unit, used only to turn the MET formula above into
// an approximate "calories per km" figure for the info popup — actual pace
// varies a lot per person, so this is a ballpark, not a per-entry calculation.
const WORKOUT_PACE_MIN_PER_KM = {
  Run: 6, // ~10 km/h
  Walk: 12, // ~5 km/h
  Cycle: 3, // ~20 km/h
};

export function estimateCaloriesPerKm(type, weightKg = 70) {
  const paceMinPerKm = WORKOUT_PACE_MIN_PER_KM[type];
  if (!paceMinPerKm) return null;
  const met = WORKOUT_MET[type] ?? WORKOUT_MET.Yoga;
  const kcalPerMin = (met * 3.5 * (weightKg || 70)) / 200;
  return Math.round(kcalPerMin * paceMinPerKm);
}

// Sums a list of workout log entries per type, so each logged type (Run,
// Cycle, ...) can be shown as its own row instead of one blended total.
interface WorkoutTypeTotal {
  type: string;
  durationMin: number;
  caloriesKcal: number;
  distanceKm: number;
}

export function groupWorkoutsByType(workoutEntries: any[]): WorkoutTypeTotal[] {
  const map: Record<string, WorkoutTypeTotal> = {};
  for (const w of workoutEntries) {
    if (!map[w.type]) map[w.type] = { type: w.type, durationMin: 0, caloriesKcal: 0, distanceKm: 0 };
    map[w.type].durationMin += w.durationMin || 0;
    map[w.type].caloriesKcal += w.caloriesKcal || 0;
    map[w.type].distanceKm += w.distanceKm || 0;
  }
  return Object.values(map);
}
