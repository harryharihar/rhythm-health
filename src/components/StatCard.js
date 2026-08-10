import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, glow, radius, shadow, spacing } from '../theme/theme';

export default function StatCard({ dotColor, label, value, unit }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.dot, { backgroundColor: dotColor }, glow(dotColor, 8, 0.8)]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value} {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkSoft,
  },
});
