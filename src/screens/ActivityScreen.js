import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { isSameDay, sumByDay, todayKey } from '../utils/dateUtils';
import { estimateCaloriesFromSteps, estimateDistanceKm } from '../utils/healthCalculations';

// No workout-logging feature exists yet — this list is a static mockup of
// what it will show once built.
const RECENT_WORKOUTS = [
  { id: 'w1', icon: 'walk-outline', title: 'Morning Run', subtitle: '5.2 km · 32 min · 320 kcal', when: '2h ago' },
  { id: 'w2', icon: 'barbell-outline', title: 'HIIT Session', subtitle: '45 min · 480 kcal · High Intensity', when: 'Yesterday' },
  { id: 'w3', icon: 'footsteps-outline', title: 'Evening Walk', subtitle: '2.1 km · 25 min · 150 kcal', when: '2 days ago' },
];

export default function ActivityScreen() {
  const { profile, steps, addSteps, autoStepsActive } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const goal = profile?.goals?.stepsGoal || 10000;
  const today = todayKey();
  const todayCount = useMemo(
    () => steps.filter((e) => isSameDay(e.timestamp, today)).reduce((acc, e) => acc + e.count, 0),
    [steps, today]
  );
  const weekData = useMemo(() => sumByDay(steps, 7, 'count'), [steps]);
  const avgPerDay = useMemo(() => Math.round(weekData.reduce((acc, d) => acc + d.value, 0) / weekData.length), [weekData]);
  const movePct = Math.min(100, Math.round((avgPerDay / goal) * 100));

  const moveLabel =
    movePct >= 85 ? 'Peak Performance' : movePct >= 65 ? 'Active & Focused' : movePct >= 40 ? 'Building Momentum' : 'Just Getting Started';

  const calories = estimateCaloriesFromSteps(todayCount);
  const distanceKm = estimateDistanceKm(todayCount);

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addSteps(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.dangerGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Activity</Text>
            <Text style={styles.subtitle}>Track your daily momentum</Text>
          </View>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterPillText}>This Week</Text>
            <Ionicons name="chevron-down" size={14} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={movePct / 100}
            size={100}
            strokeWidth={10}
            color={colors.danger}
            trackColor={colors.line}
            centerValue={`${movePct}%`}
            centerLabel="Move"
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{moveLabel}</Text>
            <Text style={styles.heroDesc}>
              You have achieved {movePct}% of your weekly movement goal. Your cardio endurance is up 6% compared to last week.
            </Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.statTouchable} onPress={() => setCustomOpen(true)} activeOpacity={0.7}>
            <StatCard icon="footsteps" dotColor={colors.danger} label="Steps" value={todayCount.toLocaleString()} unit={`/${Math.round(goal / 1000)}k`} />
          </TouchableOpacity>
          <StatCard icon="flame" dotColor={colors.steps} label="Calories" value={calories} unit="kcal" />
          <StatCard icon="location" dotColor={colors.primary} label="Distance" value={distanceKm} unit="km" />
          <StatCard icon="flash" dotColor={colors.sleep} label="Active" value={47} unit="min" />
        </View>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Steps Trend</Text>
            <Text style={styles.caption}>Avg: {avgPerDay.toLocaleString()}/day</Text>
          </View>
          <Sparkline data={weekData.map((d) => d.value)} color={colors.danger} width={280} height={90} strokeWidth={2.5} dots />
          <View style={styles.axisRow}>
            {weekData.map((d) => (
              <Text key={d.key} style={styles.axisLabel}>{d.label}</Text>
            ))}
          </View>
        </Card>

        <Text style={styles.listHeading}>Recent Workouts</Text>
        {RECENT_WORKOUTS.map((w, i) => (
          <Card key={w.id} style={i === RECENT_WORKOUTS.length - 1 ? styles.lastCard : undefined}>
            <View style={styles.workoutRow}>
              <View style={[styles.workoutIcon, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name={w.icon} size={18} color={colors.danger} />
              </View>
              <View style={styles.workoutText}>
                <Text style={styles.workoutTitle}>{w.title}</Text>
                <Text style={styles.workoutSubtitle}>{w.subtitle}</Text>
              </View>
              <Text style={styles.workoutWhen}>{w.when}</Text>
            </View>
          </Card>
        ))}

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
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
    subtitle: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, fontWeight: '500' },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterPillText: { fontSize: 12.5, fontWeight: '700', color: colors.ink },

    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    heroDesc: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statTouchable: { flexBasis: '48%' },

    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    caption: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '600' },
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingHorizontal: 4 },
    axisLabel: { fontSize: 10, color: colors.inkSoft, fontWeight: '600' },

    listHeading: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.sm },
    lastCard: { marginBottom: spacing.xs },
    workoutRow: { flexDirection: 'row', alignItems: 'center' },
    workoutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    workoutText: { flex: 1 },
    workoutTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
    workoutSubtitle: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    workoutWhen: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

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
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  });
