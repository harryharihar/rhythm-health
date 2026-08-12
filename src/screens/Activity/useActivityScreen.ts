import { useEffect, useMemo, useState } from 'react';
import { useHealth } from '../../store/healthStore';
import { useHealthKitData } from '../../health/useHealthKitData';
import { isSameDay, sumByBuckets, todayKey } from '../../utils/dateUtils';
import {
  estimateCaloriesFromSteps,
  estimateCaloriesPerKm,
  estimateDistanceKm,
  estimateWorkoutCalories,
  groupWorkoutsByType,
  WORKOUT_MET,
  WORKOUT_TYPES,
} from '../../utils/healthCalculations';
import { LABELS } from '../../constants/labels';
import { ACTIVE_MINUTES_GOAL, RANGE_OPTIONS } from './activityCalculations';

// All state, derived data, and handlers for the Activity screen.
export function useActivityScreen() {
  const { profile, steps, workouts, todayTotals, addSteps, addWorkout } = useHealth();
  const hk = useHealthKitData();
  const activeMinutes = hk.exerciseMinutes ?? todayTotals.activeMinutes;
  const bodyWeightKg = todayTotals.latestWeight || 70;
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState(WORKOUT_TYPES[0].label);
  const [durationInput, setDurationInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [rangeKey, setRangeKey] = useState('week');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [sheetView, setSheetView] = useState('form');

  // Live clock in the header — ticks every 30s so the displayed minute is
  // never more than 30s stale, well within "updates like a timer."
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const nowDateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const nowTimeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const goal = profile?.goals?.stepsGoal || 10000;
  const today = todayKey();
  const todayCount = useMemo(
    () => steps.filter((e) => isSameDay(e.timestamp, today)).reduce((acc, e) => acc + e.count, 0),
    [steps, today]
  );

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[0];
  const chartData = useMemo(() => sumByBuckets(steps, range.getBuckets(), 'count'), [steps, rangeKey]);
  const avgPerDay = useMemo(
    () => Math.round(chartData.reduce((acc, d) => acc + d.value, 0) / range.totalDays),
    [chartData, range.totalDays]
  );
  // Active-minutes trend over the same range/buckets as steps, so the two are
  // directly comparable when blending the Move score below.
  const activeChartData = useMemo(() => sumByBuckets(workouts, range.getBuckets(), 'durationMin'), [workouts, rangeKey]);
  const avgActiveMinPerDay = useMemo(
    () => Math.round(activeChartData.reduce((acc, d) => acc + d.value, 0) / range.totalDays),
    [activeChartData, range.totalDays]
  );
  const hasWorkoutsInRange = activeChartData.some((d) => d.value > 0);

  const stepsPct = Math.min(100, Math.round((avgPerDay / goal) * 100));
  const activePct = Math.min(100, Math.round((avgActiveMinPerDay / ACTIVE_MINUTES_GOAL) * 100));
  // Steps-only users are scored purely on their step goal, unchanged from
  // before. Once workouts exist in the range, the score credits whichever of
  // steps-progress or active-minutes-progress is stronger, so logging a
  // workout can actually move the needle instead of being invisible here.
  const movePct = hasWorkoutsInRange ? Math.max(stepsPct, activePct) : stepsPct;

  const moveLabel =
    movePct >= 85 ? LABELS.activity.movePeak : movePct >= 65 ? LABELS.activity.moveActive : movePct >= 40 ? LABELS.activity.moveBuilding : LABELS.activity.moveStarting;

  const stepsCaloriesToday = estimateCaloriesFromSteps(todayCount);
  const workoutCaloriesToday = todayTotals.workoutCaloriesKcal || 0;
  const calories = stepsCaloriesToday + workoutCaloriesToday;

  const stepsDistanceToday = estimateDistanceKm(todayCount);
  const workoutDistanceToday = todayTotals.workoutDistanceKm || 0;
  const distanceKm = Math.round((stepsDistanceToday + workoutDistanceToday) * 10) / 10;

  // Each logged type (Run, Cycle, ...) kept as its own row — steps stay a
  // separate "auto" row since those come from the pedometer, not a log entry.
  const workoutsByTypeToday = useMemo(() => groupWorkoutsByType(todayTotals.todayWorkouts), [todayTotals.todayWorkouts]);
  // Short "which sources contributed" hint on the card itself — exact
  // per-type numbers live in the Today's Breakdown card below, so this stays
  // brief enough to never truncate.
  const caloriesCaption = workoutCaloriesToday > 0 ? `Steps + ${workoutsByTypeToday.map((w) => w.type).join(', ')}` : null;
  const distanceCaption =
    workoutDistanceToday > 0 ? `Steps + ${workoutsByTypeToday.filter((w) => w.distanceKm > 0).map((w) => w.type).join(', ')}` : null;

  // "Recent Workouts" only reads correctly when the range is "This Week" —
  // once the user picks an older period, the list (and its title) need to
  // scope to that same period instead of always showing the latest overall.
  const rangeWorkouts = useMemo(() => {
    const buckets = range.getBuckets();
    if (!buckets.length) return workouts;
    const start = buckets[0].start.getTime();
    const end = buckets[buckets.length - 1].end.getTime();
    return workouts.filter((w) => {
      const t = new Date(w.timestamp).getTime();
      return t >= start && t < end;
    });
  }, [workouts, rangeKey]);
  const recentWorkouts = useMemo(() => rangeWorkouts.slice(0, 8), [rangeWorkouts]);

  const workoutDurationMin = Number(durationInput) || 0;
  const estWorkoutCalories = useMemo(
    () => estimateWorkoutCalories(workoutType, workoutDurationMin, bodyWeightKg),
    [workoutType, workoutDurationMin, bodyWeightKg]
  );

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addSteps(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  const resetWorkoutForm = () => {
    setWorkoutType(WORKOUT_TYPES[0].label);
    setDurationInput('');
    setDistanceInput('');
    setSheetView('form');
  };

  const submitWorkout = () => {
    const durationMin = Number(durationInput);
    if (!(durationMin > 0)) return;
    addWorkout({
      type: workoutType,
      durationMin,
      caloriesKcal: estimateWorkoutCalories(workoutType, durationMin, bodyWeightKg),
      distanceKm: distanceInput ? Number(distanceInput) : null,
    });
    resetWorkoutForm();
    setWorkoutOpen(false);
  };

  const maxMet = useMemo(() => Math.max(...Object.values(WORKOUT_MET)), []);
  const calorieChartRows = useMemo(
    () =>
      WORKOUT_TYPES.map((t) => ({
        ...t,
        met: WORKOUT_MET[t.label],
        per30Min: estimateWorkoutCalories(t.label, 30, bodyWeightKg),
        perKm: estimateCaloriesPerKm(t.label, bodyWeightKg),
      })),
    [bodyWeightKg]
  );

  return {
    todayTotals,
    activeMinutes,
    customOpen, setCustomOpen,
    customValue, setCustomValue,
    workoutOpen, setWorkoutOpen,
    workoutType, setWorkoutType,
    durationInput, setDurationInput,
    distanceInput, setDistanceInput,
    rangeKey, setRangeKey,
    rangeOpen, setRangeOpen,
    sheetView, setSheetView,
    nowDateLabel,
    nowTimeLabel,
    goal,
    todayCount,
    range,
    chartData,
    avgPerDay,
    hasWorkoutsInRange,
    avgActiveMinPerDay,
    movePct,
    moveLabel,
    stepsCaloriesToday,
    calories,
    stepsDistanceToday,
    distanceKm,
    workoutsByTypeToday,
    caloriesCaption,
    distanceCaption,
    recentWorkouts,
    workoutDurationMin,
    estWorkoutCalories,
    submitCustom,
    resetWorkoutForm,
    submitWorkout,
    maxMet,
    calorieChartRows,
  };
}
