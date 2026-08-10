import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

export default function ScreenHeader({ eyebrow, title, subtitle, accent }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const resolvedAccent = accent || colors.primary;

  return (
    <View style={styles.wrap}>
      {eyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowDot, { backgroundColor: resolvedAccent }]} />
          <Text style={[styles.eyebrow, { color: resolvedAccent }]}>{eyebrow}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    eyebrowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.ink,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 12.5,
      color: colors.inkSoft,
      marginTop: 3,
      fontWeight: '500',
    },
  });
