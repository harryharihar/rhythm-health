import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { useHealthKitData } from '../health/useHealthKitData';
import { radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { dayBuckets, formatRelativeTime, isSameDay, monthBuckets, sumByBuckets, todayKey, weekBuckets } from '../utils/dateUtils';
import {
  estimateCaloriesFromSteps,
  estimateCaloriesPerKm,
  estimateDistanceKm,
  estimateWorkoutCalories,
  groupWorkoutsByType,
  iconForType,
  WORKOUT_MET,
  WORKOUT_TYPES,
} from '../utils/healthCalculations';
import { LABELS } from '../constants/labels';

// Each range computes its own buckets (day/week/month granularity — a full
// year as 365 daily points would be unreadable) plus how many real days it
// spans, so the "Avg/day" figure stays accurate regardless of bucket size.
const RANGE_OPTIONS = [
  { key: 'week', label: LABELS.activity.rangeThisWeek, icon: 'today-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 0, 'narrow') },
  { key: 'lastWeek', label: LABELS.activity.rangeLastWeek, icon: 'arrow-undo-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 7, 'narrow') },
  { key: '2weeks', label: LABELS.activity.range2Weeks, icon: 'calendar-outline', totalDays: 14, getBuckets: () => dayBuckets(14, 0, 'narrow') },
  { key: 'month', label: LABELS.activity.range1Month, icon: 'calendar-number-outline', totalDays: 30, getBuckets: () => weekBuckets(4) },
  { key: '3months', label: LABELS.activity.range3Months, icon: 'calendar-clear-outline', totalDays: 91, getBuckets: () => monthBuckets(3) },
  { key: '6months', label: LABELS.activity.range6Months, icon: 'stats-chart-outline', totalDays: 182, getBuckets: () => monthBuckets(6) },
  { key: '9months', label: LABELS.activity.range9Months, icon: 'bar-chart-outline', totalDays: 273, getBuckets: () => monthBuckets(9) },
  { key: 'year', label: LABELS.activity.range1Year, icon: 'trending-up-outline', totalDays: 365, getBuckets: () => monthBuckets(12) },
];

// Rough daily target used only to score the "Move" ring once real workouts
// exist — matches common general-activity guidance (~30 active min/day).
const ACTIVE_MINUTES_GOAL = 30;

function workoutSubtitle(w) {
  const parts = [];
  if (w.distanceKm) parts.push(`${w.distanceKm} km`);
  if (w.durationMin) parts.push(`${w.durationMin} min`);
  if (w.caloriesKcal) parts.push(`${w.caloriesKcal} kcal`);
  return parts.join(' · ') || '—';
}

export default function ActivityScreen() {
  const { profile, steps, workouts, todayTotals, addSteps, addWorkout, autoStepsActive } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hk = useHealthKitData();
  const activeMinutes = hk.exerciseMinutes ?? todayTotals.activeMinutes;
  const bodyWeightKg = todayTotals.latestWeight || 70;
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState(WORKOUT_TYPES[0].label);
  const [durationInput, setDurationInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [rangeKey, setRangeKey] = useState('week');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [sheetView, setSheetView] = useState('form');

  // Live clock in the header — ticks every 30s so the displayed minute is
  // never more than 30s stale, well within "updates like a timer."
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const nowDateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const nowTimeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const goal = profile?.goals?.stepsGoal || 10000;
  const today = todayKey();
  const todayCount = useMemo(
    () => steps.filter((e) => isSameDay(e.timestamp, today)).reduce((acc, e) => acc + e.count, 0),
    [steps, today]
  );

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[0];
  const chartData = useMemo(() => sumByBuckets(steps, range.getBuckets(), 'count'), [steps, rangeKey]);
  const avgPerDay = useMemo(
    () => Math.round(chartData.reduce((acc, d) => acc + d.value, 0) / range.totalDays),
    [chartData, range.totalDays]
  );
  // Active-minutes trend over the same range/buckets as steps, so the two are
  // directly comparable when blending the Move score below.
  const activeChartData = useMemo(() => sumByBuckets(workouts, range.getBuckets(), 'durationMin'), [workouts, rangeKey]);
  const avgActiveMinPerDay = useMemo(
    () => Math.round(activeChartData.reduce((acc, d) => acc + d.value, 0) / range.totalDays),
    [activeChartData, range.totalDays]
  );
  const hasWorkoutsInRange = activeChartData.some((d) => d.value > 0);

  const stepsPct = Math.min(100, Math.round((avgPerDay / goal) * 100));
  const activePct = Math.min(100, Math.round((avgActiveMinPerDay / ACTIVE_MINUTES_GOAL) * 100));
  // Steps-only users are scored purely on their step goal, unchanged from
  // before. Once workouts exist in the range, the score credits whichever of
  // steps-progress or active-minutes-progress is stronger, so logging a
  // workout can actually move the needle instead of being invisible here.
  const movePct = hasWorkoutsInRange ? Math.max(stepsPct, activePct) : stepsPct;

  const moveLabel =
    movePct >= 85 ? LABELS.activity.movePeak : movePct >= 65 ? LABELS.activity.moveActive : movePct >= 40 ? LABELS.activity.moveBuilding : LABELS.activity.moveStarting;

  const stepsCaloriesToday = estimateCaloriesFromSteps(todayCount);
  const workoutCaloriesToday = todayTotals.workoutCaloriesKcal || 0;
  const calories = stepsCaloriesToday + workoutCaloriesToday;

  const stepsDistanceToday = estimateDistanceKm(todayCount);
  const workoutDistanceToday = todayTotals.workoutDistanceKm || 0;
  const distanceKm = Math.round((stepsDistanceToday + workoutDistanceToday) * 10) / 10;

  // Each logged type (Run, Cycle, ...) kept as its own row — steps stay a
  // separate "auto" row since those come from the pedometer, not a log entry.
  const workoutsByTypeToday = useMemo(() => groupWorkoutsByType(todayTotals.todayWorkouts), [todayTotals.todayWorkouts]);
  // Short "which sources contributed" hint on the card itself — exact
  // per-type numbers live in the Today's Breakdown card below, so this stays
  // brief enough to never truncate.
  const caloriesCaption = workoutCaloriesToday > 0 ? `Steps + ${workoutsByTypeToday.map((w) => w.type).join(', ')}` : null;
  const distanceCaption =
    workoutDistanceToday > 0 ? `Steps + ${workoutsByTypeToday.filter((w) => w.distanceKm > 0).map((w) => w.type).join(', ')}` : null;

  // "Recent Workouts" only reads correctly when the range is "This Week" —
  // once the user picks an older period, the list (and its title) need to
  // scope to that same period instead of always showing the latest overall.
  const rangeWorkouts = useMemo(() => {
    const buckets = range.getBuckets();
    if (!buckets.length) return workouts;
    const start = buckets[0].start.getTime();
    const end = buckets[buckets.length - 1].end.getTime();
    return workouts.filter((w) => {
      const t = new Date(w.timestamp).getTime();
      return t >= start && t < end;
    });
  }, [workouts, rangeKey]);
  const recentWorkouts = useMemo(() => rangeWorkouts.slice(0, 8), [rangeWorkouts]);

  const workoutDurationMin = Number(durationInput) || 0;
  const estWorkoutCalories = useMemo(
    () => estimateWorkoutCalories(workoutType, workoutDurationMin, bodyWeightKg),
    [workoutType, workoutDurationMin, bodyWeightKg]
  );

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addSteps(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  const resetWorkoutForm = () => {
    setWorkoutType(WORKOUT_TYPES[0].label);
    setDurationInput('');
    setDistanceInput('');
    setSheetView('form');
  };

  const submitWorkout = () => {
    const durationMin = Number(durationInput);
    if (!(durationMin > 0)) return;
    addWorkout({
      type: workoutType,
      durationMin,
      caloriesKcal: estimateWorkoutCalories(workoutType, durationMin, bodyWeightKg),
      distanceKm: distanceInput ? Number(distanceInput) : null,
    });
    resetWorkoutForm();
    setWorkoutOpen(false);
  };

  const maxMet = useMemo(() => Math.max(...Object.values(WORKOUT_MET)), []);
  const calorieChartRows = useMemo(
    () =>
      WORKOUT_TYPES.map((t) => ({
        ...t,
        met: WORKOUT_MET[t.label],
        per30Min: estimateWorkoutCalories(t.label, 30, bodyWeightKg),
        perKm: estimateCaloriesPerKm(t.label, bodyWeightKg),
      })),
    [bodyWeightKg]
  );

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.stepsGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{LABELS.activity.title}</Text>
            <Text style={styles.subtitle}>{LABELS.activity.subtitle}</Text>
          </View>
          <View style={styles.liveClock}>
            <Text style={styles.liveClockLabel}>{LABELS.activity.today}</Text>
            <Text style={styles.liveClockTime}>{nowTimeLabel}</Text>
            <Text style={styles.liveClockDate}>{nowDateLabel}</Text>
          </View>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={movePct / 100}
            size={100}
            strokeWidth={10}
            color={colors.steps}
            trackColor={colors.line}
            centerValue={`${movePct}%`}
            centerLabel={LABELS.activity.move}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{moveLabel}</Text>
            <Text style={styles.heroDesc}>
              {hasWorkoutsInRange
                ? LABELS.activity.heroDescWithWorkouts
                    .replace('{steps}', avgPerDay.toLocaleString())
                    .replace('{activeMin}', avgActiveMinPerDay)
                    .replace('{range}', range.label.toLowerCase())
                    .replace('{pct}', movePct)
                : LABELS.activity.heroDescStepsOnly.replace('{pct}', movePct).replace('{range}', range.label.toLowerCase())}
            </Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard
            icon="footsteps"
            dotColor={colors.steps}
            label={LABELS.home.steps}
            value={todayCount.toLocaleString()}
            unit={`/${Math.round(goal / 1000)}k`}
            caption={LABELS.home.autoTracked}
            onPress={() => setCustomOpen(true)}
          />
          <StatCard icon="flame" dotColor={colors.primary} label={LABELS.home.calories} value={calories} unit="kcal" caption={caloriesCaption} />
          <StatCard icon="location" dotColor={colors.water} label={LABELS.home.distance} value={distanceKm} unit="km" caption={distanceCaption} />
          <StatCard
            icon="flash"
            dotColor={colors.sleep}
            label={LABELS.home.active}
            value={activeMinutes}
            unit="min"
            caption={workoutsByTypeToday.length ? workoutsByTypeToday.map((w) => w.type).join(', ') : null}
            onPress={() => setWorkoutOpen(true)}
          />
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
                {todayCount.toLocaleString()} steps · {stepsDistanceToday} km · {stepsCaloriesToday} kcal
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

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{LABELS.activity.stepsTrend}</Text>
            <TouchableOpacity style={styles.filterPill} onPress={() => setRangeOpen(true)}>
              <Text style={styles.filterPillText}>{range.label}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>{LABELS.activity.avgPerDay.replace('{avg}', avgPerDay.toLocaleString())}</Text>
          <Sparkline data={chartData.map((d) => d.value)} color={colors.steps} width={280} height={90} strokeWidth={2.5} dots />
          <View style={styles.axisRow}>
            {chartData.map((d) => (
              <Text key={d.key} style={styles.axisLabel} numberOfLines={1}>{d.label}</Text>
            ))}
          </View>
        </Card>

        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.listHeading}>{LABELS.activity.workouts}</Text>
            <Text style={styles.caption}>{range.label}</Text>
          </View>
          <TouchableOpacity
            style={[styles.logBtn, rangeKey !== 'week' && styles.logBtnDisabled]}
            onPress={() => setWorkoutOpen(true)}
            disabled={rangeKey !== 'week'}
          >
            <Ionicons name="add" size={14} color={rangeKey !== 'week' ? colors.inkFaint : colors.steps} />
            <Text style={[styles.logBtnText, rangeKey !== 'week' && styles.logBtnTextDisabled]}>{LABELS.activity.logWorkout}</Text>
          </TouchableOpacity>
        </View>
        {rangeKey !== 'week' && (
          <View style={styles.rangeNoteRow}>
            <Ionicons name="information-circle-outline" size={12} color={colors.inkSoft} />
            <Text style={styles.rangeNoteText}>{LABELS.activity.rangeNote}</Text>
          </View>
        )}
        {recentWorkouts.length === 0 ? (
          <Card>
            <Text style={styles.empty}>
              {rangeKey === 'week'
                ? LABELS.activity.emptyWorkoutsWeek
                : LABELS.activity.emptyWorkoutsRange.replace('{range}', range.label.toLowerCase())}
            </Text>
          </Card>
        ) : (
          recentWorkouts.map((w, i) => (
            <Card key={w.id} style={i === recentWorkouts.length - 1 ? styles.lastCard : undefined}>
              <View style={styles.workoutRow}>
                <View style={[styles.workoutIcon, { backgroundColor: colors.stepsSoft }]}>
                  <Ionicons name={iconForType(w.type)} size={18} color={colors.steps} />
                </View>
                <View style={styles.workoutText}>
                  <Text style={styles.workoutTitle}>{w.type}</Text>
                  <Text style={styles.workoutSubtitle}>{workoutSubtitle(w)}</Text>
                </View>
                <Text style={styles.workoutWhen}>{formatRelativeTime(w.timestamp)}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <QuickAddSheet visible={customOpen} title={LABELS.activity.logStepsTitle} onClose={() => setCustomOpen(false)}>
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.activity.entriesRecordedToday}</Text>
        </View>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder={LABELS.activity.stepsPlaceholder}
          placeholderTextColor={colors.inkFaint}
          value={customValue}
          onChangeText={setCustomValue}
          autoFocus
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submitCustom}>
          <Text style={styles.submitLabel}>{LABELS.activity.add}</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <QuickAddSheet
        visible={workoutOpen}
        title={sheetView === 'form' ? LABELS.activity.logWorkoutTitle : sheetView === 'types' ? LABELS.activity.workoutTypesTitle : LABELS.activity.calorieEstimateTitle}
        onClose={() => { resetWorkoutForm(); setWorkoutOpen(false); }}
      >
        {sheetView !== 'form' && (
          <TouchableOpacity style={styles.backRow} onPress={() => setSheetView('form')} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={colors.steps} />
            <Text style={styles.backLabel}>{LABELS.activity.back}</Text>
          </TouchableOpacity>
        )}

        {sheetView === 'form' && (
          <>
            <View style={styles.sheetInfoRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
              <Text style={styles.sheetInfoText}>{LABELS.activity.entriesRecordedToday}</Text>
            </View>

            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, styles.fieldLabelNoMargin]}>{LABELS.activity.type}</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setSheetView('types');
                }}
                hitSlop={8}
              >
                <Ionicons name="information-circle-outline" size={15} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
            <View style={styles.typePicker}>
              {WORKOUT_TYPES.map((t) => {
                const active = workoutType === t.label;
                return (
                  <TouchableOpacity
                    key={t.label}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setWorkoutType(t.label)}
                  >
                    <View style={[styles.typeChipIconWrap, active && styles.typeChipIconWrapActive]}>
                      <Ionicons name={t.icon} size={16} color={active ? colors.onAccent : colors.steps} />
                    </View>
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>{LABELS.activity.duration}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="time-outline" size={16} color={colors.steps} />
              </View>
              <TextInput
                style={styles.inputField}
                keyboardType="number-pad"
                placeholder={LABELS.activity.durationPlaceholder}
                placeholderTextColor={colors.inkFaint}
                value={durationInput}
                onChangeText={setDurationInput}
                autoFocus
              />
              <Text style={styles.inputSuffix}>{LABELS.activity.minSuffix}</Text>
            </View>

            <View style={styles.calorieCard}>
              <View style={styles.calorieIconWrap}>
                <Ionicons name="flame" size={18} color={colors.steps} />
              </View>
              <View style={styles.calorieTextWrap}>
                <Text style={styles.calorieValue}>{workoutDurationMin > 0 ? estWorkoutCalories : '—'} kcal</Text>
                <Text style={styles.calorieCaption}>{LABELS.activity.autoEstimatedCaption}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setSheetView('calories');
                }}
                hitSlop={8}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.steps} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{LABELS.activity.distanceOptional}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="location-outline" size={16} color={colors.steps} />
              </View>
              <TextInput
                style={styles.inputField}
                keyboardType="decimal-pad"
                placeholder={LABELS.activity.distancePlaceholder}
                placeholderTextColor={colors.inkFaint}
                value={distanceInput}
                onChangeText={setDistanceInput}
              />
              <Text style={styles.inputSuffix}>{LABELS.activity.kmSuffix}</Text>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={submitWorkout}>
              <Text style={styles.submitLabel}>{LABELS.activity.save}</Text>
            </TouchableOpacity>
          </>
        )}

        {sheetView === 'types' &&
          WORKOUT_TYPES.map((t) => (
            <View key={t.label} style={styles.typeInfoRow}>
              <View style={styles.typeInfoIconWrap}>
                <Ionicons name={t.icon} size={16} color={colors.steps} />
              </View>
              <View style={styles.typeInfoTextWrap}>
                <Text style={styles.typeInfoLabel}>{t.label}</Text>
                <Text style={styles.typeInfoDesc}>{t.desc}</Text>
              </View>
            </View>
          ))}

        {sheetView === 'calories' && (
          <>
            <View style={styles.sheetInfoRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
              <Text style={styles.sheetInfoText}>
                {LABELS.activity.calorieFormulaIntro}{' '}
                {todayTotals.latestWeight
                  ? LABELS.activity.calorieFormulaWithWeight.replace('{weight}', Math.round(todayTotals.latestWeight))
                  : LABELS.activity.calorieFormulaDefaultWeight}
              </Text>
            </View>
            {calorieChartRows.map((row) => (
              <View key={row.label} style={styles.metRow}>
                <View style={styles.metRowHead}>
                  <View style={styles.metIconWrap}>
                    <Ionicons name={row.icon} size={14} color={colors.steps} />
                  </View>
                  <Text style={styles.metLabel}>{row.label}</Text>
                  <Text style={styles.metValue}>~{row.per30Min} kcal / 30min</Text>
                </View>
                <View style={styles.metBarTrack}>
                  <View style={[styles.metBarFill, { width: `${(row.met / maxMet) * 100}%` }]} />
                </View>
                <Text style={styles.metSubValue}>
                  MET {row.met}{row.perKm ? ` · ${LABELS.activity.perKmAtPace.replace('{perKm}', row.perKm)}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </QuickAddSheet>

      <QuickAddSheet
        visible={rangeOpen}
        title={LABELS.activity.timePeriodTitle}
        accentColor={colors.steps}
        options={RANGE_OPTIONS.map((r) => ({ label: r.label, icon: r.icon, active: r.key === rangeKey, onPress: () => setRangeKey(r.key) }))}
        onClose={() => setRangeOpen(false)}
      >
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.activity.timePeriodInfo}</Text>
        </View>
      </QuickAddSheet>
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
    liveClock: { alignItems: 'flex-end' },
    liveClockLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.inkSoft },
    liveClockTime: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
    liveClockDate: { fontSize: 11.5, fontWeight: '500', color: colors.inkSoft, marginTop: 1 },

    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    heroDesc: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
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
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingHorizontal: 4 },
    axisLabel: { fontSize: 10, color: colors.inkSoft, fontWeight: '600' },

    listHeading: { fontSize: 16, fontWeight: '800', color: colors.ink },
    logBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.stepsSoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    logBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.steps },
    logBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    logBtnTextDisabled: { color: colors.inkFaint },
    rangeNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
    rangeNoteText: { fontSize: 11, fontWeight: '500', color: colors.inkSoft, flexShrink: 1 },
    empty: { fontSize: 13, color: colors.inkSoft },
    lastCard: { marginBottom: spacing.xs },
    workoutRow: { flexDirection: 'row', alignItems: 'center' },
    workoutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    workoutText: { flex: 1 },
    workoutTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
    workoutSubtitle: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    workoutWhen: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

    sheetInfoRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 6, marginBottom: spacing.md },
    sheetInfoText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '500', flexShrink: 1 },
    typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    typeChip: {
      flexBasis: '31%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    typeChipActive: {
      backgroundColor: `${colors.steps}1A`,
      borderWidth: 1.5,
      borderColor: colors.steps,
      shadowColor: colors.steps,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 0,
    },
    typeChipIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.stepsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    typeChipIconWrapActive: { backgroundColor: colors.steps },
    typeChipText: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
    typeChipTextActive: { color: colors.steps, fontWeight: '700' },

    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabelNoMargin: { marginBottom: 0 },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
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
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      marginBottom: spacing.md,
    },
    inputIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.stepsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    inputField: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.ink,
    },
    inputSuffix: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.inkSoft,
      marginLeft: 6,
    },
    calorieCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.stepsSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.steps,
      padding: 12,
      marginBottom: spacing.md,
    },
    calorieIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    calorieTextWrap: { flex: 1 },
    calorieValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
    calorieCaption: { fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginTop: 1 },
    submitBtn: { backgroundColor: colors.steps, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },

    metRow: { marginBottom: spacing.md },
    metRowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    metIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.stepsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    metLabel: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.ink },
    metValue: { fontSize: 12.5, fontWeight: '700', color: colors.steps },
    metBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 4 },
    metBarFill: { height: '100%', borderRadius: 3, backgroundColor: colors.steps },
    metSubValue: { fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginLeft: 32 },

    typeInfoRow: { flexDirection: 'row', marginBottom: spacing.md },
    typeInfoIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.stepsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    typeInfoTextWrap: { flex: 1 },
    typeInfoLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginBottom: 2 },
    typeInfoDesc: { fontSize: 12, fontWeight: '500', color: colors.inkSoft, lineHeight: 17 },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
    backLabel: { fontSize: 14, fontWeight: '700', color: colors.steps },
  });
