import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../../components/RingGauge';
import Sparkline from '../../components/Sparkline';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import WeekBars from '../../components/WeekBars';
import { useThemeColors } from '../../theme/useTheme';
import { formatFriendlyDate, formatHoursMinutes, greeting } from '../../utils/dateUtils';
import { bmiCategories, iconForType } from '../../utils/healthCalculations';
import { LABELS } from '../../constants/labels';
import { ROUTES } from '../../navigation/routes';
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
  const navigation = useNavigation();
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
    dailyGoalsAchieved,
    stepsProgress,
    waterProgress,
    sleepProgress,
    stepsGoalAchieved,
    waterGoalAchieved,
    sleepGoalAchieved,
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
    todayWaterLogs,
    weightValues,
    weightDelta,
    bmiCategory,
    bmiBannerVisible,
    dismissBmiBanner,
    addWater,
  } = useHomeScreen(colors);

  const deltaColor = weightDelta == null ? colors.inkSoft : weightDelta < 0 ? colors.primary : weightDelta > 0 ? colors.steps : colors.inkSoft;

  // Gentle "breathing" pulse on the hero card while goals are achieved —
  // starts/stops as that flips, rather than running the loop always and
  // just hiding it, so it's not silently animating in the background the
  // rest of the time.
  const celebrationScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!dailyGoalsAchieved) {
      celebrationScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(celebrationScale, { toValue: 1.025, duration: 700, useNativeDriver: true }),
        Animated.timing(celebrationScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dailyGoalsAchieved]);

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

        {bmiBannerVisible && bmiCategory ? (
          <Card style={[styles.bmiBannerCard, { borderColor: bmiCategory.color }]}>
            <View style={styles.bmiBannerHeaderRow}>
              <View style={[styles.bmiBannerIconWrap, { backgroundColor: withAlpha(bmiCategory.color, 0.16) }]}>
                <Ionicons name="fitness-outline" size={18} color={bmiCategory.color} />
              </View>
              <TouchableOpacity onPress={dismissBmiBanner} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
            <Text style={styles.bmiBannerTitle}>{LABELS.home.bmiBannerTitle}</Text>
            <Text style={styles.bmiBannerBody}>{LABELS.home.bmiBannerBody.replace('{category}', bmiCategory.label)}</Text>
            <TouchableOpacity
              style={[styles.bmiBannerCta, { backgroundColor: bmiCategory.color }]}
              onPress={() => {
                dismissBmiBanner();
                navigation.navigate(ROUTES.PROFILE as never);
              }}
            >
              <Text style={styles.bmiBannerCtaText}>{LABELS.home.bmiBannerCta}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.onAccent} />
            </TouchableOpacity>
          </Card>
        ) : null}

        <Animated.View style={dailyGoalsAchieved ? { transform: [{ scale: celebrationScale }] } : undefined}>
          <Card style={dailyGoalsAchieved ? styles.heroCardAchieved : undefined}>
            <View style={styles.heroCard}>
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
                <Text style={[styles.heroTitle, dailyGoalsAchieved && styles.heroTitleAchieved]}>{vitalityLabel}</Text>
                <Text style={styles.heroDesc}>{vitalityNote}</Text>
              </View>
            </View>
            {/* Score above blends steps/water/sleep, so it can sit under
                100% even once "Goals Crushed" (water+steps only) has fired
                — this breaks out each goal's own progress so it's clear
                this row is today's per-goal completion, not a repeat of
                the score. */}
            <Text style={styles.todaysProgressLabel}>{LABELS.home.todaysProgress}</Text>
            <View style={styles.goalBreakdownRow}>
              {[
                { key: 'steps', icon: 'footsteps', label: LABELS.home.steps, color: colors.steps, pct: stepsProgress, achieved: stepsGoalAchieved },
                { key: 'water', icon: 'water', label: LABELS.home.waterIntake, color: colors.water, pct: waterProgress, achieved: waterGoalAchieved },
                { key: 'sleep', icon: 'moon', label: LABELS.home.sleepShort, color: colors.sleep, pct: sleepProgress, achieved: sleepGoalAchieved },
              ].map((g) => (
                <View key={g.key} style={styles.goalBreakdownItem}>
                  <View style={styles.goalBreakdownHeader}>
                    <Ionicons name={(g.achieved ? g.icon : `${g.icon}-outline`) as any} size={12} color={g.color} />
                    <Text style={[styles.goalBreakdownPct, { color: g.color }]}>{Math.round(g.pct * 100)}%</Text>
                  </View>
                  <View style={[styles.goalBreakdownTrack, { backgroundColor: colors.line }]}>
                    <View style={[styles.goalBreakdownFill, { width: `${g.pct * 100}%`, backgroundColor: g.color }]} />
                  </View>
                  <Text style={styles.goalBreakdownLabel}>{g.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

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
                  <Ionicons name={iconForType(w.type) as any} size={16} color={colors.steps} />
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
              <Ionicons name="body-outline" size={16} color={colors.primary} />
            </View>
            {todayTotals.latestWeight != null ? (
              <>
                <View style={styles.weightValueRow}>
                  <Text style={styles.bigValue}>{todayTotals.latestWeight} kg</Text>
                  {weightDelta != null ? (
                    <View style={[styles.deltaPill, { backgroundColor: withAlpha(deltaColor, 0.14) }]}>
                      <Ionicons name={weightDelta < 0 ? 'trending-down' : weightDelta > 0 ? 'trending-up' : 'remove'} size={11} color={deltaColor} />
                      <Text style={[styles.deltaPillText, { color: deltaColor }]}>
                        {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                      </Text>
                    </View>
                  ) : null}
                  {bmiCategory ? (
                    <View style={[styles.bmiPill, { backgroundColor: withAlpha(bmiCategory.color, 0.14) }]}>
                      <Text style={[styles.bmiPillText, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
                    </View>
                  ) : null}
                </View>
                {weightValues.length >= 2 ? (
                  <>
                    <Text style={styles.caption}>{LABELS.home.last7Logs}</Text>
                    <View style={styles.sparklineWrap}>
                      <Sparkline data={weightValues} color={colors.primary} width={130} height={34} strokeWidth={2} dots />
                    </View>
                  </>
                ) : (
                  <Text style={styles.captionMuted}>{LABELS.home.weightTrendNeedMore}</Text>
                )}
                {bmiCategory ? (
                  <View style={styles.bmiScaleWrap}>
                    <View style={styles.bmiScaleBar}>
                      {bmiCategories(colors).map((c) => (
                        <View
                          key={c.label}
                          style={[
                            styles.bmiScaleSeg,
                            { backgroundColor: c.label === bmiCategory.label ? c.color : withAlpha(c.color, 0.25) },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.bmiScaleRange}>{bmiCategory.label} · {bmiCategory.range}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.weightEmptyState}>
                <Ionicons name="body-outline" size={22} color={colors.inkFaint} />
                <Text style={styles.captionMuted}>{LABELS.home.noWeightLogged}</Text>
              </View>
            )}
          </Card>
        </View>

        {todayWaterLogs.length > 0 ? (
          <Card>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>{LABELS.home.todaysWaterLog}</Text>
              <Ionicons name="water-outline" size={16} color={colors.water} />
            </View>
            {todayWaterLogs.map((log, i) => (
              <View key={log.id} style={[styles.waterLogRow, i === todayWaterLogs.length - 1 && styles.noBorder]}>
                <View style={[styles.waterLogDot, { backgroundColor: colors.waterSoft }]}>
                  <Ionicons name="water" size={12} color={colors.water} />
                </View>
                <Text style={styles.waterLogTime}>{log.timeLabel}</Text>
                <Text style={styles.waterLogAmount}>{log.amountMl} ml</Text>
              </View>
            ))}
          </Card>
        ) : null}
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
