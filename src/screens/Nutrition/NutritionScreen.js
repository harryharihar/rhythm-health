import React, { useMemo } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RingGauge from '../../components/RingGauge';
import Sparkline from '../../components/Sparkline';
import Card from '../../components/Card';
import QuickAddSheet from '../../components/QuickAddSheet';
import { useThemeColors } from '../../theme/useTheme';
import { formatFriendlyDate, formatShortTime } from '../../utils/dateUtils';
import { FOOD_CATEGORIES } from '../../data/foodDatabase';
import { LABELS } from '../../constants/labels';
import { iconForMeal, MEAL_TYPES, RANGE_OPTIONS } from './nutritionCalculations';
import { useNutritionScreen } from './useNutritionScreen';
import { makeStyles } from './NutritionScreen.styles';

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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
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
  } = useNutritionScreen(colors);

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
            <View style={[styles.rangeNoteRow, { marginTop: 8, marginBottom: 0 }]}>
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
