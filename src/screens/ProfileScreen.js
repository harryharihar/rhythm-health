import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import Card from '../components/Card';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { exportAllData } from '../storage/storage';
import { radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

const NOTIFICATION_TIME_OPTIONS = ['7:00 AM', '8:00 AM', '6:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'];
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

function getDbSizeMb() {
  try {
    const file = new File(Paths.document, 'SQLite', 'rhythm.db');
    return file.exists ? file.size / (1024 * 1024) : 0;
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const { profile, settings, updateProfile, updateGoals, updateSettings, resetAllData } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dbSizeMb = useMemo(getDbSizeMb, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState({ name: '', age: '', heightCm: '', weightKg: '' });
  const [goalSheet, setGoalSheet] = useState(null); // 'steps' | 'water' | 'sleep' | null
  const [goalValue, setGoalValue] = useState('');
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);

  if (!profile) return null;

  const openEdit = () => {
    setEditFields({
      name: profile.name || '',
      age: profile.age ? String(profile.age) : '',
      heightCm: profile.heightCm ? String(profile.heightCm) : '',
      weightKg: profile.weightKg ? String(profile.weightKg) : '',
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    updateProfile({
      name: editFields.name.trim() || profile.name,
      age: editFields.age ? Number(editFields.age) : null,
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

  const handleExport = async () => {
    const data = await exportAllData();
    Alert.alert(
      'Export preview',
      `This device has ${data.water.length} water logs, ${data.sleep.length} sleep logs, ${data.steps.length} step entries, and ${data.weight.length} weight logs.\n\nFile export/sharing isn't wired up yet — this previews what's stored.`
    );
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear all local data?',
      'This removes your profile and every logged entry from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear data', style: 'destructive', onPress: resetAllData },
      ]
    );
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.primaryGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={34} color={colors.inkSoft} />
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(v) => updateSettings({ darkMode: v })}
              trackColor={{ true: colors.primary, false: colors.line }}
              thumbColor={colors.ink}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Reminders</Text>
              <Text style={styles.settingSubtitle}>Get notifications for water, steps & sleep goals</Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(v) => updateSettings({ remindersEnabled: v })}
              trackColor={{ true: colors.primary, false: colors.line }}
              thumbColor={colors.ink}
            />
          </View>
          <TouchableOpacity style={[styles.settingRow, styles.noBorder]} onPress={() => setTimeSheetOpen(true)}>
            <Text style={styles.settingLabel}>Notification Time</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowRightValue}>{settings.notificationTime}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
            </View>
          </TouchableOpacity>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Goals</Text>
          <GoalRow label="Daily steps" value={profile.goals.stepsGoal.toLocaleString()} accent={colors.steps} styles={styles} onPress={() => openGoal('steps', profile.goals.stepsGoal)} />
          <GoalRow label="Water intake" value={`${profile.goals.waterGoalMl} ml`} accent={colors.water} styles={styles} onPress={() => openGoal('water', profile.goals.waterGoalMl)} />
          <GoalRow label="Sleep target" value={`${profile.goals.sleepGoalHours} h`} accent={colors.sleep} styles={styles} onPress={() => openGoal('sleep', profile.goals.sleepGoalHours)} last />
        </Card>

        <Text style={styles.sectionLabel}>DATA & STORAGE</Text>
        <Card>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Storage Used</Text>
            <Text style={styles.rowRightValue}>{dbSizeMb != null ? `${dbSizeMb.toFixed(1)} MB` : '—'}</Text>
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={handleExport}>
            <Text style={styles.settingLabel}>Export Data</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, styles.noBorder, styles.dangerRow]} onPress={confirmClear}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.dangerText}>Clear All Data</Text>
              <Text style={styles.settingSubtitle}>Remove all stored health data from device</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Card>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.rowRightValue}>{APP_VERSION}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert('Privacy Policy', 'This app stores all data locally on your device only. Nothing is collected, transmitted, or shared. A full policy page is coming soon.')}
          >
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingRow, styles.noBorder]}
            onPress={() => Alert.alert('Terms of Service', 'Terms of Service content is coming soon.')}
          >
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
          </TouchableOpacity>
        </Card>

        <QuickAddSheet visible={editOpen} title="Edit Profile" onClose={() => setEditOpen(false)}>
          <LabeledField styles={styles} colors={colors} label="Name">
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.inkFaint}
              value={editFields.name}
              onChangeText={(v) => setEditFields((f) => ({ ...f, name: v }))}
            />
          </LabeledField>
          <LabeledField styles={styles} colors={colors} label="Age">
            <TextInput
              style={styles.input}
              placeholder="Age"
              keyboardType="number-pad"
              placeholderTextColor={colors.inkFaint}
              value={editFields.age}
              onChangeText={(v) => setEditFields((f) => ({ ...f, age: v }))}
            />
          </LabeledField>
          <LabeledField styles={styles} colors={colors} label="Height (cm)">
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.inkFaint}
              value={editFields.heightCm}
              onChangeText={(v) => setEditFields((f) => ({ ...f, heightCm: v }))}
            />
          </LabeledField>
          <LabeledField styles={styles} colors={colors} label="Weight (kg)">
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.inkFaint}
              value={editFields.weightKg}
              onChangeText={(v) => setEditFields((f) => ({ ...f, weightKg: v }))}
            />
          </LabeledField>
          <TouchableOpacity style={styles.submitBtn} onPress={saveEdit}>
            <Text style={styles.submitLabel}>Save</Text>
          </TouchableOpacity>
        </QuickAddSheet>

        <QuickAddSheet visible={!!goalSheet} title="Update goal" onClose={() => setGoalSheet(null)}>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="New goal value"
            placeholderTextColor={colors.inkFaint}
            value={goalValue}
            onChangeText={setGoalValue}
            autoFocus
          />
          <TouchableOpacity style={styles.submitBtn} onPress={saveGoal}>
            <Text style={styles.submitLabel}>Save</Text>
          </TouchableOpacity>
        </QuickAddSheet>

        <QuickAddSheet
          visible={timeSheetOpen}
          title="Notification time"
          options={NOTIFICATION_TIME_OPTIONS.map((t) => ({ label: t, onPress: () => updateSettings({ notificationTime: t }) }))}
          onClose={() => setTimeSheetOpen(false)}
        />
      </ScrollView>
    </View>
  );
}

function LabeledField({ label, styles, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function GoalRow({ label, value, onPress, last, accent, styles }) {
  return (
    <TouchableOpacity style={[styles.goalRow, last && styles.noBorder]} onPress={onPress}>
      <View style={styles.goalLeft}>
        <View style={[styles.goalDot, { backgroundColor: accent }]} />
        <Text style={styles.goalLabel}>{label}</Text>
      </View>
      <Text style={styles.goalValue}>{value} ›</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.lg },

    identity: { alignItems: 'center', marginBottom: spacing.lg },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    name: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
    editBtn: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },
    editBtnText: { fontSize: 13, fontWeight: '700', color: colors.ink },

    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.xs },

    goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    goalDot: { width: 6, height: 6, borderRadius: 3 },
    goalLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
    goalValue: { fontSize: 12.5, color: colors.inkSoft },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    settingTextWrap: { flex: 1, marginRight: spacing.md },
    settingLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
    settingSubtitle: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowRightValue: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    noBorder: { borderBottomWidth: 0 },
    dangerRow: { paddingVertical: 12 },
    dangerText: { fontSize: 14, fontWeight: '700', color: colors.danger },

    field: { marginBottom: 2 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkSoft,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
    submitBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  });
