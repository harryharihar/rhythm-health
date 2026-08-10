import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import Card from '../components/Card';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { useHealthKitData } from '../health/useHealthKitData';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { formatHoursMinutes, sumByDay } from '../utils/dateUtils';

const QUALITY = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// No sleep-stage sensor exists — the stage split below is an estimate applied
// to the real logged total. Bedtime/wake time and duration are real, typed in
// when logging (free text, e.g. "11:15 PM" — no time-picker dependency yet).
const STAGE_RATIOS = { deep: 0.24, light: 0.53, rem: 0.2, awake: 0.03 };

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SleepScreen() {
  const { profile, sleep, todayTotals, addSleep } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hk = useHealthKitData();
  const [logOpen, setLogOpen] = useState(false);
  const [hoursInput, setHoursInput] = useState('7.5');
  const [quality, setQuality] = useState(3);
  const [bedtimeInput, setBedtimeInput] = useState('');
  const [wakeTimeInput, setWakeTimeInput] = useState('');

  const goal = profile?.goals?.sleepGoalHours || 8;
  const sleepHours = todayTotals.sleepHours || 0;
  const lastEntry = sleep[0];

  const score = useMemo(() => {
    const durationScore = Math.min(1, sleepHours / goal) * 60;
    const qualityScore = ((lastEntry?.quality ?? 2) / 4) * 40;
    return Math.round(durationScore + qualityScore);
  }, [sleepHours, goal, lastEntry]);

  const qualityLabel =
    score >= 85 ? 'Excellent Sleep Quality' : score >= 65 ? 'Good Sleep Quality' : score >= 40 ? 'Fair Sleep Quality' : 'Needs Improvement';

  const stages = hk.sleepStages
    ? { deep: hk.sleepStages.deepHours, light: hk.sleepStages.lightHours, rem: hk.sleepStages.remHours, awake: hk.sleepStages.awakeHours }
    : sleepHours > 0
    ? {
        deep: sleepHours * STAGE_RATIOS.deep,
        light: sleepHours * STAGE_RATIOS.light,
        rem: sleepHours * STAGE_RATIOS.rem,
        awake: sleepHours * STAGE_RATIOS.awake,
      }
    : null;

  const weekData = useMemo(() => sumByDay(sleep, 7, 'hours', 'short'), [sleep]);

  const submit = () => {
    const hours = Number(hoursInput);
    if (hours > 0) addSleep({ hours, quality, bedtime: bedtimeInput.trim() || null, wakeTime: wakeTimeInput.trim() || null });
    setBedtimeInput('');
    setWakeTimeInput('');
    setLogOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.sleepGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Sleep</Text>
            <Text style={styles.subtitle}>Recharge index insights</Text>
          </View>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterPillText}>Last Night</Text>
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
            centerLabel="/ 100"
          />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{qualityLabel}</Text>
            <Text style={styles.heroDesc}>
              {sleepHours > 0
                ? `${formatHoursMinutes(sleepHours)} logged last night. Consistent bedtimes improve deep sleep quality over time.`
                : 'No sleep logged yet — log last night to see your recovery index.'}
            </Text>
          </View>
        </Card>

        <TouchableOpacity onPress={() => setLogOpen(true)} activeOpacity={0.85}>
          <Card>
            <View style={styles.durationRow}>
              <View style={[styles.moonIcon, { backgroundColor: colors.sleepSoft }]}>
                <Ionicons name="moon" size={18} color={colors.sleep} />
              </View>
              <View style={styles.durationText}>
                <Text style={styles.caption}>Total Duration</Text>
                <Text style={styles.durationValue}>{formatHoursMinutes(sleepHours)}</Text>
              </View>
              <View style={styles.durationSide}>
                <Text style={styles.caption}>Bedtime</Text>
                <Text style={styles.durationSideValue}>{lastEntry?.bedtime || '—'}</Text>
              </View>
              <View style={styles.durationSide}>
                <Text style={styles.caption}>Wake Time</Text>
                <Text style={styles.durationSideValue}>{lastEntry?.wakeTime || '—'}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        <Card>
          <Text style={styles.sectionTitle}>Sleep Phases</Text>
          {stages ? (
            <>
              <View style={styles.sleepBar}>
                <View style={[styles.sleepSeg, { flex: stages.deep, backgroundColor: colors.sleep }]} />
                <View style={[styles.sleepSeg, { flex: stages.light, backgroundColor: withAlpha(colors.sleep, 0.5) }]} />
                <View style={[styles.sleepSeg, { flex: stages.rem, backgroundColor: colors.water }]} />
                <View style={[styles.sleepSeg, { flex: stages.awake, backgroundColor: colors.danger }]} />
              </View>
              <View style={styles.sleepLegend}>
                <LegendItem styles={styles} color={colors.sleep} label="Deep" value={formatHoursMinutes(stages.deep)} />
                <LegendItem styles={styles} color={withAlpha(colors.sleep, 0.5)} label="Light" value={formatHoursMinutes(stages.light)} />
                <LegendItem styles={styles} color={colors.water} label="REM" value={formatHoursMinutes(stages.rem)} />
                <LegendItem styles={styles} color={colors.danger} label="Awake" value={formatHoursMinutes(stages.awake)} />
              </View>
            </>
          ) : (
            <Text style={styles.empty}>No sleep logged yet.</Text>
          )}
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Sleep Trend (7 nights)</Text>
            <Text style={styles.caption}>Target: {goal}h</Text>
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
            <View style={[styles.insightIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="trending-up" size={18} color={colors.primary} />
            </View>
            <View style={styles.insightText}>
              <Text style={styles.sectionTitle}>Consistency is Key</Text>
              <Text style={styles.heroDesc}>Keeping your bedtime within 15 minutes of your goal each night steadily improves deep sleep.</Text>
            </View>
          </View>
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
        <View style={styles.macroInputRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Bedtime, e.g. 11:15 PM"
            placeholderTextColor={colors.inkFaint}
            value={bedtimeInput}
            onChangeText={setBedtimeInput}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Wake time, e.g. 6:38 AM"
            placeholderTextColor={colors.inkFaint}
            value={wakeTimeInput}
            onChangeText={setWakeTimeInput}
          />
        </View>
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
    caption: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

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
    macroInputRow: { flexDirection: 'row', gap: spacing.sm },
    halfInput: { flex: 1 },
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
  });
