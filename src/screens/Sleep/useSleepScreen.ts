import { useEffect, useMemo, useRef, useState } from 'react';
import { useHealth } from '../../store/healthStore';
import { useHealthKitData } from '../../health/useHealthKitData';
import {
  bedtimeOptions,
  clockDiffMinutes,
  formatClockLabel,
  hoursBetweenClockTimes,
  sumByDay,
  wakeTimeOptions,
} from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';
import { bedtimeStatusFor, STAGE_RATIOS, toHHMM } from './sleepCalculations';

// All state, refs, derived data, and handlers for the Sleep screen.
export function useSleepScreen() {
  const { profile, sleep, todayTotals, addSleep, updateGoals } = useHealth();
  const hk = useHealthKitData();
  const [logOpen, setLogOpen] = useState(false);
  const [quality, setQuality] = useState(3);
  const [qualityTouched, setQualityTouched] = useState(false);
  const [phasesInfoOpen, setPhasesInfoOpen] = useState(false);
  const [bedtimeValue, setBedtimeValue] = useState(null); // "HH:mm" 24h
  const [wakeTimeValue, setWakeTimeValue] = useState(null);

  const goal = profile?.goals?.sleepGoalHours || 8;
  const bedtimeGoal = profile?.goals?.bedtimeGoal || null;
  const wakeTimeGoal = profile?.goals?.wakeTimeGoal || null;
  const lastEntry = sleep[0];

  // Duration is always derived from bedtime + wake time — never a separately
  // typed number that could disagree with them.
  const computedHours = useMemo(() => hoursBetweenClockTimes(bedtimeValue, wakeTimeValue), [bedtimeValue, wakeTimeValue]);

  // HealthKit already has real sleep sessions if the user wears an Apple
  // Watch, or just from "Track Sleep with iPhone" (motion/charging-based
  // detection built into iOS 16+, no watch required) — when that data
  // exists, use it instead of asking the user to type in last night's hours.
  const autoSleep = hk.sleepStages; // { deepHours, lightHours, remHours, awakeHours, totalHours, bedtime, wakeTime }
  const hasAutoSleep = !!autoSleep;
  const sleepHours = hasAutoSleep ? autoSleep.totalHours : todayTotals.sleepHours || 0;

  const formatClockTime = (date) => (date ? new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null);
  const bedtimeDisplay = hasAutoSleep ? formatClockTime(autoSleep.bedtime) : lastEntry?.bedtime || null;
  const wakeTimeDisplay = hasAutoSleep ? formatClockTime(autoSleep.wakeTime) : lastEntry?.wakeTime || null;

  // Only real timestamps (HealthKit) can be checked against the goal reliably
  // — older free-text manual entries aren't guaranteed parseable.
  const bedtimeStatus = hasAutoSleep && bedtimeGoal ? bedtimeStatusFor(toHHMM(autoSleep.bedtime), bedtimeGoal) : null;

  const score = useMemo(() => {
    const durationScore = Math.min(1, sleepHours / goal) * 60;
    const qualityScore = ((lastEntry?.quality ?? 2) / 4) * 40;
    return Math.round(durationScore + qualityScore);
  }, [sleepHours, goal, lastEntry]);

  const qualityLabel =
    score >= 85 ? LABELS.sleep.qualityExcellent : score >= 65 ? LABELS.sleep.qualityGood : score >= 40 ? LABELS.sleep.qualityFair : LABELS.sleep.qualityNeedsImprovement;

  const stages = hasAutoSleep
    ? { deep: autoSleep.deepHours, light: autoSleep.lightHours, rem: autoSleep.remHours, awake: autoSleep.awakeHours }
    : sleepHours > 0
    ? {
        deep: sleepHours * STAGE_RATIOS.deep,
        light: sleepHours * STAGE_RATIOS.light,
        rem: sleepHours * STAGE_RATIOS.rem,
        awake: sleepHours * STAGE_RATIOS.awake,
      }
    : null;

  // Weekly trend: HealthKit's real per-night totals take priority over a
  // manually-logged night for the same date, local logs fill in the rest.
  const localWeekData = useMemo(() => sumByDay(sleep, 7, 'hours', 'short'), [sleep]);
  const weekData = useMemo(
    () =>
      localWeekData.map((d) => {
        const hkNight = hk.sleepHistory.find((s) => s.dateKey === d.key);
        return hkNight ? { ...d, value: hkNight.totalHours } : d;
      }),
    [localWeekData, hk.sleepHistory]
  );

  // Bedtime consistency needs real timestamps to mean anything — HealthKit's
  // history has them; free-text manual bedtimes ("11:15 PM") aren't reliably
  // parseable, so the insight only speaks up once there's real data to back it.
  const consistencyInsight = useMemo(() => {
    const bedtimes = hk.sleepHistory.map((s) => s.bedtime).filter(Boolean);
    if (bedtimes.length < 2) return null;
    const minutesOfDay = (d) => {
      const total = d.getHours() * 60 + d.getMinutes();
      return total < 12 * 60 ? total + 24 * 60 : total; // early-morning bedtimes cluster with the evening before
    };
    const values = bedtimes.map(minutesOfDay);
    const spread = Math.max(...values) - Math.min(...values);
    if (spread <= 15) return { tone: 'positive', text: LABELS.sleep.consistencyExcellent.replace('{spread}', String(spread)) };
    if (spread <= 45) return { tone: 'neutral', text: LABELS.sleep.consistencyGood.replace('{spread}', String(spread)) };
    return { tone: 'warning', text: LABELS.sleep.consistencyWarning.replace('{spread}', String(spread)) };
  }, [hk.sleepHistory]);

  // Auto-suggests a quality rating from real signals (how close bedtime was
  // to goal, how close duration was to goal) instead of asking the user to
  // guess a subjective 1-5 score from scratch — they can still override it.
  const derivedQuality = useMemo(() => {
    if (!bedtimeGoal && !goal) return null;
    let s = 0;
    const notes = [];
    if (bedtimeValue && bedtimeGoal) {
      const diff = clockDiffMinutes(bedtimeValue, bedtimeGoal);
      if (Math.abs(diff) <= 15) {
        s += 2;
        notes.push('bedtime was on target');
      } else if (Math.abs(diff) <= 45) {
        s += 1;
        notes.push(`bedtime was ${Math.abs(diff)} min ${diff > 0 ? 'late' : 'early'}`);
      } else {
        notes.push(`bedtime was ${Math.abs(diff)} min ${diff > 0 ? 'late' : 'early'}`);
      }
    }
    const hrs = computedHours || 0;
    if (hrs > 0) {
      if (hrs >= goal - 0.25) {
        s += 2;
        notes.push('you got a full night');
      } else if (hrs >= goal - 1) {
        s += 1;
        notes.push('duration was a little short');
      } else {
        notes.push('duration was well short of your goal');
      }
    }
    if (notes.length === 0) return null;
    return { index: Math.min(4, s), notes };
  }, [bedtimeValue, bedtimeGoal, computedHours, goal]);

  // Pure derivation instead of an effect that syncs `quality` after the
  // fact — that had a real race where the sheet could render with a stale
  // `quality` from the previous time it was open, before the effect caught
  // up. This is correct on every render with no timing dependency at all.
  const effectiveQuality = qualityTouched || !derivedQuality ? quality : derivedQuality.index;

  const bedtimeScrollRef = useRef(null);
  const wakeTimeScrollRef = useRef(null);

  const openLogSheet = () => {
    setBedtimeValue(bedtimeGoal);
    setWakeTimeValue(wakeTimeGoal);
    setQualityTouched(false);
    setLogOpen(true);
  };

  // Scrolls the bedtime/wake-time chip rows to reveal whichever chip is
  // pre-selected from the Profile goal — otherwise it's selected but sits
  // off-screen, and looks like the sync silently failed.
  useEffect(() => {
    if (!logOpen) return;
    const CHIP_STRIDE = 78; // approx chip width + gap
    requestAnimationFrame(() => {
      if (bedtimeValue) {
        const idx = bedtimeOptions().findIndex((t) => t.value === bedtimeValue);
        if (idx > 0) bedtimeScrollRef.current?.scrollTo({ x: Math.max(0, idx * CHIP_STRIDE - 40), animated: false });
      }
      if (wakeTimeValue) {
        const idx = wakeTimeOptions().findIndex((t) => t.value === wakeTimeValue);
        if (idx > 0) wakeTimeScrollRef.current?.scrollTo({ x: Math.max(0, idx * CHIP_STRIDE - 40), animated: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logOpen]);

  const submit = () => {
    const hours = computedHours;
    if (!(hours > 0)) return;
    addSleep({
      hours,
      quality: effectiveQuality,
      bedtime: bedtimeValue ? formatClockLabel(bedtimeValue) : null,
      wakeTime: wakeTimeValue ? formatClockLabel(wakeTimeValue) : null,
    });
    // First-ever logged time becomes the Profile goal automatically; once a
    // goal exists, logging here never overwrites it — Profile stays the
    // source of truth going forward, edit it there to change the goal.
    const goalPatch: { bedtimeGoal?: string; wakeTimeGoal?: string } = {};
    if (bedtimeValue && !bedtimeGoal) goalPatch.bedtimeGoal = bedtimeValue;
    if (wakeTimeValue && !wakeTimeGoal) goalPatch.wakeTimeGoal = wakeTimeValue;
    if (Object.keys(goalPatch).length) updateGoals(goalPatch);
    setLogOpen(false);
  };

  return {
    logOpen, setLogOpen,
    quality, setQuality,
    qualityTouched, setQualityTouched,
    phasesInfoOpen, setPhasesInfoOpen,
    bedtimeValue, setBedtimeValue,
    wakeTimeValue, setWakeTimeValue,
    goal,
    bedtimeGoal,
    wakeTimeGoal,
    computedHours,
    hasAutoSleep,
    sleepHours,
    bedtimeDisplay,
    wakeTimeDisplay,
    bedtimeStatus,
    score,
    qualityLabel,
    stages,
    weekData,
    consistencyInsight,
    derivedQuality,
    effectiveQuality,
    bedtimeScrollRef,
    wakeTimeScrollRef,
    openLogSheet,
    submit,
  };
}
