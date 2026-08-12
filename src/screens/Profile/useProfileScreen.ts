import { useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useHealth } from '../../store/healthStore';
import { exportAllData } from '../../storage/storage';
import { requestNotificationPermissions } from '../../notifications/setup';
import { LABELS } from '../../constants/labels';
import { bmiCategories, bmiCategoryFor, computeBmi, getDbSizeMb, getInitials, GOAL_META } from './profileCalculations';
import type { Gender } from '../../types/models';

interface EditFields {
  name: string;
  age: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
}

// All state, derived data, and handlers for the Profile screen.
export function useProfileScreen(colors: any) {
  const { profile, settings, updateProfile, updateGoals, updateSettings, resetAllData } = useHealth();
  const dbSizeMb = useMemo(getDbSizeMb, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({ name: '', age: '', gender: 'unspecified', heightCm: '', weightKg: '' });
  const [goalSheet, setGoalSheet] = useState(null); // 'steps' | 'water' | 'sleep' | null
  const [goalValue, setGoalValue] = useState('');
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [clockGoalSheet, setClockGoalSheet] = useState(null); // 'bedtime' | 'wakeTime' | null
  const [bmiInfoOpen, setBmiInfoOpen] = useState(false);
  const [docScreen, setDocScreen] = useState(null); // 'privacy' | 'terms' | null

  const initials = profile ? getInitials(profile.name) : '?';
  const bmi = profile ? computeBmi(profile.heightCm, profile.weightKg) : null;
  const categories = bmiCategories(colors);
  const currentCategory = bmi ? bmiCategoryFor(bmi, categories) : null;
  const goalMeta = goalSheet ? GOAL_META[goalSheet] : null;
  const goalAccent = goalSheet === 'steps' ? colors.steps : goalSheet === 'water' ? colors.water : colors.sleep;
  const goalAccentSoft = goalSheet === 'steps' ? colors.stepsSoft : goalSheet === 'water' ? colors.waterSoft : colors.sleepSoft;

  const openEdit = () => {
    setEditFields({
      name: profile.name || '',
      age: profile.age ? String(profile.age) : '',
      gender: profile.gender || 'unspecified',
      heightCm: profile.heightCm ? String(profile.heightCm) : '',
      weightKg: profile.weightKg ? String(profile.weightKg) : '',
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    updateProfile({
      name: editFields.name.trim() || profile.name,
      age: editFields.age ? Number(editFields.age) : null,
      gender: editFields.gender,
      heightCm: editFields.heightCm ? Number(editFields.heightCm) : profile.heightCm,
      weightKg: editFields.weightKg ? Number(editFields.weightKg) : profile.weightKg,
    });
    setEditOpen(false);
  };

  const openGoal = (key, current) => {
    setGoalValue(String(current));
    setGoalSheet(key);
  };

  const saveGoal = () => {
    const n = Number(goalValue);
    if (!n) return setGoalSheet(null);
    const patch =
      goalSheet === 'steps' ? { stepsGoal: n } :
      goalSheet === 'water' ? { waterGoalMl: n } :
      goalSheet === 'sleep' ? { sleepGoalHours: n } : {};
    updateGoals(patch);
    setGoalSheet(null);
  };

  const handleToggleReminders = async (v: boolean) => {
    if (!v) {
      updateSettings({ remindersEnabled: false });
      return;
    }
    // Request permission before persisting the toggle as "on" — otherwise a
    // denied prompt leaves the switch showing enabled with nothing actually
    // scheduled.
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        LABELS.profile.notificationsOffTitle,
        LABELS.profile.notificationsOffBody,
        [{ text: LABELS.common.cancel, style: 'cancel' }, { text: LABELS.profile.openSettings, onPress: () => Linking.openSettings() }]
      );
      return;
    }
    updateSettings({ remindersEnabled: true });
  };

  const handleExport = async () => {
    const data = await exportAllData();
    Alert.alert(
      LABELS.profile.exportPreviewTitle,
      LABELS.profile.exportPreviewBody
        .replace('{water}', String(data.water.length))
        .replace('{sleep}', String(data.sleep.length))
        .replace('{steps}', String(data.steps.length))
        .replace('{weight}', String(data.weight.length))
        .replace('{workouts}', String(data.workouts.length))
        .replace('{meals}', String(data.meals.length))
    );
  };

  const confirmClear = () => {
    Alert.alert(
      LABELS.profile.clearDataConfirmTitle,
      LABELS.profile.clearDataConfirmBody,
      [
        { text: LABELS.common.cancel, style: 'cancel' },
        { text: LABELS.profile.clearDataConfirmAction, style: 'destructive', onPress: resetAllData },
      ]
    );
  };

  return {
    profile,
    settings,
    updateGoals,
    updateSettings,
    dbSizeMb,
    editOpen, setEditOpen,
    editFields, setEditFields,
    goalSheet, setGoalSheet,
    goalValue, setGoalValue,
    timeSheetOpen, setTimeSheetOpen,
    clockGoalSheet, setClockGoalSheet,
    bmiInfoOpen, setBmiInfoOpen,
    docScreen, setDocScreen,
    initials,
    bmi,
    categories,
    currentCategory,
    goalMeta,
    goalAccent,
    goalAccentSoft,
    openEdit,
    saveEdit,
    openGoal,
    saveGoal,
    handleToggleReminders,
    handleExport,
    confirmClear,
  };
}
