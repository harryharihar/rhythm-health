import React, { useMemo } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import DocumentScreen from '../../components/DocumentScreen';
import EntryDialog from '../../components/EntryDialog';
import InfoModal from '../../components/InfoModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../data/policyContent';
import { useThemeColors } from '../../theme/useTheme';
import { bedtimeOptions, formatClockLabel, wakeTimeOptions } from '../../utils/dateUtils';
import { GENDER_OPTIONS } from '../../constants/genderOptions';
import { LABELS } from '../../constants/labels';
import { APP_VERSION, genderLabel, NOTIFICATION_TIME_OPTIONS } from './profileCalculations';
import { useProfileScreen } from './useProfileScreen';
import { makeStyles } from './ProfileScreen.styles';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
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
  } = useProfileScreen(colors);

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
