import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DailyArc from '../components/DailyArc';
import Card from '../components/Card';
import Pill from '../components/Pill';
import ScreenHeader from '../components/ScreenHeader';
import WeekBars from '../components/WeekBars';
import QuickAddSheet from '../components/QuickAddSheet';
import StatCard from '../components/StatCard';
import { useHealth } from '../store/healthStore';
import { colors, spacing } from '../theme/theme';
import { isSameDay, sumByDay, todayKey } from '../utils/dateUtils';
import { estimateCaloriesFromSteps, estimateDistanceKm } from '../utils/healthCalculations';

export default function ActivityScreen() {
  const { profile, steps, addSteps, autoStepsActive } = useHealth();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const goal = profile?.goals?.stepsGoal || 10000;
  const today = todayKey();
  const todayCount = useMemo(
    () => steps.filter((e) => isSameDay(e.timestamp, today)).reduce((acc, e) => acc + e.count, 0),
    [steps, today]
  );
  const weekData = useMemo(() => sumByDay(steps, 7, 'count'), [steps]);

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addSteps(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['rgba(246,178,60,0.14)', 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <ScreenHeader
          eyebrow="Movement"
          accent={colors.steps}
          title="Activity"
          subtitle={autoStepsActive ? `Goal ${goal.toLocaleString()} steps · auto-tracked` : `Goal ${goal.toLocaleString()} steps`}
        />

        <DailyArc
          label="Steps Today"
          icon="👣"
          value={todayCount.toLocaleString()}
          suffix={`/ ${goal.toLocaleString()}`}
          progress={todayCount / goal}
          color={colors.steps}
          trackColor={colors.line}
        />

        <View style={styles.grid}>
          <StatCard dotColor={colors.steps} label="Distance" value={estimateDistanceKm(todayCount)} unit="km" />
          <StatCard dotColor={colors.steps} label="Calories" value={estimateCaloriesFromSteps(todayCount)} unit="kcal" />
        </View>

        <View style={styles.pillRow}>
          <Pill label="+500" color={colors.steps} soft={colors.stepsSoft} onPress={() => addSteps(500)} />
          <Pill label="+1,000" color={colors.steps} soft={colors.stepsSoft} onPress={() => addSteps(1000)} />
          <Pill label="Custom" color={colors.steps} soft={colors.stepsSoft} onPress={() => setCustomOpen(true)} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>This week</Text>
          <WeekBars data={weekData} color={colors.steps} trackColor={colors.stepsSoft} />
        </Card>

      </ScrollView>

      <QuickAddSheet visible={customOpen} title="Log steps" onClose={() => setCustomOpen(false)}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Number of steps"
          placeholderTextColor={colors.inkFaint}
          value={customValue}
          onChangeText={setCustomValue}
          autoFocus
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submitCustom}>
          <Text style={styles.submitLabel}>Add</Text>
        </TouchableOpacity>
      </QuickAddSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  pillRow: { flexDirection: 'row', marginBottom: spacing.sm, marginHorizontal: -spacing.xs / 2 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
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
  submitBtn: { backgroundColor: colors.steps, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  submitLabel: { color: colors.bg, fontWeight: '800', fontSize: 14 },
});
