import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchActiveEnergyKcal,
  fetchExerciseMinutes,
  fetchHeartRateSummary,
  fetchLastNightSleep,
  fetchSleepHistory,
  isHealthKitAvailable,
  requestHealthKitPermissions,
} from './healthkit';

const initialState = {
  available: false,
  loading: true,
  heartRate: null, // { bpm, restingBpm }
  exerciseMinutes: null,
  activeEnergyKcal: null,
  sleepStages: null, // { deepHours, lightHours, remHours, awakeHours, totalHours, bedtime, wakeTime }
  sleepHistory: [], // [{ dateKey, totalHours, deepHours, lightHours, remHours, awakeHours, bedtime, wakeTime }]
};

// Requests HealthKit permission once, then loads today's data. Call `refresh`
// again (e.g. on screen focus) to re-pull, since HealthKit data can change
// outside the app (a synced Apple Watch, the Health app, etc).
export function useHealthKitData() {
  const [state, setState] = useState(initialState);

  const load = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setState((s) => ({ ...s, available: false, loading: false }));
      return;
    }
    const available = await isHealthKitAvailable();
    if (!available) {
      setState((s) => ({ ...s, available: false, loading: false }));
      return;
    }
    await requestHealthKitPermissions();
    const [heartRate, exerciseMinutes, activeEnergyKcal, sleepStages, sleepHistory] = await Promise.all([
      fetchHeartRateSummary(),
      fetchExerciseMinutes(),
      fetchActiveEnergyKcal(),
      fetchLastNightSleep(),
      fetchSleepHistory(7),
    ]);
    setState({ available: true, loading: false, heartRate, exerciseMinutes, activeEnergyKcal, sleepStages, sleepHistory });
  }, []);

  // Fires on mount (the screen is focused when it first renders) and again
  // every time this screen regains focus, since HealthKit data can change
  // outside the app.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { ...state, refresh: load };
}
