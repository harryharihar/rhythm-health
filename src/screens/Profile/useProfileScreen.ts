import { useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useHealth } from '../../store/healthStore';
import { requestNotificationPermissions } from '../../notifications/setup';
import { LABELS } from '../../constants/labels';
import { bmiCategories, bmiCategoryFor, computeBmi, getDbSizeMb, getInitials, GOAL_META } from './profileCalculations';
import type { Gender, Reminder, ReminderCategory, ReminderMode } from '../../types/models';

interface EditFields {
  name: string;
  age: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
}

interface ReminderForm {
  id: string | null;
  category: ReminderCategory;
  label: string;
  mode: ReminderMode;
  time: string;
  intervalMinutes: number;
}

// Defaults to 'interval' mode: the default category is water, and water's
// whole point is "every N minutes" — starting it on the fixed-time picker
// meant every fresh Add Reminder opened on the wrong mode for its own
// default category.
const NEW_REMINDER_FORM: ReminderForm = { id: null, category: 'water', label: '', mode: 'interval', time: '08:00', intervalMinutes: 30 };

// Keeps the list manageable and the OS notification schedule reasonable —
// Android's AlarmManager has its own per-app alarm quotas, and beyond ~10
// reminders the list itself gets hard to scan anyway.
export const MAX_REMINDERS = 10;

// All state, derived data, and handlers for the Profile screen.
export function useProfileScreen(colors: any) {
  const { profile, settings, reminders, updateProfile, updateGoals, updateSettings, resetAllData, addReminder, updateReminder, removeReminder } = useHealth();
  const dbSizeMb = useMemo(getDbSizeMb, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({ name: '', age: '', gender: 'unspecified', heightCm: '', weightKg: '' });
  const [goalSheet, setGoalSheet] = useState(null); // 'steps' | 'water' | 'sleep' | null
  const [goalValue, setGoalValue] = useState('');
  const [reminderForm, setReminderForm] = useState<ReminderForm | null>(null);
  const [reminderLabelError, setReminderLabelError] = useState(false);
  const [clockGoalSheet, setClockGoalSheet] = useState(null); // 'bedtime' | 'wakeTime' | null
  const [bmiInfoOpen, setBmiInfoOpen] = useState(false);
  const [docScreen, setDocScreen] = useState(null); // 'privacy' | 'terms' | null
  const [maxRemindersOpen, setMaxRemindersOpen] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);

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

  const openAddReminder = () => {
    if (reminders.length >= MAX_REMINDERS) {
      setMaxRemindersOpen(true);
      return;
    }
    setReminderLabelError(false);
    setReminderForm(NEW_REMINDER_FORM);
  };
  const openEditReminder = (reminder: Reminder) => {
    setReminderLabelError(false);
    setReminderForm({
      id: reminder.id,
      category: reminder.category,
      label: reminder.label,
      mode: reminder.mode,
      time: reminder.time || NEW_REMINDER_FORM.time,
      intervalMinutes: reminder.intervalMinutes || NEW_REMINDER_FORM.intervalMinutes,
    });
  };
  const closeReminderSheet = () => setReminderForm(null);

  const saveReminder = () => {
    if (!reminderForm) return;
    if (!reminderForm.label.trim()) {
      setReminderLabelError(true);
      return;
    }
    const { id, category, label, mode, time, intervalMinutes } = reminderForm;
    const patch = {
      category,
      label: label.trim(),
      mode,
      time: mode === 'daily' ? time : null,
      intervalMinutes: mode === 'interval' ? intervalMinutes : null,
    };
    if (id) {
      updateReminder(id, patch);
    } else {
      addReminder({ ...patch, enabled: true });
    }
    setReminderForm(null);
  };

  const deleteReminder = () => {
    if (reminderForm?.id) removeReminder(reminderForm.id);
    setReminderForm(null);
  };

  const toggleReminderEnabled = (reminder: Reminder) => {
    updateReminder(reminder.id, { enabled: !reminder.enabled });
  };

  const confirmClear = () => setClearDataOpen(true);

  const performClearData = () => {
    setClearDataOpen(false);
    resetAllData();
  };

  return {
    profile,
    settings,
    reminders,
    updateGoals,
    updateSettings,
    dbSizeMb,
    editOpen, setEditOpen,
    editFields, setEditFields,
    goalSheet, setGoalSheet,
    goalValue, setGoalValue,
    reminderForm, setReminderForm,
    reminderLabelError, setReminderLabelError,
    clockGoalSheet, setClockGoalSheet,
    bmiInfoOpen, setBmiInfoOpen,
    docScreen, setDocScreen,
    maxRemindersOpen, setMaxRemindersOpen,
    clearDataOpen, setClearDataOpen,
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
    openAddReminder,
    openEditReminder,
    closeReminderSheet,
    saveReminder,
    deleteReminder,
    toggleReminderEnabled,
    handleToggleReminders,
    confirmClear,
    performClearData,
  };
}
