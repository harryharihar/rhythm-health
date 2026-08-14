// Wraps expo-sensors' Pedometer to produce one number: "raw steps taken
// today", on both platforms. The two platforms need different strategies:
//
// - iOS (Core Motion) exposes Pedometer.getStepCountAsync(start, end), which
//   returns an authoritative historical total. We just re-query it from
//   midnight to now on an interval — simplest and always correct.
// - Android only exposes a live step-counter sensor stream via
//   watchStepCount(), and each event reports steps accumulated since that
//   particular subscription started (not since midnight, and not since the
//   last event). To get a running "today" total that survives the app being
//   closed and reopened, we persist the last known total for the day and
//   add each subscription's session delta on top of it.
//
// This module only reports what the device sensor says — it has no concept
// of the user clearing their data. That correction is applied by the caller
// (see src/utils/stepsOffset.js and healthStore's syncAutoSteps), which is
// what makes "clear all data" work reliably: it doesn't depend on this
// subscription being torn down and rebuilt at exactly the right moment.

import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayKey } from './dateUtils';

const ANDROID_BASELINE_KEY = '@rhythm:auto_steps_baseline';
const IOS_POLL_MS = 20000;
const ANDROID_DAY_CHECK_MS = 60000;
// The step-counter sensor picks up incidental jostling from handling the
// phone (unboxing it, installing the app, tapping around) as 1-2 "steps" —
// most noticeable right after a fresh install, when there's no real walking
// yet to drown it out. Whatever accumulates in this window right after a
// subscription starts gets treated as handling noise and permanently
// subtracted, rather than shown as steps the user never took.
const ANDROID_SETTLE_MS = 4000;

async function getAndroidBaseline() {
  try {
    const raw = await AsyncStorage.getItem(ANDROID_BASELINE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.date !== todayKey()) return 0;
    return parsed.total;
  } catch {
    return 0;
  }
}

function setAndroidBaseline(total) {
  AsyncStorage.setItem(ANDROID_BASELINE_KEY, JSON.stringify({ date: todayKey(), total })).catch(() => {});
}

async function ensurePermission() {
  const { status } = await Pedometer.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Pedometer.requestPermissionsAsync();
  return requested === 'granted';
}

function watchIOS(onUpdate) {
  let cancelled = false;
  let interval = null;
  let appStateSub = null;

  const fetchToday = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    try {
      const { steps } = await Pedometer.getStepCountAsync(start, new Date());
      if (!cancelled) onUpdate(steps);
    } catch {
      // Core Motion can transiently fail (e.g. right after a permission
      // grant); the next poll will pick it back up.
    }
  };

  fetchToday();
  interval = setInterval(fetchToday, IOS_POLL_MS);
  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') fetchToday();
  });

  return () => {
    cancelled = true;
    clearInterval(interval);
    appStateSub.remove();
  };
}

function watchAndroid(onUpdate) {
  let cancelled = false;
  let sub = null;
  let dayCheckInterval = null;

  const start = async () => {
    const sessionBase = await getAndroidBaseline();
    if (cancelled) return;

    const subscribedAt = Date.now();
    let settled = false;
    let noiseOffset = 0;

    sub = Pedometer.watchStepCount(({ steps }) => {
      if (cancelled) return;
      if (!settled) {
        noiseOffset = steps;
        if (Date.now() - subscribedAt < ANDROID_SETTLE_MS) return;
        settled = true;
      }
      const total = sessionBase + Math.max(0, steps - noiseOffset);
      onUpdate(total);
      setAndroidBaseline(total);
    });
  };

  start();

  // The sensor delta above is relative to when this subscription began, so a
  // subscription left open across midnight would keep attributing steps to
  // the wrong day. Re-subscribing resets that baseline against the new day.
  let watchedDate = todayKey();
  dayCheckInterval = setInterval(() => {
    if (todayKey() === watchedDate) return;
    watchedDate = todayKey();
    if (sub) sub.remove();
    start();
  }, ANDROID_DAY_CHECK_MS);

  return () => {
    cancelled = true;
    clearInterval(dayCheckInterval);
    if (sub) sub.remove();
  };
}

// Starts tracking today's raw step count from the device sensor and calls
// onUpdate(count) whenever a fresh total is known. Returns an unsubscribe
// function. No-ops safely if the sensor is unavailable or permission is
// denied — callers keep working with manually-logged steps only.
export function watchTodaySteps(onUpdate) {
  let cancelled = false;
  let stop = null;

  (async () => {
    const available = await Pedometer.isAvailableAsync().catch(() => false);
    if (!available || cancelled) return;
    const granted = await ensurePermission().catch(() => false);
    if (!granted || cancelled) return;

    stop = Platform.OS === 'ios' ? watchIOS(onUpdate) : watchAndroid(onUpdate);
  })();

  return () => {
    cancelled = true;
    if (stop) stop();
  };
}
