// Persists when the Home screen's "outside healthy BMI range" banner was
// last shown, so it appears once every 7 days rather than on every app
// open. Kept separate from the main SQLite data (same reasoning as
// stepsOffset.ts) — this is a display-timing flag, not health data, so it
// has no reason to be part of the reactive store or cleared by "Clear All
// Data" (once real data is gone, computeBmi has nothing to work with
// anyway and the banner naturally stops showing).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@rhythm:bmi_banner_last_shown';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function shouldShowBmiBanner() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return true;
    return Date.now() - new Date(raw).getTime() >= WEEK_MS;
  } catch {
    return false;
  }
}

export async function markBmiBannerShown() {
  await AsyncStorage.setItem(KEY, new Date().toISOString()).catch(() => {});
}
