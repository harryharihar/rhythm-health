import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

// The core local data model, matching the SQLite schema in
// src/storage/storage.ts. Kept as one shared file so the store, hooks, and
// screens all agree on the same shape instead of re-declaring it.

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ProfileGoals {
  stepsGoal: number;
  waterGoalMl: number;
  sleepGoalHours: number;
  calorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatsGoalG: number;
  bedtimeGoal: string | null; // "HH:mm" 24h
  wakeTimeGoal: string | null;
}

export type Gender = 'female' | 'male' | 'other' | 'unspecified';

export interface Profile {
  name: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  gender: Gender;
  goals: ProfileGoals;
  createdAt: string | null;
}

export interface Settings {
  darkMode: boolean;
  remindersEnabled: boolean;
  notificationTime: string;
}

export interface WaterLog {
  id: string;
  timestamp: string;
  amountMl: number;
}

export interface SleepLog {
  id: string;
  timestamp: string;
  hours: number;
  quality: number;
  bedtime: string | null;
  wakeTime: string | null;
}

export interface StepsLog {
  id: string;
  timestamp: string;
  count: number;
  source?: string;
}

export interface WeightLog {
  id: string;
  timestamp: string;
  weightKg: number;
}

export interface Workout {
  id: string;
  timestamp: string;
  type: string;
  durationMin: number;
  caloriesKcal: number;
  distanceKm: number | null;
}

export interface Meal {
  id: string;
  timestamp: string;
  mealType: string;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

// Reminder categories map 1:1 to the Android notification channels in
// src/notifications/setup.ts (CHANNELS) — the category IS the channel, so
// muting one in Android's system settings mutes every reminder of that
// kind. `label` and `time` are fully user-chosen — there is no preset
// schedule; a fresh install starts with zero reminders.
export type ReminderCategory = 'water' | 'meals' | 'sleep' | 'steps';

export interface Reminder {
  id: string;
  timestamp: string;
  category: ReminderCategory;
  label: string;
  time: string; // "HH:mm" 24h
  enabled: boolean;
}

export interface TodayTotals {
  waterMl: number;
  stepsCount: number;
  sleepHours: number;
  latestWeight: number | null;
  sleepEntry: SleepLog | undefined;
  activeMinutes: number;
  todayWorkouts: Workout[];
  workoutCaloriesKcal: number;
  workoutDistanceKm: number;
  caloriesConsumed: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  todayMeals: Meal[];
}
