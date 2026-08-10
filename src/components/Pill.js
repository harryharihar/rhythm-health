import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

export default function Pill({ label, onPress, color, soft }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const resolvedColor = color || colors.primary;
  const resolvedSoft = soft || colors.primarySoft;

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: resolvedSoft, borderColor: withAlpha(resolvedColor, 0.35) }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color: resolvedColor }]}>{label}</Text>
    </TouchableOpacity>
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

const makeStyles = () =>
  StyleSheet.create({
    pill: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: 'center',
      marginHorizontal: spacing.xs / 2,
    },
    label: {
      fontSize: 12.5,
      fontWeight: '700',
    },
  });
