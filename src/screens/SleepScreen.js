import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DailyArc from '../components/DailyArc';
import Card from '../components/Card';
import Pill from '../components/Pill';
import ScreenHeader from '../components/ScreenHeader';
import WeekBars from '../components/WeekBars';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { colors, spacing } from '../theme/theme';
import { sumByDay } from '../utils/dateUtils';

const QUALITY = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// Fixed pseudo-random star positions for the night-sky motif behind the header.
const STARS = [
  { top: 8, left: '12%', size: 2 }, { top: 26, left: '82%', size: 3 },
  { top: 4, left: '46%', size: 2 }, { top: 40, left: '65%', size: 2 },
  { top: 18, left: '28%', size: 3 }, { top: 48, left: '8%', size: 2 },
  { top: 32, left: '92%', size: 2 }, { top: 2, left: '70%', size: 2 },
];

export default function SleepScreen() {
  const { profile, sleep, todayTotals, addSleep } = useHealth();
  const [logOpen, setLogOpen] = useState(false);
  const [hoursInput, setHoursInput] = useState('7.5');
  const [quality, setQuality] = useState(3);

  const goal = profile?.goals?.sleepGoalHours || 8;
  const lastEntry = sleep[0];
  const weekData = useMemo(() => sumByDay(sleep, 7, 'hours'), [sleep]);

  const submit = () => {
    const hours = Number(hoursInput);
    if (hours > 0) addSleep({ hours, quality });
    setLogOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['rgba(180,155,255,0.16)', 'transparent']} style={styles.ambient} pointerEvents="none" />
      <View style={styles.stars} pointerEvents="none">
        {STARS.map((s, i) => (
          <View key={i} style={[styles.star, { top: s.top, left: s.left, width: s.size, height: s.size }]} />
        ))}
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <ScreenHeader eyebrow="Rest" accent={colors.sleep} title="Sleep" subtitle={`Goal ${goal}h`} />

        <DailyArc
          label="Time Asleep"
          icon="🌙"
          value={todayTotals.sleepHours || 0}
          suffix={`/ ${goal}h`}
          progress={(todayTotals.sleepHours || 0) / goal}
          color={colors.sleep}
          trackColor={colors.line}
        />

        <View style={styles.pillRow}>
          <Pill label="Log last night" color={colors.sleep} soft={colors.sleepSoft} onPress={() => setLogOpen(true)} />
        </View>

        {lastEntry ? (
          <Card>
            <Text style={styles.cardTitle}>Latest entry</Text>
            <View style={styles.qualityRow}>
              <Text style={styles.qualityText}>{lastEntry.hours}h · {QUALITY[lastEntry.quality] || QUALITY[2]}</Text>
              <View style={styles.qualityDots}>
                {QUALITY.map((_, i) => (
                  <View key={i} style={[styles.qualityDot, i <= (lastEntry.quality ?? 2) && styles.qualityDotFilled]} />
                ))}
              </View>
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Past 7 nights</Text>
          <WeekBars data={weekData} color={colors.sleep} trackColor={colors.sleepSoft} />
        </Card>

      </ScrollView>

      <QuickAddSheet visible={logOpen} title="Log last night's sleep" onClose={() => setLogOpen(false)}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Hours slept, e.g. 7.5"
          placeholderTextColor={colors.inkFaint}
          value={hoursInput}
          onChangeText={setHoursInput}
        />
        <View style={styles.qualityPicker}>
          {QUALITY.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.qualityChip, quality === i && styles.qualityChipActive]}
              onPress={() => setQuality(i)}
            >
              <Text style={[styles.qualityChipText, quality === i && styles.qualityChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Text style={styles.submitLabel}>Save</Text>
        </TouchableOpacity>
      </QuickAddSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  stars: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: colors.sleep, opacity: 0.7 },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  pillRow: { flexDirection: 'row', marginBottom: spacing.sm, marginHorizontal: -spacing.xs / 2 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qualityText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  qualityDots: { flexDirection: 'row', gap: 4 },
  qualityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  qualityDotFilled: { backgroundColor: colors.sleep },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  qualityPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  qualityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualityChipActive: { backgroundColor: colors.sleepSoft, borderColor: colors.sleep },
  qualityChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  qualityChipTextActive: { color: colors.sleep },
  submitBtn: { backgroundColor: colors.sleep, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  submitLabel: { color: colors.bg, fontWeight: '800', fontSize: 14 },
});
