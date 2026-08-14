import React, { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import DocumentScreen from '../../components/DocumentScreen';
import EntryDialog from '../../components/EntryDialog';
import QuickAddSheet from '../../components/QuickAddSheet';
import InfoModal from '../../components/InfoModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../data/policyContent';
import { useThemeColors } from '../../theme/useTheme';
import { bedtimeOptions, formatClockLabel, hourOptions, MINUTE_OPTIONS, wakeTimeOptions } from '../../utils/dateUtils';
import { GENDER_OPTIONS } from '../../constants/genderOptions';
import { LABELS } from '../../constants/labels';
import { APP_VERSION, genderLabel, INTERVAL_OPTIONS, CATEGORY_HOUR_RANGE, defaultTimeForCategory, formatIntervalLabel, reminderTimeLabel, REMINDER_CATEGORIES, supportsInterval, timeInCategoryRange } from './profileCalculations';
import { useProfileScreen, MAX_REMINDERS } from './useProfileScreen';
import { makeStyles } from './ProfileScreen.styles';
import type { IconName, Reminder } from '../../types/models';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const goalValueInputRef = useRef<TextInput>(null);
  const {
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
    resetStepsOpen, setResetStepsOpen,
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
    confirmResetSteps,
    performResetSteps,
  } = useProfileScreen(colors);

  const reminderCategories = REMINDER_CATEGORIES(colors);
  const reminderCategoryMeta = (category: string) => reminderCategories.find((c) => c.value === category) || reminderCategories[0];

  if (!profile) return null;

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
                onValueChange={(v) => { updateSettings({ darkMode: v }); }}
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
            last
            right={
              <Switch
                value={settings.remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ true: colors.primary, false: colors.line }}
                thumbColor={colors.ink}
              />
            }
          />
        </Card>

        <SectionLabel styles={styles} colors={colors} icon="alarm-outline" text={LABELS.notifications.sectionReminders} />
        <Text style={styles.remindersSectionInfo}>
          {LABELS.notifications.remindersSectionInfo.replace('{count}', String(reminders.length))}
        </Text>
        <Card>
          {reminders.length === 0 ? (
            <Text style={styles.emptyRemindersText}>{LABELS.notifications.emptyReminders}</Text>
          ) : (
            reminders.map((reminder) => {
              const meta = reminderCategoryMeta(reminder.category);
              return (
                <SettingRow
                  key={reminder.id}
                  styles={styles}
                  colors={colors}
                  icon={meta.icon as IconName}
                  iconColor={meta.color}
                  iconBg={meta.soft}
                  label={reminder.label}
                  onPress={() => openEditReminder(reminder)}
                  right={
                    <View style={styles.reminderRowRight}>
                      <Text style={styles.rowRightValue}>{reminderTimeLabel(reminder, formatClockLabel)}</Text>
                      <Switch
                        value={reminder.enabled}
                        onValueChange={() => toggleReminderEnabled(reminder)}
                        trackColor={{ true: colors.primary, false: colors.line }}
                        thumbColor={colors.ink}
                      />
                    </View>
                  }
                />
              );
            })
          )}
          <View style={reminders.length >= MAX_REMINDERS ? styles.disabledRow : undefined}>
            <SettingRow
              styles={styles}
              colors={colors}
              icon="add-circle-outline"
              iconColor={colors.primary}
              iconBg={colors.primarySoft}
              label={LABELS.notifications.addReminder}
              last
              onPress={openAddReminder}
            />
          </View>
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
          <SettingRow
            styles={styles}
            colors={colors}
            icon="refresh-outline"
            iconColor={colors.steps}
            iconBg={colors.stepsSoft}
            label={LABELS.profile.resetTodaySteps}
            subtitle={LABELS.profile.resetTodayStepsSubtitle}
            onPress={confirmResetSteps}
          />
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
        onShown={() => goalValueInputRef.current?.focus()}
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
            ref={goalValueInputRef}
            style={[styles.input, styles.goalInputField]}
            keyboardType="decimal-pad"
            placeholder={LABELS.profile.newGoalValuePlaceholder}
            placeholderTextColor={colors.inkFaint}
            value={goalValue}
            onChangeText={setGoalValue}
          />
          {goalMeta ? (
            <View style={styles.goalInputUnitWrap}>
              <Text style={styles.goalInputUnit}>{goalMeta.unit}</Text>
            </View>
          ) : null}
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

      <QuickAddSheet
        visible={!!reminderForm}
        title={reminderForm?.id ? LABELS.notifications.editReminderTitle : LABELS.notifications.addReminderTitle}
        accentColor={reminderCategoryMeta(reminderForm?.category || 'water').color}
        onClose={closeReminderSheet}
      >
        <LabeledField styles={styles} label={LABELS.notifications.categoryLabel}>
          <View style={styles.genderRow}>
            {(reminderForm?.id ? reminderCategories.filter((cat) => cat.value === reminderForm.category) : reminderCategories).map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.genderChip, reminderForm?.category === cat.value && { backgroundColor: cat.soft, borderColor: cat.color }]}
                onPress={() =>
                  setReminderForm((f) =>
                    f
                      ? {
                          ...f,
                          category: cat.value,
                          mode: supportsInterval(cat.value) ? f.mode : 'daily',
                          time: timeInCategoryRange(f.time, cat.value) ? f.time : defaultTimeForCategory(cat.value),
                        }
                      : f
                  )
                }
              >
                <Text style={[styles.genderChipText, reminderForm?.category === cat.value && { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LabeledField>
        <LabeledField styles={styles} label={LABELS.notifications.reminderNameLabel}>
          <TextInput
            style={[styles.input, reminderLabelError && styles.inputError]}
            placeholder={LABELS.notifications.reminderNamePlaceholder}
            placeholderTextColor={colors.inkFaint}
            value={reminderForm?.label || ''}
            onChangeText={(v) => {
              setReminderLabelError(false);
              setReminderForm((f) => (f ? { ...f, label: v } : f));
            }}
          />
          {reminderLabelError ? <Text style={styles.errorText}>{LABELS.notifications.reminderNameRequired}</Text> : null}
        </LabeledField>
        {supportsInterval(reminderForm?.category || 'water') ? (
          <LabeledField styles={styles} label={LABELS.notifications.repeatLabel}>
            <View style={styles.genderRow}>
              {([
                { value: 'daily' as const, label: LABELS.notifications.modeDaily },
                { value: 'interval' as const, label: LABELS.notifications.modeInterval },
              ]).map((m) => {
                const active = reminderForm?.mode === m.value;
                const meta = reminderCategoryMeta(reminderForm?.category || 'water');
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.genderChip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                    onPress={() => setReminderForm((f) => (f ? { ...f, mode: m.value } : f))}
                  >
                    <Text style={[styles.genderChipText, active && { color: meta.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LabeledField>
        ) : null}
        {reminderForm?.mode === 'interval' && supportsInterval(reminderForm?.category || 'water') ? (
          <LabeledField styles={styles} label={LABELS.notifications.intervalLabel}>
            <View style={styles.genderRow}>
              {INTERVAL_OPTIONS.map((minutes) => {
                const active = reminderForm?.intervalMinutes === minutes;
                const meta = reminderCategoryMeta(reminderForm?.category || 'water');
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.genderChip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                    onPress={() => setReminderForm((f) => (f ? { ...f, intervalMinutes: minutes } : f))}
                  >
                    <Text style={[styles.genderChipText, active && { color: meta.color }]}>{formatIntervalLabel(minutes)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LabeledField>
        ) : (
          <>
            <LabeledField styles={styles} label={LABELS.notifications.hourLabel}>
              <View style={styles.genderRow}>
                {hourOptions(...CATEGORY_HOUR_RANGE[reminderForm?.category || 'water']).map((h) => {
                  const [selHour, selMinute] = (reminderForm?.time || '08:00').split(':');
                  const active = selHour === h.value;
                  const meta = reminderCategoryMeta(reminderForm?.category || 'water');
                  return (
                    <TouchableOpacity
                      key={h.value}
                      style={[styles.genderChip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                      onPress={() => setReminderForm((f) => (f ? { ...f, time: `${h.value}:${selMinute}` } : f))}
                    >
                      <Text style={[styles.genderChipText, active && { color: meta.color }]}>{h.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LabeledField>
            <LabeledField styles={styles} label={LABELS.notifications.minuteLabel}>
              <View style={styles.genderRow}>
                {MINUTE_OPTIONS.map((m) => {
                  const [selHour, selMinute] = (reminderForm?.time || '08:00').split(':');
                  const active = selMinute === m.value;
                  const meta = reminderCategoryMeta(reminderForm?.category || 'water');
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.genderChip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                      onPress={() => setReminderForm((f) => (f ? { ...f, time: `${selHour}:${m.value}` } : f))}
                    >
                      <Text style={[styles.genderChipText, active && { color: meta.color }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LabeledField>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: reminderCategoryMeta(reminderForm?.category || 'water').color }]}
          onPress={saveReminder}
        >
          <Text style={styles.submitLabel}>{LABELS.common.save}</Text>
        </TouchableOpacity>
        {reminderForm?.id ? (
          <TouchableOpacity style={styles.deleteReminderBtn} onPress={deleteReminder}>
            <Text style={styles.deleteReminderLabel}>{LABELS.notifications.deleteReminder}</Text>
          </TouchableOpacity>
        ) : null}
      </QuickAddSheet>

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

      <EntryDialog
        visible={maxRemindersOpen}
        title={LABELS.notifications.maxRemindersTitle}
        description={LABELS.notifications.maxRemindersBody}
        onClose={() => setMaxRemindersOpen(false)}
        footer={
          <TouchableOpacity style={styles.submitBtn} onPress={() => setMaxRemindersOpen(false)}>
            <Text style={styles.submitLabel}>{LABELS.common.ok}</Text>
          </TouchableOpacity>
        }
      />

      <EntryDialog
        visible={resetStepsOpen}
        title={LABELS.profile.resetStepsConfirmTitle}
        description={LABELS.profile.resetStepsConfirmBody}
        accentColor={colors.steps}
        onClose={() => setResetStepsOpen(false)}
        footer={
          <View style={styles.reminderFooter}>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.steps }]} onPress={performResetSteps}>
              <Text style={styles.submitLabel}>{LABELS.profile.resetStepsConfirmAction}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteReminderBtn} onPress={() => setResetStepsOpen(false)}>
              <Text style={styles.cancelLabel}>{LABELS.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <EntryDialog
        visible={clearDataOpen}
        title={LABELS.profile.clearDataConfirmTitle}
        description={LABELS.profile.clearDataConfirmBody}
        accentColor={colors.danger}
        onClose={() => setClearDataOpen(false)}
        footer={
          <View style={styles.reminderFooter}>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={performClearData}>
              <Text style={styles.submitLabel}>{LABELS.profile.clearDataConfirmAction}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteReminderBtn} onPress={() => setClearDataOpen(false)}>
              <Text style={styles.cancelLabel}>{LABELS.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

interface LabeledFieldProps {
  label: string;
  styles: any;
  colors?: any;
  children?: ReactNode;
}

function LabeledField({ label, styles, children }: LabeledFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface QuickStatProps {
  icon: IconName;
  value: string | number;
  unit?: string;
  label: string;
  styles: any;
  colors: any;
  info?: boolean;
  onPress?: () => void;
}

function QuickStat({ icon, value, unit, label, styles, colors, info, onPress }: QuickStatProps) {
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

interface SectionLabelProps {
  icon: IconName;
  text: string;
  styles: any;
  colors: any;
}

function SectionLabel({ icon, text, styles, colors }: SectionLabelProps) {
  return (
    <View style={styles.sectionLabelRow}>
      <Ionicons name={icon} size={13} color={colors.inkSoft} />
      <Text style={styles.sectionLabel}>{text}</Text>
    </View>
  );
}

interface SettingRowProps {
  styles: any;
  colors: any;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  label: string;
  subtitle?: string;
  value?: string | number;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}

function SettingRow({ styles, colors, icon, iconColor, iconBg, label, subtitle, value, right, danger, last, onPress }: SettingRowProps) {
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
