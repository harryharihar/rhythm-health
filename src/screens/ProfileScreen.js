import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';
import QuickAddSheet from '../components/QuickAddSheet';
import { useHealth } from '../store/healthStore';
import { colors, glow, radius, spacing } from '../theme/theme';
import { calculateBMI, bmiCategory } from '../utils/healthCalculations';

export default function ProfileScreen() {
  const { profile, settings, addWeight, updateGoals, updateSettings, resetAllData } = useHealth();
  const [weightSheet, setWeightSheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(null); // 'steps' | 'water' | 'sleep' | null
  const [inputValue, setInputValue] = useState('');

  if (!profile) return null;

  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const initials = (profile.name || '?').trim().slice(0, 2).toUpperCase();

  const openGoal = (key, current) => {
    setInputValue(String(current));
    setGoalSheet(key);
  };

  const saveGoal = () => {
    const n = Number(inputValue);
    if (!n) return setGoalSheet(null);
    const patch =
      goalSheet === 'steps' ? { stepsGoal: n } :
      goalSheet === 'water' ? { waterGoalMl: n } :
      goalSheet === 'sleep' ? { sleepGoalHours: n } : {};
    updateGoals(patch);
    setGoalSheet(null);
  };

  const saveWeight = () => {
    const n = Number(inputValue);
    if (n > 0) addWeight(n);
    setInputValue('');
    setWeightSheet(false);
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
      <LinearGradient colors={['rgba(51,230,166,0.12)', 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <ScreenHeader eyebrow="You" title="Profile" subtitle="All data stored on this device" />

        <Card style={styles.profileCard}>
          <View style={[styles.avatar, glow(colors.primary, 14, 0.5)]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.meta}>
              {profile.age ? `${profile.age} yrs · ` : ''}{profile.heightCm} cm · {profile.weightKg} kg
            </Text>
            {bmi ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>BMI {bmi} · {bmiCategory(bmi)}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <TouchableOpacity onPress={() => { setInputValue(String(profile.weightKg || '')); setWeightSheet(true); }}>
          <Card style={styles.linkCard}>
            <Text style={styles.cardTitle}>Log current weight</Text>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </TouchableOpacity>

        <Card>
          <Text style={styles.cardTitle}>Goals</Text>
          <GoalRow label="Daily steps" value={profile.goals.stepsGoal.toLocaleString()} accent={colors.steps} onPress={() => openGoal('steps', profile.goals.stepsGoal)} />
          <GoalRow label="Water intake" value={`${profile.goals.waterGoalMl} ml`} accent={colors.water} onPress={() => openGoal('water', profile.goals.waterGoalMl)} />
          <GoalRow label="Sleep target" value={`${profile.goals.sleepGoalHours} h`} accent={colors.sleep} onPress={() => openGoal('sleep', profile.goals.sleepGoalHours)} last />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark mode</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(v) => updateSettings({ darkMode: v })}
              trackColor={{ true: colors.primary, false: colors.line }}
              thumbColor={colors.ink}
            />
          </View>
          <View style={[styles.settingRow, styles.noBorder]}>
            <Text style={styles.settingLabel}>Reminders</Text>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(v) => updateSettings({ remindersEnabled: v })}
              trackColor={{ true: colors.primary, false: colors.line }}
              thumbColor={colors.ink}
            />
          </View>
        </Card>

        <TouchableOpacity onPress={confirmClear}>
          <Card style={styles.dangerCard}>
            <Text style={styles.dangerText}>Clear all local data</Text>
          </Card>
        </TouchableOpacity>

      </ScrollView>

      <QuickAddSheet visible={weightSheet} title="Log weight" onClose={() => setWeightSheet(false)}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Weight in kg"
          placeholderTextColor={colors.inkFaint}
          value={inputValue}
          onChangeText={setInputValue}
          autoFocus
        />
        <TouchableOpacity style={styles.submitBtn} onPress={saveWeight}>
          <Text style={styles.submitLabel}>Save</Text>
        </TouchableOpacity>
      </QuickAddSheet>

      <QuickAddSheet visible={!!goalSheet} title="Update goal" onClose={() => setGoalSheet(null)}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="New goal value"
          placeholderTextColor={colors.inkFaint}
          value={inputValue}
          onChangeText={setInputValue}
          autoFocus
        />
        <TouchableOpacity style={styles.submitBtn} onPress={saveGoal}>
          <Text style={styles.submitLabel}>Save</Text>
        </TouchableOpacity>
      </QuickAddSheet>
    </View>
  );
}

function GoalRow({ label, value, onPress, last, accent }) {
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarText: { color: colors.bg, fontWeight: '800', fontSize: 18 },
  profileInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSoft, marginTop: 2, marginBottom: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: 'rgba(51,230,166,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  linkCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  chevron: { fontSize: 16, color: colors.inkSoft },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalDot: { width: 6, height: 6, borderRadius: 3 },
  goalLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  goalValue: { fontSize: 12.5, color: colors.inkSoft },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  settingLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  noBorder: { borderBottomWidth: 0 },
  dangerCard: { borderColor: 'rgba(255,107,94,0.3)' },
  dangerText: { fontSize: 13.5, fontWeight: '700', color: colors.danger },
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
  submitLabel: { color: colors.bg, fontWeight: '800', fontSize: 14 },
});
