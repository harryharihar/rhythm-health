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

// { deepHours, lightHours, remHours, awakeHours } for the most recent sleep
// session ending within the given window (defaults to the last 16 hours, to
// catch a "last night" session read any time the next day). Returns null if
// no sleep-analysis samples exist yet.
export async function fetchSleepStages(windowHours = 16) {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - windowHours * 3600 * 1000);
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      ascending: true,
      filter: { date: { startDate, endDate } },
    });
    if (!samples || samples.length === 0) return null;

    const totals = { deepHours: 0, lightHours: 0, remHours: 0, awakeHours: 0 };
    for (const s of samples) {
      const hours = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 3600000;
      if (hours <= 0) continue;
      // CategoryValueSleepAnalysis: inBed=0, asleep/asleepUnspecified=1, awake=2, asleepCore=3, asleepDeep=4, asleepREM=5
      if (s.value === 4) totals.deepHours += hours;
      else if (s.value === 3 || s.value === 1) totals.lightHours += hours;
      else if (s.value === 5) totals.remHours += hours;
      else if (s.value === 2) totals.awakeHours += hours;
    }
    const totalAsleep = totals.deepHours + totals.lightHours + totals.remHours;
    if (totalAsleep <= 0) return null;
    return totals;
  } catch {
    return null;
  }
}

function dayBounds(date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}
