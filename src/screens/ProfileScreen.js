import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import Card from '../components/Card';
import DocumentScreen from '../components/DocumentScreen';
import EntryDialog from '../components/EntryDialog';
import InfoModal from '../components/InfoModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../data/policyContent';
import { requestNotificationPermissions } from '../notifications/setup';
import { useHealth } from '../store/healthStore';
import { exportAllData } from '../storage/storage';
import { glow, radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { bedtimeOptions, formatClockLabel, wakeTimeOptions } from '../utils/dateUtils';
import { GENDER_OPTIONS } from './OnboardingScreen';
import { LABELS } from '../constants/labels';

const NOTIFICATION_TIME_OPTIONS = [
  { label: LABELS.profile.notifTime7am, icon: 'sunny-outline' },
  { label: LABELS.profile.notifTime8am, icon: 'sunny-outline' },
  { label: LABELS.profile.notifTime6pm, icon: 'partly-sunny-outline' },
  { label: LABELS.profile.notifTime8pm, icon: 'moon-outline' },
  { label: LABELS.profile.notifTime9pm, icon: 'moon-outline' },
  { label: LABELS.profile.notifTime10pm, icon: 'moon-outline' },
];
const genderLabel = (value) => GENDER_OPTIONS.find((g) => g.value === value)?.label;
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// The database runs in WAL mode (storage.js: PRAGMA journal_mode = WAL), so
// SQLite writes accumulate in a separate rhythm.db-wal file and only get
// merged back into rhythm.db itself at a checkpoint. Measuring just rhythm.db
// undercounts real usage, often down to ~0 — the bulk of actual data lives in
// -wal (and -shm) until that happens.
function getDbSizeMb() {
  try {
    const names = ['rhythm.db', 'rhythm.db-wal', 'rhythm.db-shm'];
    const totalBytes = names.reduce((sum, name) => {
      const file = new File(Paths.document, 'SQLite', name);
      return sum + (file.exists ? file.size : 0);
    }, 0);
    return totalBytes / (1024 * 1024);
  } catch {
    return null;
  }
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function computeBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

const bmiCategories = (colors) => [
  { label: LABELS.profile.bmiUnderweight, range: LABELS.profile.bmiUnderweightRange, min: -Infinity, max: 18.5, color: colors.water },
  { label: LABELS.profile.bmiNormal, range: LABELS.profile.bmiNormalRange, min: 18.5, max: 25, color: colors.primary },
  { label: LABELS.profile.bmiOverweight, range: LABELS.profile.bmiOverweightRange, min: 25, max: 30, color: colors.steps },
  { label: LABELS.profile.bmiObese, range: LABELS.profile.bmiObeseRange, min: 30, max: Infinity, color: colors.danger },
];

function bmiCategoryFor(bmiValue, categories) {
  const n = Number(bmiValue);
  return categories.find((c) => n >= c.min && n < c.max);
}

const GOAL_META = {
  steps: { title: LABELS.profile.goalStepsTitle, icon: 'footsteps-outline', unit: LABELS.profile.goalStepsUnit, description: LABELS.profile.goalStepsDescription },
  water: { title: LABELS.profile.goalWaterTitle, icon: 'water-outline', unit: LABELS.profile.goalWaterUnit, description: LABELS.profile.goalWaterDescription },
  sleep: { title: LABELS.profile.goalSleepTitle, icon: 'moon-outline', unit: LABELS.profile.goalSleepUnit, description: LABELS.profile.goalSleepDescription },
};

export default function ProfileScreen() {
  const { profile, settings, updateProfile, updateGoals, updateSettings, resetAllData } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dbSizeMb = useMemo(getDbSizeMb, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState({ name: '', age: '', gender: 'unspecified', heightCm: '', weightKg: '' });
  const [goalSheet, setGoalSheet] = useState(null); // 'steps' | 'water' | 'sleep' | null
  const [goalValue, setGoalValue] = useState('');
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [clockGoalSheet, setClockGoalSheet] = useState(null); // 'bedtime' | 'wakeTime' | null
  const [bmiInfoOpen, setBmiInfoOpen] = useState(false);
  const [docScreen, setDocScreen] = useState(null); // 'privacy' | 'terms' | null

  if (!profile) return null;

  const initials = getInitials(profile.name);
  const bmi = computeBmi(profile.heightCm, profile.weightKg);
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

  const handleToggleReminders = async (v) => {
    updateSettings({ remindersEnabled: v });
    if (!v) return;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        LABELS.profile.notificationsOffTitle,
        LABELS.profile.notificationsOffBody,
        [{ text: LABELS.common.cancel, style: 'cancel' }, { text: LABELS.profile.openSettings, onPress: () => Linking.openSettings() }]
      );
    }
  };

  const handleExport = async () => {
    const data = await exportAllData();
    Alert.alert(
      LABELS.profile.exportPreviewTitle,
      LABELS.profile.exportPreviewBody
        .replace('{water}', data.water.length)
        .replace('{sleep}', data.sleep.length)
        .replace('{steps}', data.steps.length)
        .replace('{weight}', data.weight.length)
        .replace('{workouts}', data.workouts.length)
        .replace('{meals}', data.meals.length)
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

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.primaryGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{LABELS.profile.title}</Text>

        <Card style={styles.heroCardWrap} contentStyle={styles.heroContent}>
          <View style={styles.avatarGlow}>
            <LinearGradient
              colors={[colors.primary, colors.water]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {(profile.gender && profile.gender !== 'unspecified') || profile.age ? (
            <View style={styles.metaRow}>
              {profile.gender && profile.gender !== 'unspecified' ? (
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{genderLabel(profile.gender)}</Text>
                </View>
              ) : null}
              {profile.age ? (
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{profile.age} {LABELS.profile.yrs}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Ionicons name="create-outline" size={14} color={colors.onAccent} />
            <Text style={styles.editBtnText}>{LABELS.profile.editProfile}</Text>
          </TouchableOpacity>

          {profile.heightCm || profile.weightKg ? (
            <View style={styles.quickStatsRow}>
              {profile.heightCm ? (
                <QuickStat styles={styles} colors={colors} icon="resize-outline" value={profile.heightCm} unit="cm" label={LABELS.profile.height} />
              ) : null}
              {profile.heightCm && profile.weightKg ? <View style={styles.quickStatDivider} /> : null}
              {profile.weightKg ? (
                <QuickStat styles={styles} colors={colors} icon="fitness-outline" value={profile.weightKg} unit="kg" label={LABELS.profile.weight} />
              ) : null}
              {bmi && (profile.heightCm || profile.weightKg) ? <View style={styles.quickStatDivider} /> : null}
              {bmi ? (
                <QuickStat styles={styles} colors={colors} icon="body-outline" value={bmi} label={LABELS.profile.bmi} info onPress={() => setBmiInfoOpen(true)} />
              ) : null}
            </View>
          ) : null}
        </Card>

        <SectionLabel styles={styles} colors={colors} icon="options-outline" text={LABELS.profile.sectionPreferences} />
        <Card>
          <SettingRow
            styles={styles}
            colors={colors}
            icon={settings.darkMode ? 'moon' : 'sunny'}
            label={LABELS.profile.darkMode}
            right={
              <Switch
                value={settings.darkMode}
                onValueChange={(v) => updateSettings({ darkMode: v })}
                trackColor={{ true: colors.primary, false: colors.line }}
                thumbColor={colors.ink}
              />
            }
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="notifications-outline"
            label={LABELS.profile.reminders}
            subtitle={LABELS.profile.remindersSubtitle}
            right={
              <Switch
                value={settings.remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ true: colors.primary, false: colors.line }}
                thumbColor={colors.ink}
              />
            }
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="alarm-outline"
            label={LABELS.profile.notificationTime}
            value={settings.notificationTime}
            last
            onPress={() => setTimeSheetOpen(true)}
          />
        </Card>

        <SectionLabel styles={styles} colors={colors} icon="flag-outline" text={LABELS.profile.sectionGoals} />
        <Card>
          <SettingRow
            styles={styles}
            colors={colors}
            icon="footsteps-outline"
            iconColor={colors.steps}
            iconBg={colors.stepsSoft}
            label={LABELS.profile.dailySteps}
            value={profile.goals.stepsGoal.toLocaleString()}
            onPress={() => openGoal('steps', profile.goals.stepsGoal)}
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="water-outline"
            iconColor={colors.water}
            iconBg={colors.waterSoft}
            label={LABELS.profile.waterIntake}
            value={`${profile.goals.waterGoalMl} ml`}
            onPress={() => openGoal('water', profile.goals.waterGoalMl)}
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="moon-outline"
            iconColor={colors.sleep}
            iconBg={colors.sleepSoft}
            label={LABELS.profile.sleepTarget}
            value={`${profile.goals.sleepGoalHours} h`}
            onPress={() => openGoal('sleep', profile.goals.sleepGoalHours)}
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="bed-outline"
            iconColor={colors.sleep}
            iconBg={colors.sleepSoft}
            label={LABELS.profile.bedtimeGoal}
            value={profile.goals.bedtimeGoal ? formatClockLabel(profile.goals.bedtimeGoal) : LABELS.profile.notSet}
            onPress={() => setClockGoalSheet('bedtime')}
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="sunny-outline"
            iconColor={colors.steps}
            iconBg={colors.stepsSoft}
            label={LABELS.profile.wakeTimeGoal}
            value={profile.goals.wakeTimeGoal ? formatClockLabel(profile.goals.wakeTimeGoal) : LABELS.profile.notSet}
            onPress={() => setClockGoalSheet('wakeTime')}
            last
          />
        </Card>

        <SectionLabel styles={styles} colors={colors} icon="server-outline" text={LABELS.profile.sectionDataStorage} />
        <Card>
          <SettingRow styles={styles} colors={colors} icon="save-outline" label={LABELS.profile.storageUsed} value={dbSizeMb != null ? `${dbSizeMb.toFixed(1)} MB` : '—'} />
          <SettingRow styles={styles} colors={colors} icon="download-outline" label={LABELS.profile.exportData} onPress={handleExport} />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="trash-outline"
            iconColor={colors.danger}
            iconBg={colors.dangerSoft}
            label={LABELS.profile.clearAllData}
            subtitle={LABELS.profile.clearAllDataSubtitle}
            danger
            last
            onPress={confirmClear}
          />
        </Card>

        <SectionLabel styles={styles} colors={colors} icon="information-circle-outline" text={LABELS.profile.sectionAbout} />
        <Card>
          <SettingRow styles={styles} colors={colors} icon="pricetag-outline" label={LABELS.profile.appVersion} value={APP_VERSION} />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="shield-checkmark-outline"
            label={LABELS.profile.privacyPolicy}
            onPress={() => setDocScreen('privacy')}
          />
          <SettingRow
            styles={styles}
            colors={colors}
            icon="document-text-outline"
            label={LABELS.profile.termsOfService}
            last
            onPress={() => setDocScreen('terms')}
          />
        </Card>
      </ScrollView>

      <EntryDialog
        visible={editOpen}
        title={LABELS.profile.editProfileTitle}
        onClose={() => setEditOpen(false)}
        footer={
          <TouchableOpacity style={styles.submitBtn} onPress={saveEdit}>
            <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
          </TouchableOpacity>
        }
      >
        <LabeledField styles={styles} colors={colors} label={LABELS.profile.nameLabel}>
          <TextInput
            style={styles.input}
            placeholder={LABELS.profile.nameLabel}
            placeholderTextColor={colors.inkFaint}
            value={editFields.name}
            onChangeText={(v) => setEditFields((f) => ({ ...f, name: v }))}
          />
        </LabeledField>
        <LabeledField styles={styles} colors={colors} label={LABELS.profile.ageLabel}>
          <TextInput
            style={styles.input}
            placeholder={LABELS.profile.ageLabel}
            keyboardType="number-pad"
            placeholderTextColor={colors.inkFaint}
            value={editFields.age}
            onChangeText={(v) => setEditFields((f) => ({ ...f, age: v }))}
          />
        </LabeledField>
        <LabeledField styles={styles} colors={colors} label={LABELS.profile.genderLabel}>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.genderChip, editFields.gender === opt.value && styles.genderChipActive]}
                onPress={() => setEditFields((f) => ({ ...f, gender: opt.value }))}
              >
                <Text style={[styles.genderChipText, editFields.gender === opt.value && styles.genderChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LabeledField>
        <LabeledField styles={styles} colors={colors} label={LABELS.profile.heightCmLabel}>
          <TextInput
            style={styles.input}
            placeholder={LABELS.profile.heightCmLabel}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.inkFaint}
            value={editFields.heightCm}
            onChangeText={(v) => setEditFields((f) => ({ ...f, heightCm: v }))}
          />
        </LabeledField>
        <LabeledField styles={styles} colors={colors} label={LABELS.profile.weightKgLabel}>
          <TextInput
            style={styles.input}
            placeholder={LABELS.profile.weightKgLabel}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.inkFaint}
            value={editFields.weightKg}
            onChangeText={(v) => setEditFields((f) => ({ ...f, weightKg: v }))}
          />
        </LabeledField>
      </EntryDialog>

      <EntryDialog
        visible={!!goalSheet}
        title={goalMeta?.title || LABELS.profile.updateGoalFallbackTitle}
        description={goalMeta?.description}
        accentColor={goalAccent}
        onClose={() => setGoalSheet(null)}
        footer={
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: goalAccent }]} onPress={saveGoal}>
            <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
          </TouchableOpacity>
        }
      >
        {goalMeta ? (
          <View style={styles.goalDialogIconWrap}>
            <View style={[styles.goalDialogIconCircle, { backgroundColor: goalAccentSoft }]}>
              <Ionicons name={goalMeta.icon} size={22} color={goalAccent} />
            </View>
          </View>
        ) : null}
        <View style={styles.goalInputRow}>
          <TextInput
            style={[styles.input, styles.goalInputField]}
            keyboardType="decimal-pad"
            placeholder={LABELS.profile.newGoalValuePlaceholder}
            placeholderTextColor={colors.inkFaint}
            value={goalValue}
            onChangeText={setGoalValue}
            autoFocus
          />
          {goalMeta ? <Text style={styles.goalInputUnit}>{goalMeta.unit}</Text> : null}
        </View>
      </EntryDialog>

      <EntryDialog
        visible={!!clockGoalSheet}
        title={clockGoalSheet === 'bedtime' ? LABELS.profile.bedtimeGoalTitle : LABELS.profile.wakeTimeGoalTitle}
        accentColor={colors.sleep}
        description={LABELS.profile.clockGoalDescription}
        options={(clockGoalSheet === 'bedtime' ? bedtimeOptions() : wakeTimeOptions()).map((t) => ({
          label: t.label,
          icon: clockGoalSheet === 'bedtime' ? 'moon-outline' : 'sunny-outline',
          active: t.value === (clockGoalSheet === 'bedtime' ? profile.goals.bedtimeGoal : profile.goals.wakeTimeGoal),
          onPress: () => updateGoals(clockGoalSheet === 'bedtime' ? { bedtimeGoal: t.value } : { wakeTimeGoal: t.value }),
        }))}
        onClose={() => setClockGoalSheet(null)}
      />

      <EntryDialog
        visible={timeSheetOpen}
        title={LABELS.profile.notificationTimeTitle}
        accentColor={colors.primary}
        options={NOTIFICATION_TIME_OPTIONS.map((t) => ({
          label: t.label,
          icon: t.icon,
          active: t.label === settings.notificationTime,
          onPress: () => updateSettings({ notificationTime: t.label }),
        }))}
        onClose={() => setTimeSheetOpen(false)}
      />

      <InfoModal visible={bmiInfoOpen} title={LABELS.profile.aboutBmiTitle} onClose={() => setBmiInfoOpen(false)}>
        <View style={styles.sheetInfoRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.sheetInfoText}>{LABELS.profile.aboutBmiIntro}</Text>
        </View>
        {profile.heightCm && profile.weightKg ? (
          <View style={styles.bmiFormulaBox}>
            <Text style={styles.bmiFormulaLabel}>{LABELS.profile.bmiFormula}</Text>
            <Text style={styles.bmiFormulaText}>
              {profile.weightKg} ÷ ({(profile.heightCm / 100).toFixed(2)})² = <Text style={styles.bmiFormulaResult}>{bmi}</Text>
            </Text>
          </View>
        ) : null}
        {categories.map((cat) => (
          <View key={cat.label} style={styles.bmiCategoryRow}>
            <View style={[styles.bmiCategoryDot, { backgroundColor: cat.color }]} />
            <Text style={styles.bmiCategoryLabel}>{cat.label}</Text>
            <Text style={styles.bmiCategoryRange}>{cat.range}</Text>
            {currentCategory?.label === cat.label ? (
              <View style={styles.bmiCurrentBadge}>
                <Text style={styles.bmiCurrentBadgeText}>{LABELS.profile.you}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </InfoModal>

      <DocumentScreen
        visible={docScreen === 'privacy'}
        title={PRIVACY_POLICY.title}
        updatedLabel={PRIVACY_POLICY.updatedLabel}
        sections={PRIVACY_POLICY.sections}
        onClose={() => setDocScreen(null)}
      />
      <DocumentScreen
        visible={docScreen === 'terms'}
        title={TERMS_OF_SERVICE.title}
        updatedLabel={TERMS_OF_SERVICE.updatedLabel}
        sections={TERMS_OF_SERVICE.sections}
        onClose={() => setDocScreen(null)}
      />
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

function QuickStat({ icon, value, unit, label, styles, colors, info, onPress }) {
  const inner = (
    <>
      <Ionicons name={icon} size={13} color={colors.inkSoft} style={styles.quickStatIcon} />
      <Text style={styles.quickStatValue}>
        {value}
        {unit ? <Text style={styles.quickStatUnit}> {unit}</Text> : null}
      </Text>
      <View style={styles.quickStatLabelRow}>
        <Text style={styles.quickStatLabel}>{label}</Text>
        {info ? <Ionicons name="information-circle" size={11} color={colors.inkFaint} style={styles.quickStatInfoIcon} /> : null}
      </View>
    </>
  );
  if (!onPress) return <View style={styles.quickStat}>{inner}</View>;
  return (
    <TouchableOpacity style={styles.quickStat} onPress={onPress} activeOpacity={0.65}>
      {inner}
    </TouchableOpacity>
  );
}

function SectionLabel({ icon, text, styles, colors }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Ionicons name={icon} size={13} color={colors.inkSoft} />
      <Text style={styles.sectionLabel}>{text}</Text>
    </View>
  );
}

function SettingRow({ styles, colors, icon, iconColor, iconBg, label, subtitle, value, right, danger, last, onPress }) {
  const content = (
    <View style={[styles.settingRow, last && styles.noBorder]}>
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg || colors.primarySoft }]}>
        <Ionicons name={icon} size={16} color={danger ? colors.danger : iconColor || colors.primary} />
      </View>
      <View style={styles.settingTextWrap}>
        <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? (
        right
      ) : value !== undefined ? (
        <View style={styles.rowRight}>
          <Text style={styles.rowRightValue}>{value}</Text>
          {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} /> : null}
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
}

const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.lg },

    heroCardWrap: { marginBottom: spacing.lg },
    heroContent: { alignItems: 'center', paddingVertical: spacing.lg },
    avatarGlow: {
      marginBottom: spacing.md,
      borderRadius: 48,
      // iOS-only colored glow: Android's `elevation` on a transparent wrapper
      // around a translucent gradient can paint a solid white box (seen
      // elsewhere in this app), so no elevation is set here at all.
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 22,
        },
        default: {},
      }),
    },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.bgElevated,
    },
    avatarText: { color: colors.onAccent, fontWeight: '800', fontSize: 30, letterSpacing: 0.5 },
    name: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: 6 },
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
    metaPill: {
      backgroundColor: colors.surfaceGlassStrong,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    metaPillText: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 10,
      ...glow(colors.primary, 12, 0.3),
    },
    editBtnText: { fontSize: 13, fontWeight: '700', color: colors.onAccent },

    quickStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      width: '100%',
    },
    quickStat: { alignItems: 'center', flex: 1 },
    quickStatIcon: { marginBottom: 3 },
    quickStatValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
    quickStatUnit: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },
    quickStatLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    quickStatLabel: { fontSize: 10.5, fontWeight: '600', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
    quickStatInfoIcon: { marginLeft: 3 },
    quickStatDivider: { width: 1, height: 30, backgroundColor: colors.line },

    bmiFormulaBox: {
      backgroundColor: colors.surfaceGlass,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    bmiFormulaLabel: { fontSize: 10, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
    bmiFormulaText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
    bmiFormulaResult: { fontSize: 15, fontWeight: '800', color: colors.ink },
    bmiCategoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
    bmiCategoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    bmiCategoryLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink, flex: 1 },
    bmiCategoryRange: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
    bmiCurrentBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
    bmiCurrentBadgeText: { fontSize: 10, fontWeight: '800', color: colors.onAccent },

    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, marginTop: spacing.xs, paddingLeft: 2 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8 },

    settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    rowIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    settingTextWrap: { flex: 1, marginRight: spacing.md },
    settingLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
    settingSubtitle: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowRightValue: { fontSize: 13, color: colors.inkSoft, fontWeight: '600' },
    noBorder: { borderBottomWidth: 0 },
    dangerText: { color: colors.danger },

    field: { marginBottom: 2 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkSoft,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    genderChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genderChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    genderChipText: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
    genderChipTextActive: { color: colors.primary },
    sheetInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
    sheetInfoText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '500', flexShrink: 1 },
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

    goalDialogIconWrap: { alignItems: 'center', marginBottom: spacing.md },
    goalDialogIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    goalInputRow: { position: 'relative', justifyContent: 'center', marginBottom: spacing.md },
    goalInputField: { paddingRight: 70, marginBottom: 0 },
    goalInputUnit: {
      position: 'absolute',
      right: spacing.md,
      top: 0,
      bottom: 0,
      textAlignVertical: 'center',
      includeFontPadding: false,
      fontSize: 13,
      fontWeight: '700',
      color: colors.inkSoft,
    },
  });
