import { create } from 'zustand';
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  clearAllData,
  getProfile,
  getSettings,
  mealStore,
  remindersStore,
  saveProfile,
  saveSettings,
  sleepStore,
  stepsStore,
  waterStore,
  weightStore,
  workoutStore,
} from '../storage/storage';
import { isSameDay, todayKey } from '../utils/dateUtils';
import { watchTodaySteps } from '../utils/pedometer';
import { getStepsResetOffset, setStepsResetOffset } from '../utils/stepsOffset';
import { hasNotificationPermission } from '../notifications/setup';
import { cancelAllReminders, rescheduleAllReminders } from '../notifications/scheduler';
import type { Meal, Profile, ProfileGoals, Reminder, ReminderCategory, Settings, SleepLog, StepsLog, TodayTotals, WaterLog, WeightLog, Workout } from '../types/models';

// Started by initialize() below; kept outside the store since it's a
// subscription handle, not app state.
let stopAutoSteps: (() => void) | null = null;

type ReminderInput = { category: ReminderCategory; label: string; time: string; enabled: boolean };

export interface HealthState {
  loading: boolean;
  profile: Profile | null;
  settings: Settings;
  water: WaterLog[];
  sleep: SleepLog[];
  steps: StepsLog[];
  weight: WeightLog[];
  workouts: Workout[];
  meals: Meal[];
  reminders: Reminder[];
  autoStepsActive: boolean;
  rawStepsToday: number;

  loadAll: () => Promise<void>;
  initialize: () => Promise<void>;
  teardown: () => void;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  updateGoals: (goalsPatch: Partial<ProfileGoals>) => Promise<Profile>;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
  addWater: (amountMl: number) => Promise<void>;
  addSleep: (entry: { hours: number; quality: number; bedtime: string | null; wakeTime: string | null }) => Promise<void>;
  addSteps: (count: number) => Promise<void>;
  addWeight: (weightKg: number) => Promise<void>;
  addWorkout: (entry: { type: string; durationMin: number; caloriesKcal: number; distanceKm: number | null }) => Promise<void>;
  addMeal: (entry: { mealType: string; name: string; caloriesKcal: number; proteinG: number; carbsG: number; fatsG: number }) => Promise<void>;
  addReminder: (entry: ReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, patch: Partial<ReminderInput>) => Promise<Reminder>;
  removeReminder: (id: string) => Promise<void>;
  syncAutoSteps: (rawCount: number) => Promise<void>;
  resetAllData: () => Promise<void>;
}

function computeTodayTotals(state: HealthState): TodayTotals {
  const today = todayKey();
  const waterMl = state.water
    .filter((e) => isSameDay(e.timestamp, today))
    .reduce((acc, e) => acc + (e.amountMl || 0), 0);
  const stepsCount = state.steps
    .filter((e) => isSameDay(e.timestamp, today))
    .reduce((acc, e) => acc + (e.count || 0), 0);
  const sleepEntry = state.sleep.find((e) => isSameDay(e.timestamp, today));
  const sleepHours = sleepEntry ? sleepEntry.hours : 0;
  const latestWeight = state.weight[0]?.weightKg ?? state.profile?.weightKg ?? null;

  const todayWorkouts = state.workouts.filter((e) => isSameDay(e.timestamp, today));
  const activeMinutes = todayWorkouts.reduce((acc, e) => acc + (e.durationMin || 0), 0);
  const workoutCaloriesKcal = todayWorkouts.reduce((acc, e) => acc + (e.caloriesKcal || 0), 0);
  const workoutDistanceKm = todayWorkouts.reduce((acc, e) => acc + (e.distanceKm || 0), 0);

  const todayMeals = state.meals.filter((e) => isSameDay(e.timestamp, today));
  const caloriesConsumed = todayMeals.reduce((acc, e) => acc + (e.caloriesKcal || 0), 0);
  const proteinG = todayMeals.reduce((acc, e) => acc + (e.proteinG || 0), 0);
  const carbsG = todayMeals.reduce((acc, e) => acc + (e.carbsG || 0), 0);
  const fatsG = todayMeals.reduce((acc, e) => acc + (e.fatsG || 0), 0);

  return {
    waterMl,
    stepsCount,
    sleepHours,
    latestWeight,
    sleepEntry,
    activeMinutes,
    todayWorkouts,
    workoutCaloriesKcal,
    workoutDistanceKm,
    caloriesConsumed,
    proteinG,
    carbsG,
    fatsG,
    todayMeals,
  };
}

