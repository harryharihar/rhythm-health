// Pure calculation helpers and static data for the Nutrition screen — no
// React, no state.
import { dayBuckets, monthBuckets, weekBuckets } from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';

export const MEAL_TYPES = [
  { label: LABELS.nutrition.mealBreakfast, icon: 'cafe-outline' },
  { label: LABELS.nutrition.mealLunch, icon: 'restaurant-outline' },
  { label: LABELS.nutrition.mealDinner, icon: 'pizza-outline' },
  { label: LABELS.nutrition.mealSnack, icon: 'flask-outline' },
];

export const iconForMeal = (type) => MEAL_TYPES.find((t) => t.label === type)?.icon || 'restaurant-outline';

// Same period options as the Activity screen's Time Period picker, for a
// consistent way to look back at past nutrition data.
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

// Commonly cited minimum daily intake for adults — used only to flag a
// possible under-fueling day, not as medical guidance.
export const LOW_INTAKE_FLOOR_KCAL = 1200;
