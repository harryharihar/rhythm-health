import { useMemo, useState } from 'react';
import { useHealth } from '../../store/healthStore';
import { isSameDay, sumByDay, todayKey } from '../../utils/dateUtils';

// All state, derived data, and handlers for the Water screen — the screen
// component itself only renders what this returns.
export function useWaterScreen() {
  const { profile, water, addWater } = useHealth();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const goalMl = profile?.goals?.waterGoalMl || 2500;
  const today = todayKey();
  const todayLogs = useMemo(() => water.filter((e) => isSameDay(e.timestamp, today)), [water, today]);
  const totalMl = todayLogs.reduce((acc, e) => acc + e.amountMl, 0);
  const weekData = useMemo(() => sumByDay(water, 7, 'amountMl'), [water]);
  const fillPct = Math.max(0, Math.min(1, totalMl / goalMl));

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addWater(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  return {
    goalMl,
    todayLogs,
    totalMl,
    weekData,
    fillPct,
    customOpen,
    setCustomOpen,
    customValue,
    setCustomValue,
    submitCustom,
    addWater,
  };
}
