// Pure calculation helpers for the Sleep screen — no React, no state,
// independently testable. The hook (useSleepScreen.js) wires these to state;
// this file only knows about plain data in, plain data out.
import { clockDiffMinutes } from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';

export const QUALITY = LABELS.sleep.quality;

// No sleep-stage sensor exists — the stage split below is an estimate applied
// to the real logged total.
export const STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

export const STAGE_INFO = [
  { key: 'deep', icon: 'bed-outline', label: LABELS.sleep.stageDeepLabel, desc: LABELS.sleep.stageDeepDesc },
  { key: 'light', icon: 'partly-sunny-outline', label: LABELS.sleep.stageLightLabel, desc: LABELS.sleep.stageLightDesc },
  { key: 'rem', icon: 'eye-outline', label: LABELS.sleep.stageRemLabel, desc: LABELS.sleep.stageRemDesc },
  { key: 'awake', icon: 'alert-circle-outline', label: LABELS.sleep.stageAwakeLabel, desc: LABELS.sleep.stageAwakeDesc },
];

export function sleepPhasesSourceNote(hasAutoSleep) {
  return hasAutoSleep ? LABELS.sleep.phasesSourceAuto : LABELS.sleep.phasesSourceManual;
}

export function toHHMM(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Compares an actual "HH:mm" against a goal "HH:mm" and labels how close it was.
export function bedtimeStatusFor(actualHHMM, goalHHMM) {
  const diff = clockDiffMinutes(actualHHMM, goalHHMM);
  if (diff == null) return null;
  if (Math.abs(diff) <= 15) return { label: LABELS.sleep.onTime, tone: 'positive' };
  if (diff > 0) return { label: LABELS.sleep.minLate.replace('{n}', String(diff)), tone: diff <= 45 ? 'neutral' : 'warning' };
  return { label: LABELS.sleep.minEarly.replace('{n}', String(Math.abs(diff))), tone: 'positive' };
}
