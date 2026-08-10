// Persists a single number: how many (raw, device-reported) steps existed
// today at the moment the user last cleared their data. Kept separate from
// pedometer.js on purpose — the sensor watcher's job is just to report the
// device's raw step count; correcting that for a user-initiated reset is a
// display concern, applied once in the store, regardless of platform.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayKey } from './dateUtils';

const KEY = '@rhythm:steps_reset_offset';

export async function getStepsResetOffset() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.date !== todayKey()) return 0;
    return parsed.offset;
  } catch {
    return 0;
  }
}

export async function setStepsResetOffset(offset) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ date: todayKey(), offset })).catch(() => {});
}
