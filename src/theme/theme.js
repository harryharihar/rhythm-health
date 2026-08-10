// Design tokens for the "Rhythm" visual direction — dark, premium, glow-accented.
// One source of truth for color, spacing and type so every screen stays consistent.

export const colors = {
  bg: '#080C0B',
  bgElevated: '#0E1613',
  surface: '#121A17',
  surfaceGlass: 'rgba(255,255,255,0.045)',
  surfaceGlassStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',

  ink: '#F4F8F6',
  inkSoft: '#8CA29A',
  inkFaint: '#4C5B56',
  line: 'rgba(255,255,255,0.08)',

  primary: '#33E6A6',
  primaryGlow: 'rgba(51,230,166,0.45)',
  primarySoft: 'rgba(51,230,166,0.14)',

  steps: '#F6B23C',
  stepsGlow: 'rgba(246,178,60,0.45)',
  stepsSoft: 'rgba(246,178,60,0.14)',

  water: '#3EC3FF',
  waterGlow: 'rgba(62,195,255,0.45)',
  waterSoft: 'rgba(62,195,255,0.14)',

  sleep: '#B49BFF',
  sleepGlow: 'rgba(180,155,255,0.45)',
  sleepSoft: 'rgba(180,155,255,0.14)',

  danger: '#FF6B5E',
  dangerGlow: 'rgba(255,107,94,0.45)',
  dangerSoft: 'rgba(255,107,94,0.14)',

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

// Per-metric accent bundle, so screens can do metric('water').color etc.
export const metric = (key) => {
  const map = {
    steps: { color: colors.steps, soft: colors.stepsSoft, glow: colors.stepsGlow, label: 'Steps', icon: '👣' },
    water: { color: colors.water, soft: colors.waterSoft, glow: colors.waterGlow, label: 'Water', icon: '💧' },
    sleep: { color: colors.sleep, soft: colors.sleepSoft, glow: colors.sleepGlow, label: 'Sleep', icon: '🌙' },
    weight: { color: colors.primary, soft: colors.primarySoft, glow: colors.primaryGlow, label: 'Weight', icon: '⚖️' },
  };
  return map[key] || map.weight;
};
