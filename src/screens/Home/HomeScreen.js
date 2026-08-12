import React, { useMemo } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../../components/RingGauge';
import Sparkline from '../../components/Sparkline';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import WeekBars from '../../components/WeekBars';
import { useThemeColors } from '../../theme/useTheme';
import { formatFriendlyDate, formatHoursMinutes, greeting } from '../../utils/dateUtils';
import { iconForType } from '../../utils/healthCalculations';
import { LABELS } from '../../constants/labels';
import { useHomeScreen } from './useHomeScreen';
import { makeStyles } from './HomeScreen.styles';

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    profile,
    todayTotals,
    hk,
    heartRateAvailable,
    heartRateInfo,
    activeMinutes,
    goals,
    initials,
    overallProgress,
    scorePct,
    vitalityLabel,
    vitalityNote,
    weekSteps,
    dailyAvgPct,
    calories,
    stepsCaloriesToday,
    distanceKm,
    stepsDistanceToday,
    workoutsByTypeToday,
    caloriesCaption,
    distanceCaption,
    sleepHours,
    sleepStages,
    fillPct,
    waterLitres,
    waterGoalLitres,
    weightValues,
    weightDelta,
    addWater,
  } = useHomeScreen();

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
              <TouchableOpacity onPress={() => Alert.alert(LABELS.home.heartRateInfoTitle, heartRateInfo)} hitSlop={8}>
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
