import React, { useMemo } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../../components/RingGauge';
import Sparkline from '../../components/Sparkline';
import Card from '../../components/Card';
import QuickAddSheet from '../../components/QuickAddSheet';
import InfoModal from '../../components/InfoModal';
import { useThemeColors } from '../../theme/useTheme';
import { bedtimeOptions, formatHoursMinutes, wakeTimeOptions } from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';
import { QUALITY, STAGE_INFO, sleepPhasesSourceNote } from './sleepCalculations';
import { useSleepScreen } from './useSleepScreen';
import { makeStyles } from './SleepScreen.styles';

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SleepScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    logOpen, setLogOpen,
    quality, setQuality,
    qualityTouched, setQualityTouched,
    phasesInfoOpen, setPhasesInfoOpen,
    bedtimeValue, setBedtimeValue,
    wakeTimeValue, setWakeTimeValue,
    goal,
    bedtimeGoal,
    wakeTimeGoal,
    computedHours,
    hasAutoSleep,
    sleepHours,
    bedtimeDisplay,
    wakeTimeDisplay,
    bedtimeStatus,
    score,
    qualityLabel,
    stages,
    weekData,
    consistencyInsight,
    derivedQuality,
    effectiveQuality,
    bedtimeScrollRef,
    wakeTimeScrollRef,
    openLogSheet,
    submit,
  } = useSleepScreen();

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
            <Text style={styles.caption}>{LABELS.sleep.target.replace('{goal}', String(goal))}</Text>
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
              <Ionicons name={s.icon as any} size={16} color={colors.sleep} />
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
