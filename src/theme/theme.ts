// Design tokens for the "Rhythm" visual direction.
// Two palettes (dark "premium/glow" and light "calm/organic") sharing the
// same key set, so every component can stay palette-agnostic and just read
// whichever one is active via useThemeColors().

export const darkColors = {
  // Neutral cool charcoal, not hue-tinted — a green-tinted background made the
  // primary accent (also green) blend into the surface instead of popping off it.
  bg: '#0A0C0F',
  bgElevated: '#12161C',
  surface: '#181D24',
  surfaceGlass: 'rgba(255,255,255,0.05)',
  surfaceGlassStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.20)',

  ink: '#F6F8FA',
  inkSoft: '#9AA3AC',
  inkFaint: '#565E68',
  line: 'rgba(255,255,255,0.10)',

  // Text color to place on top of a solid accent-colored surface (buttons, avatars).
  onAccent: '#0A0C0F',

  primary: '#2FEFAA',
  primaryGlow: 'rgba(47,239,170,0.5)',
  primarySoft: 'rgba(47,239,170,0.16)',

  steps: '#FFB020',
  stepsGlow: 'rgba(255,176,32,0.5)',
  stepsSoft: 'rgba(255,176,32,0.16)',

  water: '#22C7FF',
  waterGlow: 'rgba(34,199,255,0.5)',
  waterSoft: 'rgba(34,199,255,0.16)',

  sleep: '#B388FF',
  sleepGlow: 'rgba(179,136,255,0.5)',
  sleepSoft: 'rgba(179,136,255,0.16)',

  danger: '#FF5A4D',
  dangerGlow: 'rgba(255,90,77,0.5)',
  dangerSoft: 'rgba(255,90,77,0.16)',

  white: '#FFFFFF',
};

export const lightColors = {
  // Page background needs to read clearly darker than the white cards sitting
  // on it — too close in value and every card looks like a dull gray blob.
  bg: '#E9EDEA',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(15,35,28,0.035)',
  surfaceGlassStrong: 'rgba(15,35,28,0.07)',
  border: '#DCE4DE',
  borderStrong: '#C2D0C6',

  ink: '#0F231C',
  inkSoft: '#55695E',
  inkFaint: '#94A79B',
  line: '#E3EBE4',

  // Text color to place on top of a solid accent-colored surface (buttons, avatars).
  onAccent: '#FFFFFF',

  primary: '#059669',
  primaryGlow: 'rgba(5,150,105,0.35)',
  primarySoft: 'rgba(5,150,105,0.14)',

  steps: '#D97706',
  stepsGlow: 'rgba(217,119,6,0.32)',
  stepsSoft: 'rgba(217,119,6,0.14)',

  water: '#0284C7',
  waterGlow: 'rgba(2,132,199,0.32)',
  waterSoft: 'rgba(2,132,199,0.14)',

  sleep: '#7C3AED',
  sleepGlow: 'rgba(124,58,237,0.32)',
  sleepSoft: 'rgba(124,58,237,0.14)',

  danger: '#DC2626',
  dangerGlow: 'rgba(220,38,38,0.32)',
  dangerSoft: 'rgba(220,38,38,0.14)',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const typography = {
  display: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
  },
};

// Soft ambient shadow for elevated glass cards.
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
};

// Colored glow shadow, used behind metric-accented elements (arcs, dots, active tabs).
export function glow(color, radius = 18, opacity = 0.55) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: 10,
  };
}

// Per-metric accent bundle: metric('water', colors) => { color, soft, glow, label, icon }
export const metric = (key, colors) => {
  const map = {
    steps: { color: colors.steps, soft: colors.stepsSoft, glow: colors.stepsGlow, label: 'Steps', icon: '👣' },
    water: { color: colors.water, soft: colors.waterSoft, glow: colors.waterGlow, label: 'Water', icon: '💧' },
    sleep: { color: colors.sleep, soft: colors.sleepSoft, glow: colors.sleepGlow, label: 'Sleep', icon: '🌙' },
    weight: { color: colors.primary, soft: colors.primarySoft, glow: colors.primaryGlow, label: 'Weight', icon: '⚖️' },
  };
  return map[key] || map.weight;
};
