import React, { useMemo, useRef } from 'react';
import { Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../../components/RingGauge';
import Sparkline from '../../components/Sparkline';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import QuickAddSheet from '../../components/QuickAddSheet';
import { useThemeColors } from '../../theme/useTheme';
import { formatRelativeTime } from '../../utils/dateUtils';
import { iconForType, WORKOUT_TYPES } from '../../utils/healthCalculations';
import { LABELS } from '../../constants/labels';
import { RANGE_OPTIONS, workoutSubtitle } from './activityCalculations';
import { useActivityScreen } from './useActivityScreen';
import { makeStyles } from './ActivityScreen.styles';

export default function ActivityScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    todayTotals,
    activeMinutes,
    customOpen, setCustomOpen,
    customValue, setCustomValue,
    workoutOpen, setWorkoutOpen,
    workoutType, setWorkoutType,
    durationInput, setDurationInput,
    distanceInput, setDistanceInput,
    rangeKey, setRangeKey,
    rangeOpen, setRangeOpen,
    sheetView, setSheetView,
    nowDateLabel,
    nowTimeLabel,
    goal,
    todayCount,
    range,
    chartData,
    selectedChartIndex, setSelectedChartIndex,
    selectedChartPoint,
    selectedDayDateLabel,
    avgPerDay,
    avgActiveMinPerDay,
    hasWorkoutsInRange,
    movePct,
    moveLabel,
    stepsCaloriesToday,
    calories,
    stepsDistanceToday,
    distanceKm,
    workoutsByTypeToday,
    caloriesCaption,
    distanceCaption,
    recentWorkouts,
    workoutDurationMin,
    estWorkoutCalories,
    submitCustom,
    resetWorkoutForm,
    submitWorkout,
    maxMet,
    calorieChartRows,
  } = useActivityScreen();
  const stepsInputRef = useRef<TextInput>(null);
  const durationInputRef = useRef<TextInput>(null);

  // A logged workout always saves with today's timestamp, so logging only
  // makes sense while viewing a range that actually includes today —
  // This Week, Today, and Yesterday's chart all do (see RANGE_OPTIONS),
  // anything further back doesn't.
  const canLogWorkout = rangeKey === 'week' || rangeKey === 'today' || rangeKey === 'yesterday';

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
                    .replace('{activeMin}', String(avgActiveMinPerDay))
                    .replace('{range}', range.label.toLowerCase())
                    .replace('{pct}', String(movePct))
                : LABELS.activity.heroDescStepsOnly.replace('{pct}', String(movePct)).replace('{range}', range.label.toLowerCase())}
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

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>{LABELS.activity.stepsTrend}</Text>
            <TouchableOpacity style={styles.filterPill} onPress={() => setRangeOpen(true)}>
              <Text style={styles.filterPillText}>{range.label}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>{LABELS.activity.avgPerDay.replace('{avg}', avgPerDay.toLocaleString())}</Text>
          <Sparkline
            data={chartData.map((d) => d.value)}
            color={colors.steps}
            width={280}
            height={90}
            strokeWidth={2.5}
            dots
            highlightIndex={selectedChartIndex}
            highlightFillColor={colors.surface}
            onSelectIndex={setSelectedChartIndex}
          />
          <View style={styles.axisRow}>
            {chartData.map((d, i) => (
              <TouchableOpacity key={d.key} style={styles.axisLabelBtn} onPress={() => setSelectedChartIndex(i)}>
                <Text style={[styles.axisLabel, i === selectedChartIndex && { color: colors.steps, fontWeight: '800' }]} numberOfLines={1}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedChartPoint ? (
            <View style={[styles.selectedDayRow, { borderTopColor: colors.line }]}>
              <Text style={styles.selectedDayValue}>{selectedChartPoint.value.toLocaleString()}</Text>
              <Text style={styles.selectedDayLabel}>
                {' '}
                {LABELS.activity.stepsOnSelectedDay.replace('{date}', selectedDayDateLabel || '')}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.listHeading}>{LABELS.activity.workouts}</Text>
            <Text style={styles.caption}>{range.label}</Text>
          </View>
          <TouchableOpacity
            style={[styles.logBtn, !canLogWorkout && styles.logBtnDisabled]}
            onPress={() => setWorkoutOpen(true)}
            disabled={!canLogWorkout}
          >
            <Ionicons name="add" size={14} color={!canLogWorkout ? colors.inkFaint : colors.steps} />
            <Text style={[styles.logBtnText, !canLogWorkout && styles.logBtnTextDisabled]}>{LABELS.activity.logWorkout}</Text>
          </TouchableOpacity>
        </View>
        {!canLogWorkout && (
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
                  <Ionicons name={iconForType(w.type) as any} size={18} color={colors.steps} />
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

      <QuickAddSheet
        visible={customOpen}
        title={LABELS.activity.logStepsTitle}
        onClose={() => setCustomOpen(false)}
        onShown={() => stepsInputRef.current?.focus()}
      >
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.activity.entriesRecordedToday}</Text>
        </View>
        <TextInput
          ref={stepsInputRef}
          style={styles.input}
          keyboardType="number-pad"
          placeholder={LABELS.activity.stepsPlaceholder}
          placeholderTextColor={colors.inkFaint}
          value={customValue}
          onChangeText={setCustomValue}
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submitCustom}>
          <Text style={styles.submitLabel}>{LABELS.activity.add}</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <QuickAddSheet
        visible={workoutOpen}
        title={sheetView === 'form' ? LABELS.activity.logWorkoutTitle : sheetView === 'types' ? LABELS.activity.workoutTypesTitle : LABELS.activity.calorieEstimateTitle}
        onClose={() => { resetWorkoutForm(); setWorkoutOpen(false); }}
        onShown={() => durationInputRef.current?.focus()}
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
                      <Ionicons name={t.icon as any} size={16} color={active ? colors.onAccent : colors.steps} />
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
                ref={durationInputRef}
                style={styles.inputField}
                keyboardType="number-pad"
                placeholder={LABELS.activity.durationPlaceholder}
                placeholderTextColor={colors.inkFaint}
                value={durationInput}
                onChangeText={setDurationInput}
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
                <Ionicons name={t.icon as any} size={16} color={colors.steps} />
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
                  ? LABELS.activity.calorieFormulaWithWeight.replace('{weight}', String(Math.round(todayTotals.latestWeight)))
                  : LABELS.activity.calorieFormulaDefaultWeight}
              </Text>
            </View>
            {calorieChartRows.map((row) => (
              <View key={row.label} style={styles.metRow}>
                <View style={styles.metRowHead}>
                  <View style={styles.metIconWrap}>
                    <Ionicons name={row.icon as any} size={14} color={colors.steps} />
                  </View>
                  <Text style={styles.metLabel}>{row.label}</Text>
                  <Text style={styles.metValue}>~{row.per30Min} kcal / 30min</Text>
                </View>
                <View style={styles.metBarTrack}>
                  <View style={[styles.metBarFill, { width: `${(row.met / maxMet) * 100}%` }]} />
                </View>
                <Text style={styles.metSubValue}>
                  MET {row.met}{row.perKm ? ` · ${LABELS.activity.perKmAtPace.replace('{perKm}', String(row.perKm))}` : ''}
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
        options={RANGE_OPTIONS.map((r) => ({ label: r.label, icon: r.icon as any, active: r.key === rangeKey, onPress: () => setRangeKey(r.key) }))}
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
