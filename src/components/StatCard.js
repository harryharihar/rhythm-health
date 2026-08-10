import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { glow, radius, shadow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

// `icon` opts into the badge layout (icon chip + label/value stacked to its
// right), matching the dashboard reference. Omit it to get the original
// dot-indicator layout (still used by ActivityScreen).
export default function StatCard({ dotColor, icon, label, value, unit, caption }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (icon) {
    return (
      <View style={styles.badgeStat}>
        <View style={[styles.iconChip, { backgroundColor: `${dotColor}22` }]}>
          <Ionicons name={icon} size={16} color={dotColor} />
        </View>
        <View style={styles.badgeTextWrap}>
          <Text style={styles.badgeLabel}>{label}</Text>
          <Text style={styles.value}>
            {value} {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          </Text>
          {caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

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

const makeStyles = (colors) =>
  StyleSheet.create({
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
    badgeStat: {
      flexBasis: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadow.card,
    },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    badgeTextWrap: { flex: 1 },
    badgeLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkSoft,
    },
    label: {
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.inkSoft,
    },
    value: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.ink,
      marginTop: 3,
      fontVariant: ['tabular-nums'],
    },
    unit: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.inkSoft,
    },
    caption: {
      fontSize: 9.5,
      fontWeight: '600',
      color: colors.inkFaint,
      marginTop: 2,
    },
  });