export const useHealthStore = create<HealthState>()((set, get) => ({
  loading: true,
  profile: null,
  settings: DEFAULT_SETTINGS,
  water: [],
  sleep: [],
  steps: [],
  weight: [],
  workouts: [],
  meals: [],
  reminders: [],
  autoStepsActive: false,
  rawStepsToday: 0,

  loadAll: async () => {
    set({ loading: true });
    const [p, s, w, sl, st, wt, wo, ml, rm] = await Promise.all([
      getProfile(),
      getSettings(),
      waterStore.all(),
      sleepStore.all(),
      stepsStore.all(),
      weightStore.all(),
      workoutStore.all(),
      mealStore.all(),
      remindersStore.all(),
    ]);
    set({ profile: p, settings: s, water: w, sleep: sl, steps: st, weight: wt, workouts: wo, meals: ml, reminders: rm, loading: false });
  },

  // Loads everything from SQLite, then starts the device step sensor.
  // Call once at app startup.
  initialize: async () => {
    await get().loadAll();
    if (stopAutoSteps) stopAutoSteps();
    stopAutoSteps = watchTodaySteps(get().syncAutoSteps);
    // Re-assert the schedule on every launch as a safety net — scheduled
    // local notifications can be dropped by the OS (e.g. after a device
    // reboot on Android), and this is cheap/idempotent either way.
    if (get().settings.remindersEnabled && (await hasNotificationPermission())) {
      await rescheduleAllReminders(get().reminders);
    }
  },

  teardown: () => {
    if (stopAutoSteps) {
      stopAutoSteps();
      stopAutoSteps = null;
    }
  },

  // ----- Profile -----
  updateProfile: async (patch) => {
    const base = get().profile || DEFAULT_PROFILE;
    const next = await saveProfile({ ...base, ...patch });
    set({ profile: next });
    return next;
  },

  updateGoals: async (goalsPatch) => {
    const base = get().profile || DEFAULT_PROFILE;
    const next = await saveProfile({ ...base, goals: { ...base.goals, ...goalsPatch } });
    set({ profile: next });
    return next;
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await saveSettings(next);
    set({ settings: next });
    if (patch.remindersEnabled === true) {
      if (await hasNotificationPermission()) await rescheduleAllReminders(get().reminders);
    } else if (patch.remindersEnabled === false) {
      await cancelAllReminders();
    }
    return next;
  },

  // ----- Logs -----
  addWater: async (amountMl) => {
    const entry = await waterStore.add({ amountMl });
    set((state) => ({ water: [entry, ...state.water] }));
  },

  addSleep: async ({ hours, quality, bedtime, wakeTime }) => {
    const entry = await sleepStore.add({ hours, quality, bedtime, wakeTime });
    set((state) => ({ sleep: [entry, ...state.sleep] }));
  },

  addSteps: async (count) => {
    const entry = await stepsStore.add({ count });
    set((state) => ({ steps: [entry, ...state.steps] }));
  },

  addWeight: async (weightKg) => {
    const entry = await weightStore.add({ weightKg });
    set((state) => ({ weight: [entry, ...state.weight] }));
    // Keep the profile's current weight in sync with the latest log.
    await get().updateProfile({ weightKg });
  },

  addWorkout: async ({ type, durationMin, caloriesKcal, distanceKm }) => {
    const entry = await workoutStore.add({ type, durationMin, caloriesKcal, distanceKm });
    set((state) => ({ workouts: [entry, ...state.workouts] }));
  },

  addMeal: async ({ mealType, name, caloriesKcal, proteinG, carbsG, fatsG }) => {
    const entry = await mealStore.add({ mealType, name, caloriesKcal, proteinG, carbsG, fatsG });
    set((state) => ({ meals: [entry, ...state.meals] }));
  },

  // ----- Reminders -----
  // Fully user-defined — there is no preset schedule, so every CRUD op here
  // re-syncs the actual OS-level alarms to match, but only when reminders
  // are enabled and permission was granted (otherwise nothing should be
  // scheduled regardless of what's in the list).
  addReminder: async (entry) => {
    const reminder = await remindersStore.add(entry);
    set((state) => ({ reminders: [reminder, ...state.reminders] }));
    if (get().settings.remindersEnabled && (await hasNotificationPermission())) {
      await rescheduleAllReminders(get().reminders);
    }
    return reminder;
  },

  updateReminder: async (id, patch) => {
    const reminder = await remindersStore.update(id, patch);
    set((state) => ({ reminders: state.reminders.map((r) => (r.id === id ? reminder : r)) }));
    if (get().settings.remindersEnabled && (await hasNotificationPermission())) {
      await rescheduleAllReminders(get().reminders);
    }
    return reminder;
  },

  removeReminder: async (id) => {
    const remaining = await remindersStore.remove(id);
    set({ reminders: remaining });
    if (get().settings.remindersEnabled && (await hasNotificationPermission())) {
      await rescheduleAllReminders(get().reminders);
    }
  },

  // Keeps a single "auto" entry per day in the steps log up to date with the
  // device's pedometer, separate from manually-added entries. Both count
  // toward todayTotals.stepsCount and the weekly chart, same as any other log.
  // `rawCount` is whatever the device sensor reports for today — resetAllData
  // below subtracts an offset from it so a data reset actually sticks, without
  // needing to touch the sensor subscription itself.
  syncAutoSteps: async (rawCount) => {
    const offset = await getStepsResetOffset();
    const count = Math.max(0, rawCount - offset);
    const id = `auto-${todayKey()}`;
    const entry = await stepsStore.upsert(id, { count, source: 'auto' });
    set((state) => {
      const idx = state.steps.findIndex((e) => e.id === id);
      const steps = idx === -1 ? [entry, ...state.steps] : state.steps.map((e, i) => (i === idx ? entry : e));
      return { steps, autoStepsActive: true, rawStepsToday: rawCount };
    });
  },

  resetAllData: async () => {
    // Record today's current raw sensor reading as the new "zero point" so
    // auto-tracked steps read as cleared too, then immediately re-apply it
    // (rather than waiting for the next sensor event) so the screen updates
    // right away. The sensor subscription itself is left running untouched —
    // it doesn't need to know a reset happened.
    await setStepsResetOffset(get().rawStepsToday);
    await clearAllData();
    set({
      profile: null,
      settings: DEFAULT_SETTINGS,
      water: [],
      sleep: [],
      steps: [],
      weight: [],
      workouts: [],
      meals: [],
      reminders: [],
      autoStepsActive: false,
    });
    // Reminders themselves are wiped along with everything else, so nothing
    // is left to schedule.
    await cancelAllReminders();
    await get().syncAutoSteps(get().rawStepsToday);
  },
}));

// Convenience hook giving screens the whole store plus derived "today" totals
// in one call.
export function useHealth() {
  const state = useHealthStore();
  return { ...state, todayTotals: computeTodayTotals(state) };
}
