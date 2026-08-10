import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Card from '../components/Card';
import { useHealth } from '../store/healthStore';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { formatFriendlyDate } from '../utils/dateUtils';

// No food-logging feature exists yet — calorie/macro/meal data below is a
// static mockup of what that screen will show once built. Water Intake is
// real, wired to the same store as the rest of the app.
const CALORIE_TARGET = 2100;
const CALORIES_CONSUMED = 1420;
const CALORIES_BURNED = 320;
const CALORIES_REMAINING = CALORIE_TARGET - CALORIES_CONSUMED;
const NET_INTAKE = CALORIES_CONSUMED - CALORIES_BURNED;

const MACROS = [
  { key: 'protein', label: 'Protein', grams: 82, targetGrams: 120, pct: 68 },
  { key: 'carbs', label: 'Carbohydrates', grams: 156, targetGrams: 220, pct: 70 },
  { key: 'fats', label: 'Fats', grams: 48, targetGrams: 70, pct: 68 },
];

const MEALS = [
  { id: 'breakfast', icon: 'cafe-outline', title: 'Breakfast', subtitle: 'Oatmeal + Fresh Berries', kcal: 380, time: '08:15 AM' },
  { id: 'lunch', icon: 'restaurant-outline', title: 'Lunch', subtitle: 'Grilled Chicken Salad', kcal: 520, time: '01:10 PM' },
  { id: 'snack', icon: 'flask-outline', title: 'Snack', subtitle: 'Whey Protein Shake', kcal: 220, time: '04:30 PM' },
];

export default function NutritionScreen() {
  const { profile, todayTotals, addWater } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const macroColors = { protein: colors.steps, carbs: colors.primary, fats: colors.sleep };

  const waterGoalMl = profile?.goals?.waterGoalMl || 2500;
  const fillPct = Math.max(0, Math.min(1, todayTotals.waterMl / waterGoalMl));
  const waterLitres = (todayTotals.waterMl / 1000).toFixed(1);
  const waterGoalLitres = (waterGoalMl / 1000).toFixed(1);

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.stepsGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>{formatFriendlyDate()}</Text>
          </View>
          <TouchableOpacity style={styles.targetPill}>
            <Text style={styles.targetPillText}>Calorie Target</Text>
          </TouchableOpacity>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={CALORIES_CONSUMED / CALORIE_TARGET}
            size={100}
            strokeWidth={10}
            color={colors.steps}
            trackColor={colors.line}
            centerTop="Remaining"
            centerValue={CALORIES_REMAINING}
            centerLabel="kcal"
          />
          <View style={styles.heroText}>
            <Text style={styles.caption}>Consumed</Text>
            <Text style={styles.heroValue}>
              {CALORIES_CONSUMED.toLocaleString()} <Text style={styles.heroValueUnit}>/ {CALORIE_TARGET.toLocaleString()} kcal</Text>
            </Text>
            <View style={styles.heroSubRow}>
              <View>
                <Text style={styles.caption}>Burned</Text>
                <Text style={[styles.heroSubValue, { color: colors.primary }]}>+ {CALORIES_BURNED} kcal</Text>
              </View>
              <View>
                <Text style={styles.caption}>Net Intake</Text>
                <Text style={[styles.heroSubValue, { color: colors.water }]}>{NET_INTAKE.toLocaleString()} kcal</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Daily Macrostats</Text>
          {MACROS.map((m) => (
            <View key={m.key} style={styles.macroRow}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroLabel}>{m.label}</Text>
                <Text style={styles.macroValue}>
                  {m.grams}g / {m.targetGrams}g <Text style={styles.caption}>({m.pct}%)</Text>
                </Text>
              </View>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${m.pct}%`, backgroundColor: macroColors[m.key] }]} />
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.listHeading}>Today's Meals</Text>
        {MEALS.map((meal) => (
          <Card key={meal.id}>
            <View style={styles.mealRow}>
              <View style={[styles.mealIcon, { backgroundColor: colors.stepsSoft }]}>
                <Ionicons name={meal.icon} size={18} color={colors.steps} />
              </View>
              <View style={styles.mealText}>
                <Text style={styles.mealTitle}>{meal.title}</Text>
                <Text style={styles.mealSubtitle}>{meal.subtitle}</Text>
              </View>
              <View style={styles.mealTrailing}>
                <Text style={styles.mealKcal}>{meal.kcal} kcal</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>
            </View>
          </Card>
        ))}

        <Card>
          <View style={styles.waterRow}>
            <RingGauge progress={fillPct} size={44} strokeWidth={5} color={colors.water} trackColor={colors.waterSoft} centerValue={`${Math.round(fillPct * 100)}%`} />
            <View style={styles.waterText}>
              <Text style={styles.mealTitle}>
                {waterLitres}L <Text style={styles.caption}>/ {waterGoalLitres}L</Text>
              </Text>
              <Text style={styles.mealSubtitle}>Water Intake</Text>
            </View>
            <TouchableOpacity style={[styles.addCircle, { backgroundColor: colors.steps }]} onPress={() => addWater(250)}>
              <Ionicons name="add" size={20} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
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
    targetPill: {
      backgroundColor: colors.stepsSoft,
      borderWidth: 1,
      borderColor: colors.stepsGlow,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    targetPillText: { fontSize: 12, fontWeight: '700', color: colors.steps },

    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
    heroValueUnit: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
    heroSubRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
    heroSubValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
    caption: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

    macroRow: { marginBottom: spacing.md },
    macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    macroLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
    macroValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
    macroTrack: { height: 7, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
    macroFill: { height: '100%', borderRadius: 4 },

    listHeading: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.sm },
    mealRow: { flexDirection: 'row', alignItems: 'center' },
    mealIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    mealText: { flex: 1 },
    mealTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
    mealSubtitle: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    mealTrailing: { alignItems: 'flex-end' },
    mealKcal: { fontSize: 13, fontWeight: '700', color: colors.ink },
    mealTime: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },

    waterRow: { flexDirection: 'row', alignItems: 'center' },
    waterText: { flex: 1, marginLeft: spacing.sm },
    addCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  });
