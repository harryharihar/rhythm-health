import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useHealth } from '../../store/healthStore';
import { useHealthKitData } from '../../health/useHealthKitData';
import { sumByDay } from '../../utils/dateUtils';
import { estimateCaloriesFromSteps, estimateDistanceKm, groupWorkoutsByType } from '../../utils/healthCalculations';
import { LABELS } from '../../constants/labels';

const HEART_RATE_INFO = Platform.OS === 'ios' ? LABELS.home.heartRateInfoIOS : LABELS.home.heartRateInfoAndroid;

// Typical adult sleep-stage proportions, applied to the real logged total —
// the total is real data, the stage split is an estimate (no sleep-stage
// sensor exists), used only for the Sleep Analysis preview on Home.
const SLEEP_STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

// All derived data for the Home screen — the screen component only renders
// what this returns.
export function useHomeScreen() {
  const { profile, todayTotals, steps, weight, addWater } = useHealth();
  const hk = useHealthKitData();

  const heartRateAvailable = hk.heartRate?.bpm != null;
  const activeMinutes = hk.exerciseMinutes ?? todayTotals.activeMinutes;

  const goals = profile?.goals || { stepsGoal: 10000, waterGoalMl: 2500, sleepGoalHours: 8 };
  const initials = (profile?.name || '?').trim().slice(0, 2).toUpperCase();

  const overallProgress = useMemo(() => {
    const p1 = Math.min(1, todayTotals.stepsCount / goals.stepsGoal);
    const p2 = Math.min(1, todayTotals.waterMl / goals.waterGoalMl);
    const p3 = Math.min(1, todayTotals.sleepHours / goals.sleepGoalHours);
    return Math.round(((p1 + p2 + p3) / 3) * 100) / 100;
  }, [todayTotals, goals]);
  const scorePct = Math.round(overallProgress * 100);

  const vitalityLabel =
    scorePct >= 85 ? LABELS.home.vitalityExcellent : scorePct >= 65 ? LABELS.home.vitalityGreat : scorePct >= 40 ? LABELS.home.vitalityGood : LABELS.home.vitalityBuilding;

  const vitalityNote = useMemo(() => {
    const base = LABELS.home.vitalityNoteBase.replace('{pct}', String(scorePct));
    if (todayTotals.sleepHours >= goals.sleepGoalHours) return `${base} ${LABELS.home.vitalityReasonSleep}`;
    if (todayTotals.waterMl >= goals.waterGoalMl) return `${base} ${LABELS.home.vitalityReasonWater}`;
    if (todayTotals.stepsCount >= goals.stepsGoal) return `${base} ${LABELS.home.vitalityReasonSteps}`;
    return `${base} ${LABELS.home.vitalityReasonDefault}`;
  }, [scorePct, todayTotals, goals]);

  const weekSteps = useMemo(() => sumByDay(steps, 7, 'count'), [steps]);
  const dailyAvgPct = useMemo(() => {
    const avg = weekSteps.reduce((acc, d) => acc + d.value, 0) / weekSteps.length;
    return Math.round((avg / goals.stepsGoal) * 100);
  }, [weekSteps, goals]);

  const stepsCaloriesToday = estimateCaloriesFromSteps(todayTotals.stepsCount);
  const workoutCaloriesToday = todayTotals.workoutCaloriesKcal || 0;
  const calories = stepsCaloriesToday + workoutCaloriesToday;

  const stepsDistanceToday = estimateDistanceKm(todayTotals.stepsCount);
  const workoutDistanceToday = todayTotals.workoutDistanceKm || 0;
  const distanceKm = Math.round((stepsDistanceToday + workoutDistanceToday) * 10) / 10;

  const workoutsByTypeToday = useMemo(() => groupWorkoutsByType(todayTotals.todayWorkouts), [todayTotals.todayWorkouts]);
  const caloriesCaption = workoutCaloriesToday > 0 ? `Steps + ${workoutsByTypeToday.map((w) => w.type).join(', ')}` : null;
  const distanceCaption =
    workoutDistanceToday > 0 ? `Steps + ${workoutsByTypeToday.filter((w) => w.distanceKm > 0).map((w) => w.type).join(', ')}` : null;

  const sleepHours = todayTotals.sleepHours || 0;
  const sleepStages = hk.sleepStages
    ? { deep: hk.sleepStages.deepHours, light: hk.sleepStages.lightHours, rem: hk.sleepStages.remHours, awake: hk.sleepStages.awakeHours }
    : sleepHours > 0
    ? {
        deep: sleepHours * SLEEP_STAGE_RATIOS.deep,
        light: sleepHours * SLEEP_STAGE_RATIOS.light,
        rem: sleepHours * SLEEP_STAGE_RATIOS.rem,
        awake: sleepHours * SLEEP_STAGE_RATIOS.awake,
      }
    : null;

  const fillPct = Math.max(0, Math.min(1, todayTotals.waterMl / goals.waterGoalMl));
  const waterLitres = (todayTotals.waterMl / 1000).toFixed(1);
  const waterGoalLitres = (goals.waterGoalMl / 1000).toFixed(1);

  const weightValues = useMemo(() => weight.slice(0, 7).slice().reverse().map((w) => w.weightKg), [weight]);
  const weightDelta = weightValues.length >= 2 ? weightValues[weightValues.length - 1] - weightValues[0] : null;

  return {
    profile,
    todayTotals,
    hk,
    heartRateAvailable,
    heartRateInfo: HEART_RATE_INFO,
    activeMinutes,
    goals,
    initials,
    overallProgress,
    scorePct,
    vitalityLabel,
    vitalityNote,
    weekSteps,
    dailyAvgPct,
    calories,
    stepsCaloriesToday,
    distanceKm,
    stepsDistanceToday,
    workoutsByTypeToday,
    caloriesCaption,
    distanceCaption,
    sleepHours,
    sleepStages,
    fillPct,
    waterLitres,
    waterGoalLitres,
    weightValues,
    weightDelta,
    addWater,
  };
}
