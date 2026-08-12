import { useHealthStore } from '../store/healthStore';
import { darkColors, lightColors } from './theme';

// The single source of truth for "which palette is active right now" —
// driven by the persisted settings.darkMode flag, not the OS appearance.
export function useThemeColors() {
  return useHealthStore((s) => (s.settings.darkMode ? darkColors : lightColors));
}
