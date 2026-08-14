import React, { useMemo, useRef } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DailyArc from '../../components/DailyArc';
import Card from '../../components/Card';
import Pill from '../../components/Pill';
import ScreenHeader from '../../components/ScreenHeader';
import WeekBars from '../../components/WeekBars';
import QuickAddSheet from '../../components/QuickAddSheet';
import { useThemeColors } from '../../theme/useTheme';
import { formatShortTime } from '../../utils/dateUtils';
import { LABELS } from '../../constants/labels';
import { useWaterScreen } from './useWaterScreen';
import { makeStyles } from './WaterScreen.styles';

export default function WaterScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    goalMl,
    todayLogs,
    totalMl,
    weekData,
    fillPct,
    customOpen,
    setCustomOpen,
    customValue,
    setCustomValue,
    submitCustom,
    addWater,
  } = useWaterScreen();
  const customInputRef = useRef<TextInput>(null);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.waterGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <ScreenHeader eyebrow={LABELS.water.eyebrow} accent={colors.water} title={LABELS.water.title} subtitle={`Goal ${goalMl} ml`} />

        <DailyArc
          label={LABELS.water.todaysIntake}
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
          <Pill label={LABELS.water.addQuick250} color={colors.water} soft={colors.waterSoft} onPress={() => addWater(250)} />
          <Pill label={LABELS.water.addQuick500} color={colors.water} soft={colors.waterSoft} onPress={() => addWater(500)} />
          <Pill label={LABELS.water.addCustom} color={colors.water} soft={colors.waterSoft} onPress={() => setCustomOpen(true)} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>{LABELS.water.loggedToday}</Text>
          {todayLogs.length === 0 ? (
            <Text style={styles.empty}>{LABELS.water.emptyToday}</Text>
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
          <Text style={styles.cardTitle}>{LABELS.water.past7Days}</Text>
          <WeekBars data={weekData} color={colors.water} trackColor={colors.waterSoft} />
        </Card>

        <QuickAddSheet
          visible={customOpen}
          title={LABELS.water.customDialogTitle}
          onClose={() => setCustomOpen(false)}
          onShown={() => customInputRef.current?.focus()}
        >
          <TextInput
            ref={customInputRef}
            style={styles.input}
            keyboardType="number-pad"
            placeholder={LABELS.water.amountPlaceholder}
            placeholderTextColor={colors.inkFaint}
            value={customValue}
            onChangeText={setCustomValue}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submitCustom}>
            <Text style={styles.submitLabel}>{LABELS.water.addSubmit}</Text>
          </TouchableOpacity>
        </QuickAddSheet>
      </ScrollView>
    </View>
  );
}
