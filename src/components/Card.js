import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, spacing } from '../theme/theme';

export default function Card({ children, style, glassy = true }) {
  return (
    <View style={[styles.wrap, style]}>
      {glassy && (
        <LinearGradient
          colors={[colors.surfaceGlassStrong, colors.surfaceGlass]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  content: {
    padding: spacing.md,
  },
});
