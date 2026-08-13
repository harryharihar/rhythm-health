import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useHealth } from '../../store/healthStore';
import { useHealthKitData } from '../../health/useHealthKitData';
import { formatShortTime, isSameDay, sumByDay, todayKey } from '../../utils/dateUtils';
import { bmiCategories, bmiCategoryFor, computeBmi, estimateCaloriesFromSteps, estimateDistanceKm, groupWorkoutsByType } from '../../utils/healthCalculations';
import { markBmiBannerShown, shouldShowBmiBanner } from '../../utils/bmiBannerFlag';
import { LABELS } from '../../constants/labels';

const HEART_RATE_INFO = Platform.OS === 'ios' ? LABELS.home.heartRateInfoIOS : LABELS.home.heartRateInfoAndroid;

// Typical adult sleep-stage proportions, applied to the real logged total —
// the total is real data, the stage split is an estimate (no sleep-stage
// sensor exists), used only for the Sleep Analysis preview on Home.
const SLEEP_STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

// All derived data for the Home screen — the screen component only renders
// what this returns.
export function useHomeScreen(colors) {
  const { profile, todayTotals, steps, weight, water, addWater } = useHealth();
  const hk = useHealthKitData();

  const heartRateAvailable = hk.heartRate?.bpm != null;
  const activeMinutes = hk.exerciseMinutes ?? todayTotals.activeMinutes;

  const goals = profile?.goals || { stepsGoal: 10000, waterGoalMl: 2500, sleepGoalHours: 8 };
  const initials = (profile?.name || '?').trim().slice(0, 2).toUpperCase();

  // Exposed individually (not just blended into the one overall score) so
  // the hero card can show why the score isn't 100% even when "Goals
  // Crushed" fires — that only requires water+steps, but the score below
  // also factors in sleep, which can still be short.
  const stepsProgress = Math.min(1, todayTotals.stepsCount / goals.stepsGoal);
  const waterProgress = Math.min(1, todayTotals.waterMl / goals.waterGoalMl);
  const sleepProgress = Math.min(1, todayTotals.sleepHours / goals.sleepGoalHours);
  const overallProgress = useMemo(
    () => Math.round(((stepsProgress + waterProgress + sleepProgress) / 3) * 100) / 100,
    [stepsProgress, waterProgress, sleepProgress]
  );
  const scorePct = Math.round(overallProgress * 100);

  // Hitting both water and steps for the day is a distinct, celebrated
  // state — it overrides the usual score-tier copy below rather than just
  // being one more contributing reason, since this is meant to actually
  // feel like an achievement, not blend into "Excellent Vitality" text.
  const waterGoalAchieved = todayTotals.waterMl >= goals.waterGoalMl;
  const stepsGoalAchieved = todayTotals.stepsCount >= goals.stepsGoal;
  const sleepGoalAchieved = todayTotals.sleepHours >= goals.sleepGoalHours;
  const dailyGoalsAchieved = waterGoalAchieved && stepsGoalAchieved;

  const vitalityLabel = dailyGoalsAchieved
    ? LABELS.home.goalsAchievedTitle
    : scorePct >= 85 ? LABELS.home.vitalityExcellent : scorePct >= 65 ? LABELS.home.vitalityGreat : scorePct >= 40 ? LABELS.home.vitalityGood : LABELS.home.vitalityBuilding;

  const vitalityNote = useMemo(() => {
    if (dailyGoalsAchieved) return LABELS.home.goalsAchievedNote;
    const base = LABELS.home.vitalityNoteBase.replace('{pct}', String(scorePct));
    if (todayTotals.sleepHours >= goals.sleepGoalHours) return `${base} ${LABELS.home.vitalityReasonSleep}`;
    if (todayTotals.waterMl >= goals.waterGoalMl) return `${base} ${LABELS.home.vitalityReasonWater}`;
    if (todayTotals.stepsCount >= goals.stepsGoal) return `${base} ${LABELS.home.vitalityReasonSteps}`;
    return `${base} ${LABELS.home.vitalityReasonDefault}`;
  }, [dailyGoalsAchieved, scorePct, todayTotals, goals]);

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
  // Already timestamp-sorted newest-first from the store (logTable orders
  // by timestamp DESC) — just needs filtering down to today's entries.
  const todayWaterLogs = useMemo(() => {
    const today = todayKey();
    return water.filter((e) => isSameDay(e.timestamp, today)).map((e) => ({ ...e, timeLabel: formatShortTime(e.timestamp) }));
  }, [water]);

  const weightValues = useMemo(() => weight.slice(0, 7).slice().reverse().map((w) => w.weightKg), [weight]);
  const weightDelta = weightValues.length >= 2 ? weightValues[weightValues.length - 1] - weightValues[0] : null;

  // Weight Trend card only — same BMI math/categories as the Profile
  // screen's BMI breakdown, just surfaced here as a quick category label.
  const bmi = computeBmi(profile?.heightCm, todayTotals.latestWeight);
  const bmiCategory = bmi ? bmiCategoryFor(bmi, bmiCategories(colors)) : null;

  // A gentle weekly nudge — shown once every 7 days (see bmiBannerFlag),
  // and only outside the "Normal" range, where a nudge toward setting a
  // weight goal is actually useful rather than noise.
  const bmiBannerRelevant = bmiCategory != null && bmiCategory.label !== LABELS.profile.bmiNormal;
  const [bmiBannerVisible, setBmiBannerVisible] = useState(false);
  useEffect(() => {
    if (!bmiBannerRelevant) return;
    let cancelled = false;
    shouldShowBmiBanner().then((show) => {
      if (show && !cancelled) setBmiBannerVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bmiBannerRelevant]);
  const dismissBmiBanner = () => {
    setBmiBannerVisible(false);
    markBmiBannerShown();
  };

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
    dailyGoalsAchieved,
    stepsProgress,
    waterProgress,
    sleepProgress,
    stepsGoalAchieved,
    waterGoalAchieved,
    sleepGoalAchieved,
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
    todayWaterLogs,
    weightValues,
    weightDelta,
    bmiCategory,
    bmiBannerVisible,
    dismissBmiBanner,
    addWater,
  };
}
