import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

export default function Pill({ label, onPress, color = colors.primary, soft = colors.primarySoft }) {
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: soft, borderColor: withAlpha(color, 0.35) }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
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

const styles = StyleSheet.create({
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
