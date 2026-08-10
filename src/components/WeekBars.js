import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { glow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

// data: [{ key, label, value }], each `value` already 0..max
export default function WeekBars({ data, color, trackColor, height = 70 }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View>
      <View style={[styles.row, { height }]}>
        {data.map((d, i) => {
          const pct = Math.max(0.04, d.value / max);
          const isToday = i === data.length - 1;
          return (
            <View key={d.key} style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${pct * 100}%`,
                    backgroundColor: isToday ? color : trackColor,
                  },
                  isToday ? glow(color, 8, 0.6) : null,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text
            key={d.key}
            style={[styles.dayLabel, i === data.length - 1 && { color, fontWeight: '800' }]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 7,
      marginTop: spacing.xs,
    },
    barTrack: {
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
    },
    bar: {
      width: '100%',
      borderRadius: 6,
      minHeight: 4,
    },
    labelsRow: {
      flexDirection: 'row',
      gap: 7,
      marginTop: spacing.xs,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 9,
      color: colors.inkSoft,
      fontWeight: '600',
    },
  });
