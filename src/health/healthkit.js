// Thin wrapper around @kingstinct/react-native-healthkit. iOS only — HealthKit
// doesn't exist on Android/web, and the library's own Platform check already
// makes every call below a safe no-op there (resolves to false/undefined
// rather than throwing), so callers don't need their own Platform.OS guards.
//
// Requires a native dev-client build (npx expo prebuild && npx expo run:ios) —
// this module cannot run inside Expo Go, which has no way to load the native
// HealthKit binding. Every exported function fails soft (returns null/false)
// so the rest of the app keeps working with its existing static/estimated
// fallbacks if this is unavailable for any reason (Expo Go, simulator,
// permission denied, no data yet).
import {
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

const READ_TYPES = [
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKCategoryTypeIdentifierSleepAnalysis',
];

export async function isHealthKitAvailable() {
  try {
    return await isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestHealthKitPermissions() {
  try {
    await requestAuthorization({ toRead: READ_TYPES });
    return true;
  } catch {
    return false;
  }
}

// { bpm, restingBpm } — most recent heart rate + resting heart rate samples.
// Either can be null if HealthKit has no such sample yet (e.g. no paired watch).
export async function fetchHeartRateSummary() {
  try {
    const [latest, resting] = await Promise.all([
      getMostRecentQuantitySample('HKQuantityTypeIdentifierHeartRate', 'count/min'),
      getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate', 'count/min'),
    ]);
    return {
      bpm: latest ? Math.round(latest.quantity) : null,
      restingBpm: resting ? Math.round(resting.quantity) : null,
    };
  } catch {
    return { bpm: null, restingBpm: null };
  }
}

// Total Apple "Exercise Minutes" for the given day (defaults to today).
export async function fetchExerciseMinutes(date = new Date()) {
  try {
    const { startDate, endDate } = dayBounds(date);
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierAppleExerciseTime',
      ['cumulativeSum'],
      { unit: 'min', filter: { date: { startDate, endDate } } }
    );
    return stats.sumQuantity ? Math.round(stats.sumQuantity.quantity) : null;
  } catch {
    return null;
  }
}

// Total active energy burned (kcal) for the given day (defaults to today).
export async function fetchActiveEnergyKcal(date = new Date()) {
  try {
    const { startDate, endDate } = dayBounds(date);
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      { unit: 'kcal', filter: { date: { startDate, endDate } } }
    );
    return stats.sumQuantity ? Math.round(stats.sumQuantity.quantity) : null;
  } catch {
    return null;
  }
}

// CategoryValueSleepAnalysis: inBed=0, asleep/asleepUnspecified=1, awake=2, asleepCore=3, asleepDeep=4, asleepREM=5
function summarizeSleepSamples(samples) {
  const totals = { deepHours: 0, lightHours: 0, remHours: 0, awakeHours: 0 };
  let bedtime = null;
  let wakeTime = null;
  for (const s of samples) {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours <= 0) continue;
    if (s.value === 4) totals.deepHours += hours;
    else if (s.value === 3 || s.value === 1) totals.lightHours += hours;
    else if (s.value === 5) totals.remHours += hours;
    else if (s.value === 2) totals.awakeHours += hours;
    else continue; // inBed (0) samples overlap the asleep ones — skip to avoid double-counting duration
    if (!bedtime || start < bedtime) bedtime = start;
    if (!wakeTime || end > wakeTime) wakeTime = end;
  }
  const totalHours = totals.deepHours + totals.lightHours + totals.remHours;
  if (totalHours <= 0) return null;
  return { ...totals, totalHours, bedtime, wakeTime };
}

// Real bedtime/wake time/duration/stage split for the most recent sleep
// session ending within the given window (defaults to the last 16 hours, to
// catch "last night" read any time the next day) — sourced from whatever
// already populated HealthKit's sleep data (Apple Watch, or "Track Sleep
// with iPhone" motion/charging detection since iOS 16, or manual Health app
// entry). Returns null if no sleep-analysis samples exist yet.
export async function fetchLastNightSleep(windowHours = 16) {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - windowHours * 3600 * 1000);
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      ascending: true,
      filter: { date: { startDate, endDate } },
    });
    if (!samples || samples.length === 0) return null;
    return summarizeSleepSamples(samples);
  } catch {
    return null;
  }
}

// One summarized session per night over the last `days` days, keyed by the
// wake-up date (matching how Apple Health itself attributes a sleep session
// to the morning you woke up). Used to auto-populate the Sleep Trend chart
// and bedtime-consistency insight without asking the user to log anything.
export async function fetchSleepHistory(days = 7) {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days + 1) * 24 * 3600 * 1000);
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      ascending: true,
      filter: { date: { startDate, endDate } },
    });
    if (!samples || samples.length === 0) return [];

    // Group into sessions: a gap of 2+ hours between consecutive samples
    // starts a new night's session.
    const sorted = [...samples].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const sessions = [];
    let current = [];
    let lastEnd = null;
    for (const s of sorted) {
      const start = new Date(s.startDate);
      if (lastEnd && start.getTime() - lastEnd.getTime() > 2 * 3600 * 1000) {
        if (current.length) sessions.push(current);
        current = [];
      }
      current.push(s);
      const end = new Date(s.endDate);
      if (!lastEnd || end > lastEnd) lastEnd = end;
    }
    if (current.length) sessions.push(current);

    return sessions
      .map(summarizeSleepSamples)
      .filter(Boolean)
      .map((session) => ({ ...session, dateKey: toDateKey(session.wakeTime) }));
  } catch {
    return [];
  }
}

function toDateKey(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function dayBounds(date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}
