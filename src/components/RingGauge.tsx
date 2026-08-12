import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../theme/useTheme';

// Full-circle progress ring with centered value/label text — used for the Home
// hero score and the small Water Intake ring. Distinct from DailyArc (a
// semicircle gauge used on the metric detail screens).
interface RingGaugeProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerTop?: string;
  centerValue?: string | number;
  centerLabel?: string;
}

export default function RingGauge({
  progress = 0,
  size = 110,
  strokeWidth = 10,
  color,
  trackColor,
  centerTop,
  centerValue,
  centerLabel,
}: RingGaugeProps) {
  const colors = useThemeColors();
  const resolvedColor = color || colors.primary;
  const resolvedTrack = trackColor || colors.line;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);
  const center = size / 2;
  const valueSize = Math.max(11, Math.round(size * 0.2));
  const labelSize = Math.max(7, Math.round(size * 0.082));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={resolvedTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.center}>
        {centerTop ? <Text style={[styles.label, { color: colors.inkSoft, fontSize: labelSize }]}>{centerTop}</Text> : null}
        {centerValue != null ? <Text style={[styles.value, { color: colors.ink, fontSize: valueSize }]} numberOfLines={1} adjustsFontSizeToFit>{centerValue}</Text> : null}
        {centerLabel ? <Text style={[styles.label, { color: colors.inkSoft, fontSize: labelSize }]}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
