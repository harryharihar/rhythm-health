import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Card from '../components/Card';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { formatFriendlyDate, formatShortTime } from '../utils/dateUtils';
import { estimateCaloriesFromSteps } from '../utils/healthCalculations';

const MEAL_TYPES = [
  { label: 'Breakfast', icon: 'cafe-outline' },
  { label: 'Lunch', icon: 'restaurant-outline' },
  { label: 'Dinner', icon: 'pizza-outline' },
  { label: 'Snack', icon: 'flask-outline' },
];
const iconForMeal = (type) => MEAL_TYPES.find((t) => t.label === type)?.icon || 'restaurant-outline';

export default function NutritionScreen() {
  const { profile, todayTotals, addWater, addMeal, updateGoals } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [mealOpen, setMealOpen] = useState(false);
  const [mealType, setMealType] = useState(MEAL_TYPES[0].label);
  const [nameInput, setNameInput] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatsInput, setFatsInput] = useState('');

  const [targetOpen, setTargetOpen] = useState(false);
  const [targetInputs, setTargetInputs] = useState({ calorieGoal: '', proteinGoalG: '', carbsGoalG: '', fatsGoalG: '' });

  const goals = profile?.goals || {};
  const calorieTarget = goals.calorieGoal || 2100;
  const macroColors = { protein: colors.steps, carbs: colors.primary, fats: colors.sleep };

  const caloriesConsumed = todayTotals.caloriesConsumed;
  const caloriesBurned = estimateCaloriesFromSteps(todayTotals.stepsCount);
  const caloriesRemaining = calorieTarget - caloriesConsumed;
  const netIntake = caloriesConsumed - caloriesBurned;

  const macros = useMemo(() => {
    const rows = [
      { key: 'protein', label: 'Protein', grams: Math.round(todayTotals.proteinG), targetGrams: goals.proteinGoalG || 120 },
      { key: 'carbs', label: 'Carbohydrates', grams: Math.round(todayTotals.carbsG), targetGrams: goals.carbsGoalG || 220 },
      { key: 'fats', label: 'Fats', grams: Math.round(todayTotals.fatsG), targetGrams: goals.fatsGoalG || 70 },
    ];
    return rows.map((r) => ({ ...r, pct: r.targetGrams ? Math.round((r.grams / r.targetGrams) * 100) : 0 }));
  }, [todayTotals, goals]);

  const waterGoalMl = goals.waterGoalMl || 2500;
  const fillPct = Math.max(0, Math.min(1, todayTotals.waterMl / waterGoalMl));
  const waterLitres = (todayTotals.waterMl / 1000).toFixed(1);
  const waterGoalLitres = (waterGoalMl / 1000).toFixed(1);

  const resetMealForm = () => {
    setMealType(MEAL_TYPES[0].label);
    setNameInput('');
    setCaloriesInput('');
    setProteinInput('');
    setCarbsInput('');
    setFatsInput('');
  };

  const submitMeal = () => {
    const kcal = Number(caloriesInput);
    if (!nameInput.trim() || !(kcal > 0)) return;
    addMeal({
      mealType,
      name: nameInput.trim(),
      caloriesKcal: kcal,
      proteinG: Number(proteinInput) || 0,
      carbsG: Number(carbsInput) || 0,
      fatsG: Number(fatsInput) || 0,
    });
    resetMealForm();
    setMealOpen(false);
  };

  const openTargets = () => {
    setTargetInputs({
      calorieGoal: String(goals.calorieGoal || 2100),
      proteinGoalG: String(goals.proteinGoalG || 120),
      carbsGoalG: String(goals.carbsGoalG || 220),
      fatsGoalG: String(goals.fatsGoalG || 70),
    });
    setTargetOpen(true);
  };

  const saveTargets = () => {
    updateGoals({
      calorieGoal: Number(targetInputs.calorieGoal) || 2100,
      proteinGoalG: Number(targetInputs.proteinGoalG) || 120,
      carbsGoalG: Number(targetInputs.carbsGoalG) || 220,
      fatsGoalG: Number(targetInputs.fatsGoalG) || 70,
    });
    setTargetOpen(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.stepsGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>{formatFriendlyDate()}</Text>
          </View>
          <TouchableOpacity style={styles.targetPill} onPress={openTargets}>
            <Text style={styles.targetPillText}>Calorie Target</Text>
          </TouchableOpacity>
        </View>

        <Card contentStyle={styles.heroCard}>
          <RingGauge
            progress={calorieTarget ? caloriesConsumed / calorieTarget : 0}
            size={100}
            strokeWidth={10}
            color={colors.steps}
            trackColor={colors.line}
            centerTop="Remaining"
            centerValue={caloriesRemaining}
            centerLabel="kcal"
          />
          <View style={styles.heroText}>
            <Text style={styles.caption}>Consumed</Text>
            <Text style={styles.heroValue}>
              {caloriesConsumed.toLocaleString()} <Text style={styles.heroValueUnit}>/ {calorieTarget.toLocaleString()} kcal</Text>
            </Text>
            <View style={styles.heroSubRow}>
              <View>
                <Text style={styles.caption}>Burned</Text>
                <Text style={[styles.heroSubValue, { color: colors.primary }]}>+ {caloriesBurned} kcal</Text>
              </View>
              <View>
                <Text style={styles.caption}>Net Intake</Text>
                <Text style={[styles.heroSubValue, { color: colors.water }]}>{netIntake.toLocaleString()} kcal</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Daily Macrostats</Text>
          {macros.map((m) => (
            <View key={m.key} style={styles.macroRow}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroLabel}>{m.label}</Text>
                <Text style={styles.macroValue}>
                  {m.grams}g / {m.targetGrams}g <Text style={styles.caption}>({m.pct}%)</Text>
                </Text>
              </View>
              <View style={styles.macroTrack}>
                <View style={[styles.macroFill, { width: `${Math.min(100, m.pct)}%`, backgroundColor: macroColors[m.key] }]} />
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.cardHeaderRow}>
          <Text style={styles.listHeading}>Today's Meals</Text>
          <TouchableOpacity style={styles.logBtn} onPress={() => setMealOpen(true)}>
            <Ionicons name="add" size={14} color={colors.steps} />
            <Text style={styles.logBtnText}>Log Meal</Text>
          </TouchableOpacity>
        </View>
        {todayTotals.todayMeals.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No meals logged yet — tap "Log Meal" to add your first one.</Text>
          </Card>
        ) : (
          todayTotals.todayMeals.map((meal) => (
            <Card key={meal.id}>
              <View style={styles.mealRow}>
                <View style={[styles.mealIcon, { backgroundColor: colors.stepsSoft }]}>
                  <Ionicons name={iconForMeal(meal.mealType)} size={18} color={colors.steps} />
                </View>
                <View style={styles.mealText}>
                  <Text style={styles.mealTitle}>{meal.mealType}</Text>
                  <Text style={styles.mealSubtitle}>{meal.name}</Text>
                </View>
                <View style={styles.mealTrailing}>
                  <Text style={styles.mealKcal}>{meal.caloriesKcal} kcal</Text>
                  <Text style={styles.mealTime}>{formatShortTime(meal.timestamp)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

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

      <QuickAddSheet visible={mealOpen} title="Log meal" onClose={() => { resetMealForm(); setMealOpen(false); }}>
        <View style={styles.typePicker}>
          {MEAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.label}
              style={[styles.typeChip, mealType === t.label && styles.typeChipActive]}
              onPress={() => setMealType(t.label)}
            >
              <Ionicons name={t.icon} size={14} color={mealType === t.label ? colors.steps : colors.inkSoft} />
              <Text style={[styles.typeChipText, mealType === t.label && styles.typeChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="What did you eat?"
          placeholderTextColor={colors.inkFaint}
          value={nameInput}
          onChangeText={setNameInput}
        />
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Calories"
          placeholderTextColor={colors.inkFaint}
          value={caloriesInput}
          onChangeText={setCaloriesInput}
        />
        <View style={styles.macroInputRow}>
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Protein g"
            placeholderTextColor={colors.inkFaint}
            value={proteinInput}
            onChangeText={setProteinInput}
          />
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Carbs g"
            placeholderTextColor={colors.inkFaint}
            value={carbsInput}
            onChangeText={setCarbsInput}
          />
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Fats g"
            placeholderTextColor={colors.inkFaint}
            value={fatsInput}
            onChangeText={setFatsInput}
          />
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={submitMeal}>
          <Text style={styles.submitLabel}>Save</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <QuickAddSheet visible={targetOpen} title="Daily targets" onClose={() => setTargetOpen(false)}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Calorie target"
          placeholderTextColor={colors.inkFaint}
          value={targetInputs.calorieGoal}
          onChangeText={(v) => setTargetInputs((f) => ({ ...f, calorieGoal: v }))}
        />
        <View style={styles.macroInputRow}>
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Protein g"
            placeholderTextColor={colors.inkFaint}
            value={targetInputs.proteinGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, proteinGoalG: v }))}
          />
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Carbs g"
            placeholderTextColor={colors.inkFaint}
            value={targetInputs.carbsGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, carbsGoalG: v }))}
          />
          <TextInput
            style={[styles.input, styles.macroInput]}
            keyboardType="number-pad"
            placeholder="Fats g"
            placeholderTextColor={colors.inkFaint}
            value={targetInputs.fatsGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, fatsGoalG: v }))}
          />
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={saveTargets}>
          <Text style={styles.submitLabel}>Save</Text>
        </TouchableOpacity>
      </QuickAddSheet>
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

    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    listHeading: { fontSize: 16, fontWeight: '800', color: colors.ink },
    logBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.stepsSoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    logBtnText: { fontSize: 11.5, fontWeight: '700', color: colors.steps },
    empty: { fontSize: 13, color: colors.inkSoft },
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

    typePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: { backgroundColor: colors.stepsSoft, borderColor: colors.steps },
    typeChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
    typeChipTextActive: { color: colors.steps },

    macroInputRow: { flexDirection: 'row', gap: spacing.sm },
    macroInput: { flex: 1 },

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
    submitBtn: { backgroundColor: colors.steps, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  });
