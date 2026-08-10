import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, glow, radius, shadow, spacing } from '../theme/theme';

const R = 65;
const ARC_LENGTH = Math.PI * R; // length of a semicircle with radius R
const D = 'M10,80 A65,65 0 0 1 140,80';

export default function DailyArc({
  progress = 0,
  color = colors.primary,
  glowColor,
  trackColor = colors.line,
  label,
  value,
  suffix,
  icon,
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = ARC_LENGTH * (1 - clamped);
  const gc = glowColor || color;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[withAlpha(gc, 0.16), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.labelRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
      <View style={glow(gc, 22, 0.5)}>
        <Svg width={188} height={108} viewBox="0 0 150 86">
          <Path d={D} fill="none" stroke={trackColor} strokeWidth={12} strokeLinecap="round" />
          {/* stacked low-opacity strokes fake a soft outer glow without extra deps */}
          <Path
            d={D}
            fill="none"
            stroke={gc}
            strokeWidth={22}
            strokeLinecap="round"
            strokeOpacity={0.18}
            strokeDasharray={`${ARC_LENGTH}, ${ARC_LENGTH}`}
            strokeDashoffset={offset}
          />
          <Path
            d={D}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH}, ${ARC_LENGTH}`}
            strokeDashoffset={offset}
          />
        </Svg>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
        {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
      </View>
    </View>
  );
}

function withAlpha(rgbaOrHex, alpha) {
  if (rgbaOrHex.startsWith('rgba')) return rgbaOrHex;
  const hex = rgbaOrHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  icon: { fontSize: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -2,
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  suffix: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: 4,
  },
});
