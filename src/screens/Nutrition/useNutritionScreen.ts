import { useMemo, useState } from 'react';
import { useHealth } from '../../store/healthStore';
import { sumByBuckets } from '../../utils/dateUtils';
import { estimateCaloriesFromSteps, groupWorkoutsByType } from '../../utils/healthCalculations';
import { FOOD_DATABASE } from '../../data/foodDatabase';
import { LABELS } from '../../constants/labels';
import { LOW_INTAKE_FLOOR_KCAL, MEAL_TYPES, RANGE_OPTIONS } from './nutritionCalculations';
import { DEFAULT_PROFILE } from '../../storage/storage';

// All state, derived data, and handlers for the Nutrition screen.
export function useNutritionScreen(colors) {
  const { profile, todayTotals, steps, workouts, meals, addWater, addMeal, updateGoals } = useHealth();

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

  const goals = profile?.goals || DEFAULT_PROFILE.goals;
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
      return { tone: 'warning', text: LABELS.nutrition.advisoryNoMealsLogged.replace('{burned}', String(caloriesBurned)) };
    }
    if (caloriesConsumed < LOW_INTAKE_FLOOR_KCAL && netIntake < -400) {
      return { tone: 'warning', text: LABELS.nutrition.advisoryLowIntake.replace('{consumed}', String(caloriesConsumed)) };
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

  return {
    todayTotals,
    mealOpen, setMealOpen,
    mealType, setMealType,
    nameInput, setNameInput,
    caloriesInput, setCaloriesInput,
    proteinInput, setProteinInput,
    carbsInput, setCarbsInput,
    fatsInput, setFatsInput,
    targetOpen, setTargetOpen,
    targetInputs, setTargetInputs,
    rangeKey, setRangeKey,
    rangeOpen, setRangeOpen,
    infoOpen, setInfoOpen,
    mealSheetView, setMealSheetView,
    foodSearch, setFoodSearch,
    foodCategory, setFoodCategory,
    selectedFoods,
    calorieTarget,
    macroColors,
    filteredFoods,
    toggleFoodSelected,
    selectedFoodsTotals,
    addSelectedFoods,
    caloriesConsumed,
    stepsCaloriesToday,
    caloriesBurned,
    burnedCaption,
    caloriesRemaining,
    netIntake,
    intakeAdvisory,
    advisoryColor,
    range,
    netByBucket,
    avgNetPerDay,
    macros,
    fillPct,
    waterLitres,
    waterGoalLitres,
    resetMealForm,
    submitMeal,
    openTargets,
    saveTargets,
    addWater,
  };
}
