import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import Card from '../components/Card';
import QuickAddSheet from '../components/QuickAddSheet';
import InfoModal from '../components/InfoModal';
import { useHealth } from '../store/healthStore';
import { useHealthKitData } from '../health/useHealthKitData';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import {
  bedtimeOptions,
  clockDiffMinutes,
  formatClockLabel,
  formatHoursMinutes,
  hoursBetweenClockTimes,
  sumByDay,
  wakeTimeOptions,
} from '../utils/dateUtils';
import { LABELS } from '../constants/labels';

const QUALITY = LABELS.sleep.quality;

// No sleep-stage sensor exists — the stage split below is an estimate applied
// to the real logged total.
const STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

const STAGE_INFO = [
  { key: 'deep', icon: 'bed-outline', label: LABELS.sleep.stageDeepLabel, desc: LABELS.sleep.stageDeepDesc },
  { key: 'light', icon: 'partly-sunny-outline', label: LABELS.sleep.stageLightLabel, desc: LABELS.sleep.stageLightDesc },
  { key: 'rem', icon: 'eye-outline', label: LABELS.sleep.stageRemLabel, desc: LABELS.sleep.stageRemDesc },
  { key: 'awake', icon: 'alert-circle-outline', label: LABELS.sleep.stageAwakeLabel, desc: LABELS.sleep.stageAwakeDesc },
];

function sleepPhasesSourceNote(hasAutoSleep) {
  return hasAutoSleep ? LABELS.sleep.phasesSourceAuto : LABELS.sleep.phasesSourceManual;
}

