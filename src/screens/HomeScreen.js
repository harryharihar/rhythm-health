import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import WeekBars from '../components/WeekBars';
import { useHealth } from '../store/healthStore';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { formatFriendlyDate, formatHoursMinutes, greeting, sumByDay } from '../utils/dateUtils';
import { estimateCaloriesFromSteps, estimateDistanceKm } from '../utils/healthCalculations';

// No heart-rate sensor or active-minutes tracking exists yet — these are
// static placeholder numbers purely for visual layout, not real readings.
const HEART_RATE_BPM = 72;
const HEART_RATE_RESTING = 62;
const HEART_RATE_TREND = [58, 60, 63, 68, 72, 75, 70, 66];
const ACTIVE_MINUTES = 47;

// Typical adult sleep-stage proportions, applied to the real logged total —
// the total is real data, the stage split is an estimate (no sleep-stage
// sensor exists), used only for the Sleep Analysis preview on Home.
const SLEEP_STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HomeScreen() {
  const { profile, todayTotals, steps, weight, addWater } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const goals = profile?.goals || { stepsGoal: 10000, waterGoalMl: 2500, sleepGoalHours: 8 };
  const initials = (profile?.name || '?').trim().slice(0, 2).toUpperCase();

  const overallProgress = useMemo(() => {
    const p1 = Math.min(1, todayTotals.stepsCount / goals.stepsGoal);
    const p2 = Math.min(1, todayTotals.waterMl / goals.waterGoalMl);
    const p3 = Math.min(1, todayTotals.sleepHours / goals.sleepGoalHours);
    return Math.round(((p1 + p2 + p3) / 3) * 100) / 100;
  }, [todayTotals, goals]);
  const scorePct = Math.round(overallProgress * 100);

  const vitalityLabel =
    scorePct >= 85 ? 'Excellent Vitality' : scorePct >= 65 ? 'Great Vitality' : scorePct >= 40 ? 'Good Vitality' : 'Building Momentum';

  const vitalityNote = useMemo(() => {
    if (todayTotals.sleepHours >= goals.sleepGoalHours) {
      return `You are ${scorePct}% of the way to your daily wellness goal. Clean sleep last night boosted your recovery.`;
    }
    if (todayTotals.waterMl >= goals.waterGoalMl) {
      return `You are ${scorePct}% of the way to your daily wellness goal. Hydration is on track today.`;
    }
    if (todayTotals.stepsCount >= goals.stepsGoal) {
      return `You are ${scorePct}% of the way to your daily wellness goal. You've already hit your step goal.`;
    }
    return `You are ${scorePct}% of the way to your daily wellness goal. Keep logging to build momentum.`;
  }, [scorePct, todayTotals, goals]);

  const weekSteps = useMemo(() => sumByDay(steps, 7, 'count'), [steps]);
  const dailyAvgPct = useMemo(() => {
    const avg = weekSteps.reduce((acc, d) => acc + d.value, 0) / weekSteps.length;
    return Math.round((avg / goals.stepsGoal) * 100);
  }, [weekSteps, goals]);

  const calories = estimateCaloriesFromSteps(todayTotals.stepsCount);
  const distanceKm = estimateDistanceKm(todayTotals.stepsCount);

  const sleepHours = todayTotals.sleepHours || 0;
  const sleepStages = sleepHours > 0
    ? {
        deep: sleepHours * SLEEP_STAGE_RATIOS.deep,
        light: sleepHours * SLEEP_STAGE_RATIOS.light,
        rem: sleepHours * SLEEP_STAGE_RATIOS.rem,
        awake: sleepHours * SLEEP_STAGE_RATIOS.awake,
      }
    : null;

  const fillPct = Math.max(0, Math.min(1, todayTotals.waterMl / goals.waterGoalMl));
  const waterLitres = (todayTotals.waterMl / 1000).toFixed(1);
  const waterGoalLitres = (goals.waterGoalMl / 1000).toFixed(1);

  const weightValues = useMemo(() => weight.slice(0, 7).slice().reverse().map((w) => w.weightKg), [weight]);
  const weightDelta = weightValues.length >= 2 ? weightValues[weightValues.length - 1] - weightValues[0] : null;
  const deltaColor = weightDelta == null ? colors.inkSoft : weightDelta < 0 ? colors.primary : weightDelta > 0 ? colors.steps : colors.inkSoft;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.primaryGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()}{profile?.name ? `, ${profile.name}` : ''}</Text>
            <Text style={styles.date}>{formatFriendlyDate()}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={overallProgress}
            size={100}
            strokeWidth={10}
            color={colors.primary}
            trackColor={colors.line}
            centerValue={`${scorePct}%`}
            centerLabel="Score"
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{vitalityLabel}</Text>
            <Text style={styles.heroDesc}>{vitalityNote}</Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard icon="footsteps" dotColor={colors.danger} label="Steps" value={todayTotals.stepsCount.toLocaleString()} unit={`/${Math.round(goals.stepsGoal / 1000)}k`} />
          <StatCard icon="flame" dotColor={colors.steps} label="Calories" value={calories} unit="kcal" />
          <StatCard icon="location" dotColor={colors.primary} label="Distance" value={distanceKm} unit="km" />
          <StatCard icon="flash" dotColor={colors.sleep} label="Active" value={ACTIVE_MINUTES} unit="min" />
        </View>

        <Card>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="heart" size={16} color={colors.danger} />
              <Text style={styles.sectionTitle}>Heart Rate</Text>
            </View>
            <Text style={styles.caption}>Resting: {HEART_RATE_RESTING}</Text>
          </View>
          <View style={styles.heartRow}>
            <Text style={styles.heartValue}>
              {HEART_RATE_BPM} <Text style={styles.heartUnit}>BPM</Text>
            </Text>
            <Sparkline data={HEART_RATE_TREND} color={colors.danger} width={130} height={40} strokeWidth={2} />
          </View>
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <Text style={styles.caption}>Daily Average: <Text style={{ fontWeight: '800', color: colors.ink }}>{dailyAvgPct}%</Text></Text>
          </View>
          <WeekBars data={weekSteps} color={colors.steps} trackColor={colors.stepsSoft} height={90} />
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="moon" size={16} color={colors.sleep} />
              <Text style={styles.sectionTitle}>Sleep Analysis</Text>
            </View>
            <Text style={styles.caption}>{formatHoursMinutes(sleepHours)}</Text>
          </View>
          {sleepStages ? (
            <>
              <View style={styles.sleepBar}>
                <View style={[styles.sleepSeg, { flex: sleepStages.deep, backgroundColor: colors.sleep }]} />
                <View style={[styles.sleepSeg, { flex: sleepStages.light, backgroundColor: withAlpha(colors.sleep, 0.5) }]} />
                <View style={[styles.sleepSeg, { flex: sleepStages.rem, backgroundColor: colors.water }]} />
                <View style={[styles.sleepSeg, { flex: sleepStages.awake, backgroundColor: colors.danger }]} />
              </View>
              <View style={styles.sleepLegend}>
                <SleepLegendItem styles={styles} color={colors.sleep} label="Deep" value={formatHoursMinutes(sleepStages.deep)} />
                <SleepLegendItem styles={styles} color={withAlpha(colors.sleep, 0.5)} label="Light" value={formatHoursMinutes(sleepStages.light)} />
                <SleepLegendItem styles={styles} color={colors.water} label="REM" value={formatHoursMinutes(sleepStages.rem)} />
                <SleepLegendItem styles={styles} color={colors.danger} label="Awake" value={formatHoursMinutes(sleepStages.awake)} />
              </View>
            </>
          ) : (
            <Text style={styles.empty}>No sleep logged yet — log last night in the Sleep tab.</Text>
          )}
        </Card>

        <View style={styles.bottomRow}>
          <Card style={styles.bottomCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Water Intake</Text>
              <Ionicons name="water" size={16} color={colors.water} />
            </View>
            <View style={styles.waterRow}>
              <RingGauge progress={fillPct} size={56} strokeWidth={6} color={colors.water} trackColor={colors.waterSoft} />
              <View style={styles.waterText}>
                <Text style={styles.bigValue}>{waterLitres} L</Text>
                <Text style={styles.caption}>Goal: {waterGoalLitres}L</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => addWater(250)}>
              <Text style={styles.addBtnLabel}>+ Add 250ml</Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.bottomCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Weight Trend</Text>
              {weightDelta != null ? (
                <Text style={[styles.caption, { color: deltaColor, fontWeight: '800' }]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                </Text>
              ) : null}
            </View>
            <Text style={styles.bigValue}>{todayTotals.latestWeight ?? '—'} kg</Text>
            <Text style={styles.caption}>Last 7 logs</Text>
            {weightValues.length >= 2 ? (
              <View style={styles.sparklineWrap}>
                <Sparkline data={weightValues} color={colors.primary} width={130} height={34} strokeWidth={2} />
              </View>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function SleepLegendItem({ styles, color, label, value }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
    greeting: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
    date: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, fontWeight: '500' },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.onAccent, fontWeight: '800', fontSize: 15 },

    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    heroDesc: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    caption: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '600' },

    heartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heartValue: { fontSize: 28, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    heartUnit: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },

    sleepBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
    sleepSeg: { height: '100%' },
    sleepLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendLabel: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
    legendValue: { fontSize: 11, color: colors.ink, fontWeight: '700' },
    empty: { fontSize: 13, color: colors.inkSoft },

    bottomRow: { flexDirection: 'row', gap: spacing.md },
    bottomCard: { flex: 1 },
    waterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    waterText: { flex: 1 },
    bigValue: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: spacing.xs },
    addBtn: {
      backgroundColor: colors.waterSoft,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    addBtnLabel: { color: colors.water, fontWeight: '700', fontSize: 12.5 },
    sparklineWrap: { marginTop: spacing.sm },
  });
