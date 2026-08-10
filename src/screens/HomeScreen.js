import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DailyArc from '../components/DailyArc';
import StatCard from '../components/StatCard';
import Pill from '../components/Pill';
import Card from '../components/Card';
import WeekBars from '../components/WeekBars';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { colors, spacing } from '../theme/theme';
import { formatFriendlyDate, greeting, sumByDay } from '../utils/dateUtils';

export default function HomeScreen() {
  const { profile, todayTotals, water, steps, addWater, addSteps } = useHealth();
  const [sheet, setSheet] = useState(null); // 'water' | 'steps' | null

  const goals = profile?.goals || { stepsGoal: 10000, waterGoalMl: 2500, sleepGoalHours: 8 };

  const overallProgress = useMemo(() => {
    const p1 = Math.min(1, todayTotals.stepsCount / goals.stepsGoal);
    const p2 = Math.min(1, todayTotals.waterMl / goals.waterGoalMl);
    const p3 = Math.min(1, todayTotals.sleepHours / goals.sleepGoalHours);
    return Math.round(((p1 + p2 + p3) / 3) * 100) / 100;
  }, [todayTotals, goals]);

  const weekWater = useMemo(() => sumByDay(water, 7, 'amountMl'), [water]);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['rgba(51,230,166,0.14)', 'transparent']}
        style={styles.ambient}
        pointerEvents="none"
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()}{profile?.name ? `, ${profile.name}` : ''}</Text>
            <Text style={styles.date}>{formatFriendlyDate()}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.round(overallProgress * 100)}%</Text>
          </View>
        </View>

        <DailyArc
          label="Today's Rhythm"
          icon="✨"
          value={`${Math.round(overallProgress * 100)}`}
          suffix="%"
          progress={overallProgress}
          color={colors.primary}
          trackColor={colors.line}
        />

        <View style={styles.grid}>
          <StatCard dotColor={colors.steps} label="Steps" value={todayTotals.stepsCount.toLocaleString()} unit={`/ ${goals.stepsGoal.toLocaleString()}`} />
          <StatCard dotColor={colors.water} label="Water" value={todayTotals.waterMl} unit={`/ ${goals.waterGoalMl} ml`} />
          <StatCard dotColor={colors.sleep} label="Sleep" value={todayTotals.sleepHours || 0} unit={`/ ${goals.sleepGoalHours}h`} />
          <StatCard
            dotColor={colors.primary}
            label="Weight"
            value={todayTotals.latestWeight ?? '—'}
            unit={todayTotals.latestWeight ? 'kg' : ''}
          />
        </View>

        <View style={styles.pillRow}>
          <Pill label="+ Water" color={colors.water} soft={colors.waterSoft} onPress={() => setSheet('water')} />
          <Pill label="+ Steps" color={colors.steps} soft={colors.stepsSoft} onPress={() => setSheet('steps')} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Water — this week</Text>
          <WeekBars data={weekWater} color={colors.water} trackColor={colors.waterSoft} />
        </Card>

      </ScrollView>

      <QuickAddSheet
        visible={sheet === 'water'}
        title="Add water"
        options={[
          { label: '250 ml', onPress: () => addWater(250) },
          { label: '500 ml', onPress: () => addWater(500) },
          { label: '750 ml', onPress: () => addWater(750) },
        ]}
        onClose={() => setSheet(null)}
      />
      <QuickAddSheet
        visible={sheet === 'steps'}
        title="Add steps"
        options={[
          { label: '+500', onPress: () => addSteps(500) },
          { label: '+1,000', onPress: () => addSteps(1000) },
          { label: '+2,000', onPress: () => addSteps(2000) },
        ]}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  date: { fontSize: 12.5, color: colors.inkSoft, marginTop: 3, fontWeight: '500' },
  badge: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(51,230,166,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pillRow: { flexDirection: 'row', marginBottom: spacing.sm, marginHorizontal: -spacing.xs / 2 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
});
