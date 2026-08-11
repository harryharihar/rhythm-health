import React, { useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import WeekBars from '../components/WeekBars';
import { useHealth } from '../store/healthStore';
import { useHealthKitData } from '../health/useHealthKitData';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { formatFriendlyDate, formatHoursMinutes, greeting, sumByDay } from '../utils/dateUtils';
import { estimateCaloriesFromSteps, estimateDistanceKm, groupWorkoutsByType, iconForType } from '../utils/healthCalculations';
import { LABELS } from '../constants/labels';

const HEART_RATE_INFO = Platform.OS === 'ios' ? LABELS.home.heartRateInfoIOS : LABELS.home.heartRateInfoAndroid;

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
  const hk = useHealthKitData();

  const heartRateAvailable = hk.heartRate?.bpm != null;
  const activeMinutes = hk.exerciseMinutes ?? todayTotals.activeMinutes;

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
    scorePct >= 85 ? LABELS.home.vitalityExcellent : scorePct >= 65 ? LABELS.home.vitalityGreat : scorePct >= 40 ? LABELS.home.vitalityGood : LABELS.home.vitalityBuilding;

  const vitalityNote = useMemo(() => {
    const base = LABELS.home.vitalityNoteBase.replace('{pct}', scorePct);
    if (todayTotals.sleepHours >= goals.sleepGoalHours) return `${base} ${LABELS.home.vitalityReasonSleep}`;
    if (todayTotals.waterMl >= goals.waterGoalMl) return `${base} ${LABELS.home.vitalityReasonWater}`;
    if (todayTotals.stepsCount >= goals.stepsGoal) return `${base} ${LABELS.home.vitalityReasonSteps}`;
    return `${base} ${LABELS.home.vitalityReasonDefault}`;
  }, [scorePct, todayTotals, goals]);

  const weekSteps = useMemo(() => sumByDay(steps, 7, 'count'), [steps]);
  const dailyAvgPct = useMemo(() => {
    const avg = weekSteps.reduce((acc, d) => acc + d.value, 0) / weekSteps.length;
    return Math.round((avg / goals.stepsGoal) * 100);
  }, [weekSteps, goals]);

  const stepsCaloriesToday = estimateCaloriesFromSteps(todayTotals.stepsCount);
  const workoutCaloriesToday = todayTotals.workoutCaloriesKcal || 0;
  const calories = stepsCaloriesToday + workoutCaloriesToday;

  const stepsDistanceToday = estimateDistanceKm(todayTotals.stepsCount);
  const workoutDistanceToday = todayTotals.workoutDistanceKm || 0;
  const distanceKm = Math.round((stepsDistanceToday + workoutDistanceToday) * 10) / 10;

  const workoutsByTypeToday = useMemo(() => groupWorkoutsByType(todayTotals.todayWorkouts), [todayTotals.todayWorkouts]);
  const caloriesCaption = workoutCaloriesToday > 0 ? `Steps + ${workoutsByTypeToday.map((w) => w.type).join(', ')}` : null;
  const distanceCaption =
    workoutDistanceToday > 0 ? `Steps + ${workoutsByTypeToday.filter((w) => w.distanceKm > 0).map((w) => w.type).join(', ')}` : null;

  const sleepHours = todayTotals.sleepHours || 0;
  const sleepStages = hk.sleepStages
    ? { deep: hk.sleepStages.deepHours, light: hk.sleepStages.lightHours, rem: hk.sleepStages.remHours, awake: hk.sleepStages.awakeHours }
    : sleepHours > 0
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
          <View style={styles.headerTextWrap}>
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
            centerLabel={LABELS.home.score}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{vitalityLabel}</Text>
            <Text style={styles.heroDesc}>{vitalityNote}</Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard icon="footsteps" dotColor={colors.danger} label={LABELS.home.steps} value={todayTotals.stepsCount.toLocaleString()} unit={`/${Math.round(goals.stepsGoal / 1000)}k`} caption={LABELS.home.autoTracked} />
          <StatCard icon="flame" dotColor={colors.steps} label={LABELS.home.calories} value={calories} unit="kcal" caption={caloriesCaption} />
          <StatCard icon="location" dotColor={colors.primary} label={LABELS.home.distance} value={distanceKm} unit="km" caption={distanceCaption} />
          <StatCard icon="flash" dotColor={colors.sleep} label={LABELS.home.active} value={activeMinutes} unit="min" caption={workoutsByTypeToday.length ? workoutsByTypeToday.map((w) => w.type).join(', ') : null} />
        </View>

        {todayTotals.todayWorkouts.length > 0 && (
          <Card>
            <Text style={styles.breakdownTitle}>{LABELS.home.todaysBreakdown}</Text>
            <View style={styles.breakdownRow}>
              <View style={[styles.breakdownIcon, { backgroundColor: colors.stepsSoft }]}>
                <Ionicons name="footsteps-outline" size={16} color={colors.steps} />
              </View>
              <Text style={styles.breakdownLabel}>{LABELS.home.steps}</Text>
              <Text style={styles.breakdownAutoTag}>{LABELS.home.auto}</Text>
              <Text style={styles.breakdownValue}>
                {todayTotals.stepsCount.toLocaleString()} steps · {stepsDistanceToday} km · {stepsCaloriesToday} kcal
              </Text>
            </View>
            {workoutsByTypeToday.map((w) => (
              <View key={w.type} style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: colors.stepsSoft }]}>
                  <Ionicons name={iconForType(w.type)} size={16} color={colors.steps} />
                </View>
                <Text style={styles.breakdownLabel}>{w.type}</Text>
                <Text style={styles.breakdownValue}>
                  {w.durationMin} min{w.distanceKm > 0 ? ` · ${w.distanceKm} km` : ''} · {w.caloriesKcal} kcal
                </Text>
              </View>
            ))}
          </Card>
        )}

        {heartRateAvailable && (
          <Card>
            <View style={styles.cardHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="heart" size={16} color={colors.danger} />
                <Text style={styles.sectionTitle}>{LABELS.home.heartRateTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert(LABELS.home.heartRateInfoTitle, HEART_RATE_INFO)} hitSlop={8}>
                <Ionicons name="information-circle-outline" size={18} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
            <View style={styles.heartRow}>
              <Text style={styles.heartValue}>
                {hk.heartRate.bpm} <Text style={styles.heartUnit}>{LABELS.home.bpm}</Text>
              </Text>
              <Text style={styles.caption}>{LABELS.home.resting}: {hk.heartRate.restingBpm ?? '—'}</Text>
            </View>
            <Text style={styles.sourceCaption}>{LABELS.home.syncedFromAppleHealth}</Text>
          </Card>
        )}

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{LABELS.home.weeklyActivity}</Text>
            <Text style={styles.caption}>{LABELS.home.dailyAverage}: <Text style={{ fontWeight: '800', color: colors.ink }}>{dailyAvgPct}%</Text></Text>
          </View>
          <WeekBars data={weekSteps} color={colors.steps} trackColor={colors.stepsSoft} height={90} />
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="moon" size={16} color={colors.sleep} />
              <Text style={styles.sectionTitle}>{LABELS.home.sleepAnalysis}</Text>
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
                <SleepLegendItem styles={styles} color={colors.sleep} label={LABELS.home.stageDeep} value={formatHoursMinutes(sleepStages.deep)} />
                <SleepLegendItem styles={styles} color={withAlpha(colors.sleep, 0.5)} label={LABELS.home.stageLight} value={formatHoursMinutes(sleepStages.light)} />
                <SleepLegendItem styles={styles} color={colors.water} label={LABELS.home.stageRem} value={formatHoursMinutes(sleepStages.rem)} />
                <SleepLegendItem styles={styles} color={colors.danger} label={LABELS.home.stageAwake} value={formatHoursMinutes(sleepStages.awake)} />
              </View>
            </>
          ) : (
            <Text style={styles.empty}>{LABELS.home.noSleepLogged}</Text>
          )}
        </Card>

        <View style={styles.bottomRow}>
          <Card style={styles.bottomCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>{LABELS.home.waterIntake}</Text>
              <Ionicons name="water" size={16} color={colors.water} />
            </View>
            <View style={styles.waterRow}>
              <RingGauge progress={fillPct} size={56} strokeWidth={6} color={colors.water} trackColor={colors.waterSoft} />
              <View style={styles.waterText}>
                <Text style={styles.bigValue}>{waterLitres} L</Text>
                <Text style={styles.caption}>{LABELS.home.goal}: {waterGoalLitres}L</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => addWater(250)}>
              <Text style={styles.addBtnLabel}>{LABELS.home.addQuick250}</Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.bottomCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>{LABELS.home.weightTrend}</Text>
              {weightDelta != null ? (
                <Text style={[styles.caption, { color: deltaColor, fontWeight: '800' }]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                </Text>
              ) : null}
            </View>
            <Text style={styles.bigValue}>{todayTotals.latestWeight ?? '—'} kg</Text>
            <Text style={styles.caption}>{LABELS.home.last7Logs}</Text>
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
    headerTextWrap: { flex: 1, marginRight: spacing.md },
    greeting: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
    date: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, fontWeight: '500' },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
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
    breakdownTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    breakdownIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    breakdownLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginRight: 6 },
    breakdownAutoTag: {
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.inkSoft,
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: 'hidden',
    },
    breakdownValue: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.inkSoft, textAlign: 'right' },
    caption: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '600' },

    heartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heartValue: { fontSize: 28, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    heartUnit: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
    sourceCaption: { fontSize: 10.5, color: colors.inkFaint, fontWeight: '600', marginTop: 6 },

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
