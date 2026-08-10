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
import { formatShortTime, isSameDay, sumByDay, todayKey } from '../utils/dateUtils';

export default function WaterScreen() {
  const { profile, water, addWater } = useHealth();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const goalMl = profile?.goals?.waterGoalMl || 2500;
  const today = todayKey();
  const todayLogs = useMemo(
    () => water.filter((e) => isSameDay(e.timestamp, today)),
    [water, today]
  );
  const totalMl = todayLogs.reduce((acc, e) => acc + e.amountMl, 0);
  const weekData = useMemo(() => sumByDay(water, 7, 'amountMl'), [water]);
  const fillPct = Math.max(0, Math.min(1, totalMl / goalMl));

  const submitCustom = () => {
    const n = Number(customValue);
    if (n > 0) addWater(n);
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['rgba(62,195,255,0.16)', 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <ScreenHeader eyebrow="Hydration" accent={colors.water} title="Water" subtitle={`Goal ${goalMl} ml`} />

        <DailyArc
          label="Today's Intake"
          icon="💧"
          value={totalMl}
          suffix={`/ ${goalMl} ml`}
          progress={fillPct}
          color={colors.water}
          trackColor={colors.line}
        />

        {/* Glass-fill motif: unique to Water, a vertical hydration meter alongside the arc */}
        <View style={styles.glassRow}>
          {[0, 1, 2, 3, 4].map((i) => {
            const filled = fillPct * 5 > i;
            return <View key={i} style={[styles.glassSeg, filled && styles.glassSegFilled]} />;
          })}
        </View>

        <View style={styles.pillRow}>
          <Pill label="+250ml" color={colors.water} soft={colors.waterSoft} onPress={() => addWater(250)} />
          <Pill label="+500ml" color={colors.water} soft={colors.waterSoft} onPress={() => addWater(500)} />
          <Pill label="Custom" color={colors.water} soft={colors.waterSoft} onPress={() => setCustomOpen(true)} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Logged today</Text>
          {todayLogs.length === 0 ? (
            <Text style={styles.empty}>Nothing logged yet — add your first glass above.</Text>
          ) : (
            todayLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logLeft}>
                  <View style={styles.logDot} />
                  <Text style={styles.logText}>{log.amountMl} ml</Text>
                </View>
                <Text style={styles.logTime}>{formatShortTime(log.timestamp)}</Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Past 7 days</Text>
          <WeekBars data={weekData} color={colors.water} trackColor={colors.waterSoft} />
        </Card>

      </ScrollView>

      <QuickAddSheet visible={customOpen} title="Add custom amount" onClose={() => setCustomOpen(false)}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Amount in ml"
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
  glassRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  glassSeg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glassSegFilled: {
    backgroundColor: colors.water,
    borderColor: colors.water,
    shadowColor: colors.water,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pillRow: { flexDirection: 'row', marginBottom: spacing.sm, marginHorizontal: -spacing.xs / 2 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  empty: { fontSize: 13, color: colors.inkSoft },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.water },
  logText: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  logTime: { fontSize: 12, color: colors.inkSoft },
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
  submitBtn: { backgroundColor: colors.water, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  submitLabel: { color: colors.bg, fontWeight: '800', fontSize: 14 },
});
