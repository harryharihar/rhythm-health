import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../components/RingGauge';
import Sparkline from '../components/Sparkline';
import Card from '../components/Card';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { dayBuckets, formatFriendlyDate, formatShortTime, monthBuckets, sumByBuckets, weekBuckets } from '../utils/dateUtils';
import { estimateCaloriesFromSteps, groupWorkoutsByType } from '../utils/healthCalculations';
import { FOOD_CATEGORIES, FOOD_DATABASE } from '../data/foodDatabase';
import { LABELS } from '../constants/labels';

const MEAL_TYPES = [
  { label: LABELS.nutrition.mealBreakfast, icon: 'cafe-outline' },
  { label: LABELS.nutrition.mealLunch, icon: 'restaurant-outline' },
  { label: LABELS.nutrition.mealDinner, icon: 'pizza-outline' },
  { label: LABELS.nutrition.mealSnack, icon: 'flask-outline' },
];
const iconForMeal = (type) => MEAL_TYPES.find((t) => t.label === type)?.icon || 'restaurant-outline';

// Same period options as the Activity screen's Time Period picker, for a
// consistent way to look back at past nutrition data.
const RANGE_OPTIONS = [
  { key: 'week', label: LABELS.activity.rangeThisWeek, icon: 'today-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 0, 'narrow') },
  { key: 'lastWeek', label: LABELS.activity.rangeLastWeek, icon: 'arrow-undo-outline', totalDays: 7, getBuckets: () => dayBuckets(7, 7, 'narrow') },
  { key: '2weeks', label: LABELS.activity.range2Weeks, icon: 'calendar-outline', totalDays: 14, getBuckets: () => dayBuckets(14, 0, 'narrow') },
  { key: 'month', label: LABELS.activity.range1Month, icon: 'calendar-number-outline', totalDays: 30, getBuckets: () => weekBuckets(4) },
  { key: '3months', label: LABELS.activity.range3Months, icon: 'calendar-clear-outline', totalDays: 91, getBuckets: () => monthBuckets(3) },
  { key: '6months', label: LABELS.activity.range6Months, icon: 'stats-chart-outline', totalDays: 182, getBuckets: () => monthBuckets(6) },
  { key: '9months', label: LABELS.activity.range9Months, icon: 'bar-chart-outline', totalDays: 273, getBuckets: () => monthBuckets(9) },
  { key: 'year', label: LABELS.activity.range1Year, icon: 'trending-up-outline', totalDays: 365, getBuckets: () => monthBuckets(12) },
];

// Commonly cited minimum daily intake for adults — used only to flag a
// possible under-fueling day, not as medical guidance.
const LOW_INTAKE_FLOOR_KCAL = 1200;

function MacroField({ styles, colors, icon, iconColor, label, value, onChangeText }) {
  return (
    <View style={styles.macroField}>
      <View style={styles.macroFieldHead}>
        <Ionicons name={icon} size={12} color={iconColor} />
        <Text style={styles.macroFieldLabel}>{label}</Text>
      </View>
      <View style={styles.macroFieldInputWrap}>
        <TextInput
          style={styles.macroFieldInput}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.inkFaint}
          value={value}
          onChangeText={onChangeText}
        />
        <Text style={styles.macroFieldSuffix}>g</Text>
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const { profile, todayTotals, steps, workouts, meals, addWater, addMeal, updateGoals } = useHealth();
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

  const [rangeKey, setRangeKey] = useState('week');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // 'form' | 'foodPicker' — the food search replaces the form in place
  // (rather than opening as a second stacked sheet), matching how the
  // Activity screen's Log Workout info pages work.
  const [mealSheetView, setMealSheetView] = useState('form');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState(null);
  const [selectedFoods, setSelectedFoods] = useState([]);

  const goals = profile?.goals || {};
  const calorieTarget = goals.calorieGoal || 2100;
  const macroColors = { protein: colors.steps, carbs: colors.primary, fats: colors.sleep };

  const filteredFoods = useMemo(() => {
    const q = foodSearch.trim().toLowerCase();
    return FOOD_DATABASE.filter((f) => (!foodCategory || f.category === foodCategory) && (!q || f.name.toLowerCase().includes(q)));
  }, [foodSearch, foodCategory]);

  const toggleFoodSelected = (food) => {
    setSelectedFoods((prev) => (prev.some((f) => f.name === food.name) ? prev.filter((f) => f.name !== food.name) : [...prev, food]));
  };

  const selectedFoodsTotals = useMemo(
    () =>
      selectedFoods.reduce(
        (acc, f) => ({
          caloriesKcal: acc.caloriesKcal + f.caloriesKcal,
          proteinG: acc.proteinG + f.proteinG,
          carbsG: acc.carbsG + f.carbsG,
          fatsG: acc.fatsG + f.fatsG,
        }),
        { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 }
      ),
    [selectedFoods]
  );

  // Adds the picked foods on top of whatever's already in the form, so
  // picking rice then going back for roti combines into ONE meal entry
  // instead of creating a duplicate "Lunch" row for each food.
  const addSelectedFoods = () => {
    if (selectedFoods.length === 0) {
      setMealSheetView('form');
      return;
    }
    const names = selectedFoods.map((f) => f.name).join(', ');
    setNameInput((prev) => (prev.trim() ? `${prev}, ${names}` : names));
    setCaloriesInput((prev) => String((Number(prev) || 0) + selectedFoodsTotals.caloriesKcal));
    setProteinInput((prev) => String((Number(prev) || 0) + selectedFoodsTotals.proteinG));
    setCarbsInput((prev) => String((Number(prev) || 0) + selectedFoodsTotals.carbsG));
    setFatsInput((prev) => String((Number(prev) || 0) + selectedFoodsTotals.fatsG));
    setSelectedFoods([]);
    setMealSheetView('form');
    setFoodSearch('');
    setFoodCategory(null);
  };

  const caloriesConsumed = todayTotals.caloriesConsumed;

  const stepsCaloriesToday = estimateCaloriesFromSteps(todayTotals.stepsCount);
  const workoutCaloriesToday = todayTotals.workoutCaloriesKcal || 0;
  const caloriesBurned = stepsCaloriesToday + workoutCaloriesToday;
  const workoutsByTypeToday = useMemo(() => groupWorkoutsByType(todayTotals.todayWorkouts), [todayTotals.todayWorkouts]);
  const burnedCaption = workoutCaloriesToday > 0
    ? LABELS.nutrition.burnedCaptionWithWorkouts.replace('{types}', workoutsByTypeToday.map((w) => w.type).join(', '))
    : LABELS.nutrition.burnedCaptionStepsOnly;

  const caloriesRemaining = calorieTarget - caloriesConsumed;
  const netIntake = caloriesConsumed - caloriesBurned;

  // A negative Net Intake isn't automatically good or bad — a deficit from a
  // full day of eating is normal, but a deficit built on barely eating is a
  // warning sign. This looks at actual intake level, not just the sign of
  // the net number, before deciding which message to show.
  const intakeAdvisory = useMemo(() => {
    if (caloriesBurned < 50) return null;
    if (caloriesConsumed === 0) {
      return { tone: 'warning', text: LABELS.nutrition.advisoryNoMealsLogged.replace('{burned}', caloriesBurned) };
    }
    if (caloriesConsumed < LOW_INTAKE_FLOOR_KCAL && netIntake < -400) {
      return { tone: 'warning', text: LABELS.nutrition.advisoryLowIntake.replace('{consumed}', caloriesConsumed) };
    }
    if (netIntake < -200) {
      return { tone: 'positive', text: LABELS.nutrition.advisoryHealthyDeficit };
    }
    if (netIntake > 200) {
      return { tone: 'neutral', text: LABELS.nutrition.advisorySurplus };
    }
    return { tone: 'neutral', text: LABELS.nutrition.advisoryBalanced };
  }, [caloriesBurned, caloriesConsumed, netIntake]);
  const advisoryColor =
    intakeAdvisory?.tone === 'warning' ? colors.danger : intakeAdvisory?.tone === 'positive' ? colors.primary : colors.inkSoft;

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[0];
  const buckets = useMemo(() => range.getBuckets(), [rangeKey]);
  const consumedByBucket = useMemo(() => sumByBuckets(meals, buckets, 'caloriesKcal'), [meals, buckets]);
  const stepsByBucket = useMemo(() => sumByBuckets(steps, buckets, 'count'), [steps, buckets]);
  const workoutCalByBucket = useMemo(() => sumByBuckets(workouts, buckets, 'caloriesKcal'), [workouts, buckets]);
  const netByBucket = useMemo(
    () =>
      buckets.map((b, i) => {
        const consumed = consumedByBucket[i]?.value || 0;
        const burned = estimateCaloriesFromSteps(stepsByBucket[i]?.value || 0) + (workoutCalByBucket[i]?.value || 0);
        return { key: b.key, label: b.label, value: consumed - burned };
      }),
    [buckets, consumedByBucket, stepsByBucket, workoutCalByBucket]
  );
  const avgNetPerDay = Math.round(netByBucket.reduce((acc, d) => acc + d.value, 0) / range.totalDays);

  const macros = useMemo(() => {
    const rows = [
      { key: 'protein', label: LABELS.nutrition.protein, grams: Math.round(todayTotals.proteinG), targetGrams: goals.proteinGoalG || 120 },
      { key: 'carbs', label: LABELS.nutrition.carbohydrates, grams: Math.round(todayTotals.carbsG), targetGrams: goals.carbsGoalG || 220 },
      { key: 'fats', label: LABELS.nutrition.fats, grams: Math.round(todayTotals.fatsG), targetGrams: goals.fatsGoalG || 70 },
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
    setMealSheetView('form');
    setFoodSearch('');
    setFoodCategory(null);
    setSelectedFoods([]);
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
            <Text style={styles.title}>{LABELS.nutrition.title}</Text>
            <Text style={styles.subtitle}>{formatFriendlyDate()}</Text>
          </View>
          <TouchableOpacity style={styles.targetPill} onPress={openTargets}>
            <Text style={styles.targetPillText}>{LABELS.nutrition.calorieTarget}</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={styles.heroHeadRow}>
            <View style={styles.todayTag}>
              <Text style={styles.todayTagText}>{LABELS.nutrition.today}</Text>
            </View>
            <TouchableOpacity onPress={() => setInfoOpen(true)} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroCard}>
            <RingGauge
              progress={calorieTarget ? caloriesConsumed / calorieTarget : 0}
              size={100}
              strokeWidth={10}
              color={colors.steps}
              trackColor={colors.line}
              centerTop={LABELS.nutrition.remaining}
              centerValue={caloriesRemaining}
              centerLabel={LABELS.nutrition.kcal}
            />
            <View style={styles.heroText}>
              <Text style={styles.caption}>{LABELS.nutrition.consumed}</Text>
              <Text style={styles.heroValue}>
                {caloriesConsumed.toLocaleString()} <Text style={styles.heroValueUnit}>/ {calorieTarget.toLocaleString()} kcal</Text>
              </Text>
              <View style={styles.heroSubRow}>
                <View>
                  <Text style={styles.caption}>{LABELS.nutrition.burned}</Text>
                  <Text style={[styles.heroSubValue, { color: colors.primary }]}>+ {caloriesBurned} kcal</Text>
                  <Text style={styles.sourceCaption} numberOfLines={1}>{burnedCaption}</Text>
                </View>
                <View>
                  <Text style={styles.caption}>{LABELS.nutrition.netIntake}</Text>
                  <Text style={[styles.heroSubValue, { color: colors.water }]}>{netIntake.toLocaleString()} kcal</Text>
                </View>
              </View>
            </View>
          </View>
          {intakeAdvisory && (
            <View style={[styles.advisoryRow, { borderTopColor: colors.border }]}>
              <Ionicons
                name={intakeAdvisory.tone === 'warning' ? 'warning-outline' : intakeAdvisory.tone === 'positive' ? 'checkmark-circle-outline' : 'information-circle-outline'}
                size={14}
                color={advisoryColor}
              />
              <Text style={[styles.advisoryText, { color: advisoryColor }]}>{intakeAdvisory.text}</Text>
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitleRow}>{LABELS.nutrition.calorieTrend}</Text>
            <TouchableOpacity style={styles.filterPill} onPress={() => setRangeOpen(true)}>
              <Text style={styles.filterPillText}>{range.label}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>
            {LABELS.nutrition.avgNet}
            <Text style={{ fontWeight: '800', color: avgNetPerDay < 0 ? colors.primary : colors.water }}>
              {LABELS.nutrition.kcalPerDay.replace('{sign}', avgNetPerDay > 0 ? '+' : '').replace('{value}', avgNetPerDay.toLocaleString())}
            </Text>
          </Text>
          <Sparkline data={netByBucket.map((d) => d.value)} color={colors.steps} refValue={0} refColor={colors.inkFaint} width={280} height={90} strokeWidth={2.5} dots />
          <View style={styles.axisRow}>
            {netByBucket.map((d) => (
              <Text key={d.key} style={styles.axisLabel} numberOfLines={1}>{d.label}</Text>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>{LABELS.nutrition.dailyMacrostats}</Text>
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
          <Text style={styles.listHeading}>{LABELS.nutrition.todaysMeals}</Text>
          <TouchableOpacity
            style={[styles.logBtn, rangeKey !== 'week' && styles.logBtnDisabled]}
            onPress={() => setMealOpen(true)}
            disabled={rangeKey !== 'week'}
          >
            <Ionicons name="add" size={14} color={rangeKey !== 'week' ? colors.inkFaint : colors.steps} />
            <Text style={[styles.logBtnText, rangeKey !== 'week' && styles.logBtnTextDisabled]}>{LABELS.nutrition.logMeal}</Text>
          </TouchableOpacity>
        </View>
        {rangeKey !== 'week' && (
          <View style={styles.rangeNoteRow}>
            <Ionicons name="information-circle-outline" size={12} color={colors.inkSoft} />
            <Text style={styles.rangeNoteText}>{LABELS.nutrition.rangeNoteMeal}</Text>
          </View>
        )}
        {todayTotals.todayMeals.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{LABELS.nutrition.emptyMeals}</Text>
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
              <Text style={styles.mealSubtitle}>{LABELS.nutrition.waterIntake}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addCircle, { backgroundColor: colors.steps }, rangeKey !== 'week' && styles.addCircleDisabled]}
              onPress={() => addWater(250)}
              disabled={rangeKey !== 'week'}
            >
              <Ionicons name="add" size={20} color={rangeKey !== 'week' ? colors.inkFaint : colors.onAccent} />
            </TouchableOpacity>
          </View>
          {rangeKey !== 'week' && (
            <View style={[styles.rangeNoteRow, { marginTop: spacing.sm, marginBottom: 0 }]}>
              <Ionicons name="information-circle-outline" size={12} color={colors.inkSoft} />
              <Text style={styles.rangeNoteText}>{LABELS.nutrition.rangeNoteWater}</Text>
            </View>
          )}
        </Card>
      </ScrollView>

      <QuickAddSheet
        visible={mealOpen}
        title={mealSheetView === 'form' ? LABELS.nutrition.logMealTitle : LABELS.nutrition.searchFoodListTitle}
        onClose={() => { resetMealForm(); setMealOpen(false); }}
      >
        {mealSheetView === 'foodPicker' && (
          <TouchableOpacity style={styles.backRow} onPress={() => setMealSheetView('form')} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={colors.steps} />
            <Text style={styles.backLabel}>{LABELS.activity.back}</Text>
          </TouchableOpacity>
        )}

        {mealSheetView === 'form' && (
          <>
            <View style={styles.sheetInfoRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
              <Text style={styles.sheetInfoText}>{LABELS.activity.entriesRecordedToday}</Text>
            </View>

            <Text style={styles.fieldLabel}>{LABELS.nutrition.mealType}</Text>
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

            <Text style={styles.fieldLabel}>{LABELS.nutrition.whatDidYouEat}</Text>
            <TextInput
              style={styles.input}
              placeholder={LABELS.nutrition.mealNamePlaceholder}
              placeholderTextColor={colors.inkFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />
            <TouchableOpacity style={styles.foodDbBtn} onPress={() => setMealSheetView('foodPicker')}>
              <Ionicons name="search-outline" size={14} color={colors.steps} />
              <Text style={styles.foodDbBtnText}>{LABELS.nutrition.searchFoodListPrompt}</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>{LABELS.nutrition.calories}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="flame-outline" size={16} color={colors.steps} />
              </View>
              <TextInput
                style={styles.inputField}
                keyboardType="number-pad"
                placeholder={LABELS.nutrition.caloriesPlaceholder}
                placeholderTextColor={colors.inkFaint}
                value={caloriesInput}
                onChangeText={setCaloriesInput}
              />
              <Text style={styles.inputSuffix}>{LABELS.nutrition.kcal}</Text>
            </View>

            <Text style={styles.fieldLabel}>{LABELS.nutrition.macrosOptional}</Text>
            <View style={styles.macroFieldRow}>
              <MacroField styles={styles} colors={colors} icon="barbell-outline" iconColor={macroColors.protein} label={LABELS.nutrition.protein} value={proteinInput} onChangeText={setProteinInput} />
              <MacroField styles={styles} colors={colors} icon="leaf-outline" iconColor={macroColors.carbs} label={LABELS.nutrition.carbs} value={carbsInput} onChangeText={setCarbsInput} />
              <MacroField styles={styles} colors={colors} icon="water-outline" iconColor={macroColors.fats} label={LABELS.nutrition.fats} value={fatsInput} onChangeText={setFatsInput} />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={submitMeal}>
              <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
            </TouchableOpacity>
          </>
        )}

        {mealSheetView === 'foodPicker' && (
          <>
            <View style={styles.sheetInfoRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
              <Text style={styles.sheetInfoText}>{LABELS.nutrition.foodPickerInfo}</Text>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="search-outline" size={16} color={colors.steps} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder={LABELS.nutrition.foodSearchPlaceholder}
                placeholderTextColor={colors.inkFaint}
                value={foodSearch}
                onChangeText={setFoodSearch}
                autoFocus
              />
            </View>
            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[styles.categoryChip, !foodCategory && styles.categoryChipActive]}
                onPress={() => setFoodCategory(null)}
              >
                <Text style={[styles.categoryChipText, !foodCategory && styles.categoryChipTextActive]}>{LABELS.nutrition.all}</Text>
              </TouchableOpacity>
              {FOOD_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, foodCategory === cat && styles.categoryChipActive]}
                  onPress={() => setFoodCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, foodCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredFoods.length === 0 ? (
              <Text style={styles.empty}>{LABELS.nutrition.emptyFoods}</Text>
            ) : (
              filteredFoods.map((food) => {
                const selected = selectedFoods.some((f) => f.name === food.name);
                return (
                  <TouchableOpacity
                    key={food.name}
                    style={[styles.foodRow, selected && styles.foodRowSelected]}
                    onPress={() => toggleFoodSelected(food)}
                  >
                    <View style={[styles.foodRowCheck, selected && styles.foodRowCheckActive]}>
                      {selected ? <Ionicons name="checkmark" size={13} color={colors.onAccent} /> : null}
                    </View>
                    <View style={styles.foodRowText}>
                      <Text style={styles.foodRowName}>{food.name}</Text>
                      <Text style={styles.foodRowServing}>{food.serving}</Text>
                      <Text style={styles.foodRowMacros}>
                        P {food.proteinG}g · C {food.carbsG}g · F {food.fatsG}g
                      </Text>
                    </View>
                    <Text style={styles.foodRowKcal}>{food.caloriesKcal} kcal</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[styles.submitBtn, selectedFoods.length === 0 && styles.submitBtnDisabled]}
              onPress={addSelectedFoods}
              disabled={selectedFoods.length === 0}
            >
              <Text style={styles.submitLabel}>
                {selectedFoods.length === 0
                  ? LABELS.nutrition.selectFoodsToAdd
                  : LABELS.nutrition.addItemsSummary
                      .replace('{n}', selectedFoods.length)
                      .replace('{s}', selectedFoods.length > 1 ? 's' : '')
                      .replace('{kcal}', selectedFoodsTotals.caloriesKcal)}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </QuickAddSheet>

      <QuickAddSheet visible={targetOpen} title={LABELS.nutrition.dailyTargetsTitle} onClose={() => setTargetOpen(false)}>
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.nutrition.dailyTargetsInfo}</Text>
        </View>

        <Text style={styles.fieldLabel}>{LABELS.nutrition.dailyCalorieTarget}</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputIconWrap}>
            <Ionicons name="flame-outline" size={16} color={colors.steps} />
          </View>
          <TextInput
            style={styles.inputField}
            keyboardType="number-pad"
            placeholder={LABELS.nutrition.calorieTargetPlaceholder}
            placeholderTextColor={colors.inkFaint}
            value={targetInputs.calorieGoal}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, calorieGoal: v }))}
          />
          <Text style={styles.inputSuffix}>{LABELS.nutrition.kcal}</Text>
        </View>

        <Text style={styles.fieldLabel}>{LABELS.nutrition.macroTargets}</Text>
        <View style={styles.macroFieldRow}>
          <MacroField
            styles={styles}
            colors={colors}
            icon="barbell-outline"
            iconColor={macroColors.protein}
            label={LABELS.nutrition.protein}
            value={targetInputs.proteinGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, proteinGoalG: v }))}
          />
          <MacroField
            styles={styles}
            colors={colors}
            icon="leaf-outline"
            iconColor={macroColors.carbs}
            label={LABELS.nutrition.carbs}
            value={targetInputs.carbsGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, carbsGoalG: v }))}
          />
          <MacroField
            styles={styles}
            colors={colors}
            icon="water-outline"
            iconColor={macroColors.fats}
            label={LABELS.nutrition.fats}
            value={targetInputs.fatsGoalG}
            onChangeText={(v) => setTargetInputs((f) => ({ ...f, fatsGoalG: v }))}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={saveTargets}>
          <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <QuickAddSheet
        visible={rangeOpen}
        title={LABELS.activity.timePeriodTitle}
        accentColor={colors.steps}
        options={RANGE_OPTIONS.map((r) => ({ label: r.label, icon: r.icon, active: r.key === rangeKey, onPress: () => setRangeKey(r.key) }))}
        onClose={() => setRangeOpen(false)}
      >
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.nutrition.timePeriodInfo}</Text>
        </View>
      </QuickAddSheet>

      <QuickAddSheet visible={infoOpen} title={LABELS.nutrition.aboutNumbersTitle} onClose={() => setInfoOpen(false)}>
        <View style={styles.infoDefRow}>
          <Text style={styles.infoDefTerm}>{LABELS.nutrition.consumed}</Text>
          <Text style={styles.infoDefText}>{LABELS.nutrition.defConsumedText}</Text>
        </View>
        <View style={styles.infoDefRow}>
          <Text style={styles.infoDefTerm}>{LABELS.nutrition.burned}</Text>
          <Text style={styles.infoDefText}>{LABELS.nutrition.defBurnedText}</Text>
        </View>
        <View style={styles.infoDefRow}>
          <Text style={styles.infoDefTerm}>{LABELS.nutrition.netIntake}</Text>
          <Text style={styles.infoDefText}>{LABELS.nutrition.defNetIntakeText}</Text>
        </View>
        <View style={styles.infoDefRow}>
          <Text style={styles.infoDefTerm}>{LABELS.nutrition.calorieTrend}</Text>
          <Text style={styles.infoDefText}>{LABELS.nutrition.defCalorieTrendText}</Text>
        </View>
        <View style={styles.sheetInfoRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.nutrition.generalGuidanceNote}</Text>
        </View>
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

    heroHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    todayTag: { backgroundColor: colors.stepsSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    todayTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.steps },
    heroCard: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: spacing.md },
    heroValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
    heroValueUnit: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
    heroSubRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
    heroSubValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },
    sourceCaption: { fontSize: 9.5, fontWeight: '600', color: colors.inkFaint, marginTop: 2 },
    advisoryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
    },
    advisoryText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 16 },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
    sectionTitleRow: { fontSize: 15, fontWeight: '800', color: colors.ink },
    caption: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },

    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    filterPillText: { fontSize: 12, fontWeight: '700', color: colors.ink },
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingHorizontal: 4 },
    axisLabel: { fontSize: 10, color: colors.inkSoft, fontWeight: '600' },

    infoDefRow: { marginBottom: spacing.md },
    infoDefTerm: { fontSize: 13.5, fontWeight: '800', color: colors.ink, marginBottom: 2 },
    infoDefText: { fontSize: 12.5, fontWeight: '500', color: colors.inkSoft, lineHeight: 17 },

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
    logBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    logBtnTextDisabled: { color: colors.inkFaint },
    rangeNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
    rangeNoteText: { fontSize: 11, fontWeight: '500', color: colors.inkSoft, flexShrink: 1 },
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
    addCircleDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

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

    sheetInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
    sheetInfoText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '500', flexShrink: 1 },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      marginBottom: spacing.md,
    },
    inputIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.stepsSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.ink },
    inputSuffix: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft, marginLeft: 6 },

    macroFieldRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    macroField: { flex: 1 },
    macroFieldHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    macroFieldLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
    macroFieldInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    macroFieldInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: colors.ink },
    macroFieldSuffix: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft },

    foodDbBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: spacing.md },
    foodDbBtnText: { fontSize: 12, fontWeight: '700', color: colors.steps },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
    backLabel: { fontSize: 14, fontWeight: '700', color: colors.steps },

    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md, marginTop: spacing.sm },
    categoryChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: { backgroundColor: colors.stepsSoft, borderColor: colors.steps },
    categoryChipText: { fontSize: 11.5, fontWeight: '600', color: colors.inkSoft },
    categoryChipTextActive: { color: colors.steps },

    foodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    foodRowSelected: { backgroundColor: colors.stepsSoft, borderBottomColor: 'transparent' },
    foodRowCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    foodRowCheckActive: { backgroundColor: colors.steps, borderColor: colors.steps },
    foodRowText: { flex: 1, marginRight: spacing.sm },
    foodRowName: { fontSize: 14, fontWeight: '700', color: colors.ink },
    foodRowServing: { fontSize: 11, fontWeight: '500', color: colors.inkSoft, marginTop: 1 },
    foodRowMacros: { fontSize: 10.5, fontWeight: '600', color: colors.inkFaint, marginTop: 2 },
    foodRowKcal: { fontSize: 13.5, fontWeight: '800', color: colors.steps },

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
    submitBtn: { backgroundColor: colors.steps, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
    submitBtnDisabled: { backgroundColor: colors.border },
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  });