function toHHMM(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Compares an actual "HH:mm" against a goal "HH:mm" and labels how close it was.
function bedtimeStatusFor(actualHHMM, goalHHMM) {
  const diff = clockDiffMinutes(actualHHMM, goalHHMM);
  if (diff == null) return null;
  if (Math.abs(diff) <= 15) return { label: LABELS.sleep.onTime, tone: 'positive' };
  if (diff > 0) return { label: LABELS.sleep.minLate.replace('{n}', diff), tone: diff <= 45 ? 'neutral' : 'warning' };
  return { label: LABELS.sleep.minEarly.replace('{n}', Math.abs(diff)), tone: 'positive' };
}

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SleepScreen() {
  const { profile, sleep, todayTotals, addSleep, updateGoals } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hk = useHealthKitData();
  const [logOpen, setLogOpen] = useState(false);
  const [quality, setQuality] = useState(3);
  const [qualityTouched, setQualityTouched] = useState(false);
  const [phasesInfoOpen, setPhasesInfoOpen] = useState(false);
  const [bedtimeValue, setBedtimeValue] = useState(null); // "HH:mm" 24h
  const [wakeTimeValue, setWakeTimeValue] = useState(null);

  const goal = profile?.goals?.sleepGoalHours || 8;
  const bedtimeGoal = profile?.goals?.bedtimeGoal || null;
  const wakeTimeGoal = profile?.goals?.wakeTimeGoal || null;
  const lastEntry = sleep[0];

  // Duration is always derived from bedtime + wake time — never a separately
  // typed number that could disagree with them.
  const computedHours = useMemo(() => hoursBetweenClockTimes(bedtimeValue, wakeTimeValue), [bedtimeValue, wakeTimeValue]);

  // HealthKit already has real sleep sessions if the user wears an Apple
  // Watch, or just from "Track Sleep with iPhone" (motion/charging-based
  // detection built into iOS 16+, no watch required) — when that data
  // exists, use it instead of asking the user to type in last night's hours.
  const autoSleep = hk.sleepStages; // { deepHours, lightHours, remHours, awakeHours, totalHours, bedtime, wakeTime }
  const hasAutoSleep = !!autoSleep;
  const sleepHours = hasAutoSleep ? autoSleep.totalHours : todayTotals.sleepHours || 0;

  const formatClockTime = (date) => (date ? new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null);
  const bedtimeDisplay = hasAutoSleep ? formatClockTime(autoSleep.bedtime) : lastEntry?.bedtime || null;
  const wakeTimeDisplay = hasAutoSleep ? formatClockTime(autoSleep.wakeTime) : lastEntry?.wakeTime || null;

  // Only real timestamps (HealthKit) can be checked against the goal reliably
  // — older free-text manual entries aren't guaranteed parseable.
  const bedtimeStatus = hasAutoSleep && bedtimeGoal ? bedtimeStatusFor(toHHMM(autoSleep.bedtime), bedtimeGoal) : null;

  const score = useMemo(() => {
    const durationScore = Math.min(1, sleepHours / goal) * 60;
    const qualityScore = ((lastEntry?.quality ?? 2) / 4) * 40;
    return Math.round(durationScore + qualityScore);
  }, [sleepHours, goal, lastEntry]);

  const qualityLabel =
    score >= 85 ? LABELS.sleep.qualityExcellent : score >= 65 ? LABELS.sleep.qualityGood : score >= 40 ? LABELS.sleep.qualityFair : LABELS.sleep.qualityNeedsImprovement;

  const stages = hasAutoSleep
    ? { deep: autoSleep.deepHours, light: autoSleep.lightHours, rem: autoSleep.remHours, awake: autoSleep.awakeHours }
    : sleepHours > 0
    ? {
        deep: sleepHours * STAGE_RATIOS.deep,
        light: sleepHours * STAGE_RATIOS.light,
        rem: sleepHours * STAGE_RATIOS.rem,
        awake: sleepHours * STAGE_RATIOS.awake,
      }
    : null;

  // Weekly trend: HealthKit's real per-night totals take priority over a
  // manually-logged night for the same date, local logs fill in the rest.
  const localWeekData = useMemo(() => sumByDay(sleep, 7, 'hours', 'short'), [sleep]);
  const weekData = useMemo(
    () =>
      localWeekData.map((d) => {
        const hkNight = hk.sleepHistory.find((s) => s.dateKey === d.key);
        return hkNight ? { ...d, value: hkNight.totalHours } : d;
      }),
    [localWeekData, hk.sleepHistory]
  );

  // Bedtime consistency needs real timestamps to mean anything — HealthKit's
  // history has them; free-text manual bedtimes ("11:15 PM") aren't reliably
  // parseable, so the insight only speaks up once there's real data to back it.
  const consistencyInsight = useMemo(() => {
    const bedtimes = hk.sleepHistory.map((s) => s.bedtime).filter(Boolean);
    if (bedtimes.length < 2) return null;
    const minutesOfDay = (d) => {
      const total = d.getHours() * 60 + d.getMinutes();
      return total < 12 * 60 ? total + 24 * 60 : total; // early-morning bedtimes cluster with the evening before
    };
    const values = bedtimes.map(minutesOfDay);
    const spread = Math.max(...values) - Math.min(...values);
    if (spread <= 15) return { tone: 'positive', text: LABELS.sleep.consistencyExcellent.replace('{spread}', spread) };
    if (spread <= 45) return { tone: 'neutral', text: LABELS.sleep.consistencyGood.replace('{spread}', spread) };
    return { tone: 'warning', text: LABELS.sleep.consistencyWarning.replace('{spread}', spread) };
  }, [hk.sleepHistory]);

  // Auto-suggests a quality rating from real signals (how close bedtime was
  // to goal, how close duration was to goal) instead of asking the user to
  // guess a subjective 1-5 score from scratch — they can still override it.
  const derivedQuality = useMemo(() => {
    if (!bedtimeGoal && !goal) return null;
    let score = 0;
    const notes = [];
    if (bedtimeValue && bedtimeGoal) {
      const diff = clockDiffMinutes(bedtimeValue, bedtimeGoal);
      if (Math.abs(diff) <= 15) {
        score += 2;
        notes.push('bedtime was on target');
      } else if (Math.abs(diff) <= 45) {
        score += 1;
        notes.push(`bedtime was ${Math.abs(diff)} min ${diff > 0 ? 'late' : 'early'}`);
      } else {
        notes.push(`bedtime was ${Math.abs(diff)} min ${diff > 0 ? 'late' : 'early'}`);
      }
    }
    const hrs = computedHours || 0;
    if (hrs > 0) {
      if (hrs >= goal - 0.25) {
        score += 2;
        notes.push('you got a full night');
      } else if (hrs >= goal - 1) {
        score += 1;
        notes.push('duration was a little short');
      } else {
        notes.push('duration was well short of your goal');
      }
    }
    if (notes.length === 0) return null;
    return { index: Math.min(4, score), notes };
  }, [bedtimeValue, bedtimeGoal, computedHours, goal]);

  // Pure derivation instead of an effect that syncs `quality` after the
  // fact — that had a real race where the sheet could render with a stale
  // `quality` from the previous time it was open, before the effect caught
  // up. This is correct on every render with no timing dependency at all.
  const effectiveQuality = qualityTouched || !derivedQuality ? quality : derivedQuality.index;

  const bedtimeScrollRef = useRef(null);
  const wakeTimeScrollRef = useRef(null);

  const openLogSheet = () => {
    setBedtimeValue(bedtimeGoal);
    setWakeTimeValue(wakeTimeGoal);
    setQualityTouched(false);
    setLogOpen(true);
  };

  // Scrolls the bedtime/wake-time chip rows to reveal whichever chip is
  // pre-selected from the Profile goal — otherwise it's selected but sits
  // off-screen, and looks like the sync silently failed.
  useEffect(() => {
    if (!logOpen) return;
    const CHIP_STRIDE = 78; // approx chip width + gap
    requestAnimationFrame(() => {
      if (bedtimeValue) {
        const idx = bedtimeOptions().findIndex((t) => t.value === bedtimeValue);
        if (idx > 0) bedtimeScrollRef.current?.scrollTo({ x: Math.max(0, idx * CHIP_STRIDE - 40), animated: false });
      }
      if (wakeTimeValue) {
        const idx = wakeTimeOptions().findIndex((t) => t.value === wakeTimeValue);
        if (idx > 0) wakeTimeScrollRef.current?.scrollTo({ x: Math.max(0, idx * CHIP_STRIDE - 40), animated: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logOpen]);

  const submit = () => {
    const hours = computedHours;
    if (!(hours > 0)) return;
    addSleep({
      hours,
      quality: effectiveQuality,
      bedtime: bedtimeValue ? formatClockLabel(bedtimeValue) : null,
      wakeTime: wakeTimeValue ? formatClockLabel(wakeTimeValue) : null,
    });
    // First-ever logged time becomes the Profile goal automatically; once a
    // goal exists, logging here never overwrites it — Profile stays the
    // source of truth going forward, edit it there to change the goal.
    const goalPatch = {};
    if (bedtimeValue && !bedtimeGoal) goalPatch.bedtimeGoal = bedtimeValue;
    if (wakeTimeValue && !wakeTimeGoal) goalPatch.wakeTimeGoal = wakeTimeValue;
    if (Object.keys(goalPatch).length) updateGoals(goalPatch);
    setLogOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.sleepGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{LABELS.sleep.title}</Text>
            <Text style={styles.subtitle}>{LABELS.sleep.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.filterPill} onPress={openLogSheet}>
            <Text style={styles.filterPillText}>{LABELS.sleep.lastNight}</Text>
          </TouchableOpacity>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={score / 100}
            size={100}
            strokeWidth={10}
            color={colors.sleep}
            trackColor={colors.line}
            centerValue={score}
            centerLabel={LABELS.sleep.outOf100}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{qualityLabel}</Text>
            <Text style={styles.heroDesc}>
              {sleepHours > 0
                ? LABELS.sleep.heroDescLogged.replace('{duration}', formatHoursMinutes(sleepHours))
                : LABELS.sleep.heroDescEmpty}
            </Text>
          </View>
        </Card>

        <TouchableOpacity onPress={openLogSheet} activeOpacity={0.85}>
          <Card>
            <View style={styles.durationRow}>
              <View style={[styles.moonIcon, { backgroundColor: colors.sleepSoft }]}>
                <Ionicons name="moon" size={18} color={colors.sleep} />
              </View>
              <View style={styles.durationText}>
                <Text style={styles.caption}>{LABELS.sleep.totalDuration}</Text>
                <Text style={styles.durationValue}>{formatHoursMinutes(sleepHours)}</Text>
              </View>
              <View style={styles.durationSide}>
                <Text style={styles.caption}>{LABELS.sleep.bedtime}</Text>
                <Text style={styles.durationSideValue}>{bedtimeDisplay || '—'}</Text>
                {bedtimeStatus && (
                  <Text
                    style={[
                      styles.bedtimeStatusText,
                      { color: bedtimeStatus.tone === 'warning' ? colors.danger : bedtimeStatus.tone === 'positive' ? colors.primary : colors.inkSoft },
                    ]}
                  >
                    {bedtimeStatus.label}
                  </Text>
                )}
              </View>
              <View style={styles.durationSide}>
                <Text style={styles.caption}>{LABELS.sleep.wakeTime}</Text>
                <Text style={styles.durationSideValue}>{wakeTimeDisplay || '—'}</Text>
              </View>
            </View>
            <Text style={styles.sourceCaption}>{hasAutoSleep ? LABELS.sleep.sourceCaptionAuto : LABELS.sleep.sourceCaptionManual}</Text>
          </Card>
        </TouchableOpacity>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{LABELS.sleep.sleepPhases}</Text>
            <TouchableOpacity onPress={() => setPhasesInfoOpen(true)} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          {stages ? (
            <>
              <View style={styles.sleepBar}>
                <View style={[styles.sleepSeg, { flex: stages.deep, backgroundColor: colors.sleep }]} />
                <View style={[styles.sleepSeg, { flex: stages.light, backgroundColor: withAlpha(colors.sleep, 0.5) }]} />
                <View style={[styles.sleepSeg, { flex: stages.rem, backgroundColor: colors.water }]} />
                <View style={[styles.sleepSeg, { flex: stages.awake, backgroundColor: colors.danger }]} />
              </View>
              <View style={styles.sleepLegend}>
                <LegendItem styles={styles} color={colors.sleep} label={LABELS.sleep.stageDeepLabel} value={formatHoursMinutes(stages.deep)} />
                <LegendItem styles={styles} color={withAlpha(colors.sleep, 0.5)} label={LABELS.sleep.stageLightLabel} value={formatHoursMinutes(stages.light)} />
                <LegendItem styles={styles} color={colors.water} label={LABELS.sleep.stageRemLabel} value={formatHoursMinutes(stages.rem)} />
                <LegendItem styles={styles} color={colors.danger} label={LABELS.sleep.stageAwakeLabel} value={formatHoursMinutes(stages.awake)} />
              </View>
            </>
          ) : (
            <Text style={styles.empty}>{LABELS.sleep.emptyPhases}</Text>
          )}
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{LABELS.sleep.sleepTrend}</Text>
            <Text style={styles.caption}>{LABELS.sleep.target.replace('{goal}', goal)}</Text>
          </View>
          <Sparkline
            data={weekData.map((d) => d.value || 0.1)}
            refValue={goal}
            refColor={colors.water}
            color={colors.sleep}
            width={280}
            height={90}
            strokeWidth={2.5}
            dots
          />
          <View style={styles.axisRow}>
            {weekData.map((d) => (
              <Text key={d.key} style={styles.axisLabel}>{d.label}</Text>
            ))}
          </View>
        </Card>

        <Card>
          <View style={styles.insightRow}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: consistencyInsight?.tone === 'warning' ? `${colors.danger}22` : colors.primarySoft },
              ]}
            >
              <Ionicons
                name={consistencyInsight?.tone === 'warning' ? 'alert-circle' : 'trending-up'}
                size={18}
                color={consistencyInsight?.tone === 'warning' ? colors.danger : colors.primary}
              />
            </View>
            <View style={styles.insightText}>
              <Text style={styles.sectionTitle}>{consistencyInsight ? LABELS.sleep.bedtimeConsistency : LABELS.sleep.consistencyIsKey}</Text>
              <Text style={styles.heroDesc}>
                {consistencyInsight
                  ? consistencyInsight.text
                  : Platform.OS === 'ios'
                  ? LABELS.sleep.consistencyDefaultIOS
                  : LABELS.sleep.consistencyDefaultAndroid}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <QuickAddSheet visible={logOpen} title={LABELS.sleep.logSheetTitle} onClose={() => setLogOpen(false)}>
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.sleep.logSheetInfo}</Text>
        </View>

        <Text style={styles.fieldLabel}>{LABELS.sleep.bedtimeFieldLabel}{!bedtimeGoal && bedtimeValue ? LABELS.sleep.setsYourGoalSuffix : ''}</Text>
        <ScrollView ref={bedtimeScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
          {bedtimeOptions().map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.timeChip, bedtimeValue === t.value && styles.timeChipActive]}
              onPress={() => setBedtimeValue(t.value)}
            >
              <Text style={[styles.timeChipText, bedtimeValue === t.value && styles.timeChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>{LABELS.sleep.wakeTimeFieldLabel}{!wakeTimeGoal && wakeTimeValue ? LABELS.sleep.setsYourGoalSuffix : ''}</Text>
        <ScrollView ref={wakeTimeScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
          {wakeTimeOptions().map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.timeChip, wakeTimeValue === t.value && styles.timeChipActive]}
              onPress={() => setWakeTimeValue(t.value)}
            >
              <Text style={[styles.timeChipText, wakeTimeValue === t.value && styles.timeChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.durationDisplay}>
          <View style={styles.inputIconWrap}>
            <Ionicons name="moon-outline" size={16} color={colors.sleep} />
          </View>
          <Text style={styles.durationDisplayLabel}>{LABELS.sleep.duration}</Text>
          <Text style={styles.durationDisplayValue}>
            {computedHours != null ? `${formatHoursMinutes(computedHours)}` : LABELS.sleep.pickBedtimeWakeTime}
          </Text>
        </View>

        <Text style={styles.fieldLabel}>{LABELS.sleep.howDidItFeel}</Text>
        {derivedQuality && (
          <View style={styles.sheetInfoRow}>
            <Ionicons name="sparkles-outline" size={14} color={colors.sleep} />
            <Text style={styles.sheetInfoText}>
              {LABELS.sleep.autoSuggested.replace('{quality}', QUALITY[derivedQuality.index]).replace('{notes}', derivedQuality.notes.join(', '))}
            </Text>
          </View>
        )}
        <View style={styles.qualityPicker}>
          {QUALITY.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.qualityChip, effectiveQuality === i && styles.qualityChipActive]}
              onPress={() => {
                setQuality(i);
                setQualityTouched(true);
              }}
            >
              <Text style={[styles.qualityChipText, effectiveQuality === i && styles.qualityChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <InfoModal visible={phasesInfoOpen} title={LABELS.sleep.aboutSleepPhases} onClose={() => setPhasesInfoOpen(false)}>
        <View style={styles.phasesSourceRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.phasesSourceText}>{sleepPhasesSourceNote(hasAutoSleep)}</Text>
        </View>
        {STAGE_INFO.map((s) => (
          <View key={s.key} style={styles.phaseInfoRow}>
            <View style={[styles.phaseInfoIconWrap, { backgroundColor: colors.sleepSoft }]}>
              <Ionicons name={s.icon} size={16} color={colors.sleep} />
            </View>
            <View style={styles.phaseInfoTextWrap}>
              <Text style={styles.phaseInfoLabel}>{s.label}</Text>
              <Text style={styles.phaseInfoDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </InfoModal>
    </View>
  );
}

function LegendItem({ styles, color, label, value }) {
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
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
    subtitle: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, fontWeight: '500' },
    filterPill: {
      backgroundColor: colors.sleepSoft,
      borderWidth: 1,
      borderColor: colors.sleepGlow,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterPillText: { fontSize: 12, fontWeight: '700', color: colors.sleep },

    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    heroDesc: { fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },

    durationRow: { flexDirection: 'row', alignItems: 'center' },
    moonIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    durationText: { flex: 1 },
    durationValue: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 2 },
    durationSide: { marginLeft: spacing.md },
    durationSideValue: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 2 },
    bedtimeStatusText: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    caption: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
    sourceCaption: { fontSize: 10.5, color: colors.inkFaint, fontWeight: '600', marginTop: spacing.sm },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },

    sleepBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
    sleepSeg: { height: '100%' },
    sleepLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendLabel: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
    legendValue: { fontSize: 11, color: colors.ink, fontWeight: '700' },
    empty: { fontSize: 13, color: colors.inkSoft },

    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingHorizontal: 4 },
    axisLabel: { fontSize: 10, color: colors.inkSoft, fontWeight: '600' },

    insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
    insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    insightText: { flex: 1 },

    sheetInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
    sheetInfoText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '500', flexShrink: 1 },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
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
      backgroundColor: colors.sleepSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.ink },
    inputSuffix: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft, marginLeft: 6 },
    durationDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.sleepSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.sleep,
      paddingHorizontal: 10,
      paddingVertical: 12,
      marginBottom: spacing.lg,
    },
    durationDisplayLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, flex: 1 },
    durationDisplayValue: { fontSize: 14, fontWeight: '800', color: colors.sleep },
    chipScroll: { marginBottom: spacing.md },
    chipScrollContent: { gap: 8, paddingRight: spacing.md },
    timeChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeChipActive: { backgroundColor: colors.sleepSoft, borderColor: colors.sleep },
    timeChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
    timeChipTextActive: { color: colors.sleep, fontWeight: '700' },
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
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },

    phasesSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
    phasesSourceText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '500', flexShrink: 1 },
    phaseInfoRow: { flexDirection: 'row', marginBottom: spacing.md },
    phaseInfoIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    phaseInfoTextWrap: { flex: 1 },
    phaseInfoLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginBottom: 2 },
    phaseInfoDesc: { fontSize: 12, fontWeight: '500', color: colors.inkSoft, lineHeight: 17 },
  });
