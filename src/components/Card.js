import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, shadow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

// Two layers on purpose: `overflow: hidden` (needed to clip the gradient to
// the rounded corners) also clips the view's own shadow on iOS if it's on
// the same node, so the shadow has to live on an outer, non-clipping wrapper.
// `style` sizes/positions the whole card among its siblings (flex, margin).
// `contentStyle` controls how the card's own children are laid out
// (flexDirection, alignItems, gap) — they're different concerns because
// `children` render two levels deeper than the outer wrapper.
export default function Card({ children, style, contentStyle, glassy = true }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.shadowWrap, style]}>
      <View style={styles.clip}>
        {glassy && (
          <LinearGradient
            colors={[colors.surfaceGlassStrong, colors.surfaceGlass]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    shadowWrap: {
      borderRadius: radius.lg,
      marginBottom: spacing.md,
      ...shadow.card,
    },
    clip: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    content: {
      padding: spacing.md,
    },
  });
