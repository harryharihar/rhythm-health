import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glow, radius, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { useHealth } from '../store/healthStore';

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export default function OnboardingScreen() {
  const { updateProfile } = useHealth();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('unspecified');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim().length > 0 && heightCm && weightKg;

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    await updateProfile({
      name: name.trim(),
      age: age ? Number(age) : null,
      gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      targetWeightKg: Number(weightKg),
      goals: { stepsGoal: 10000, waterGoalMl: 2500, sleepGoalHours: 8 },
    });
    setSaving(false);
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[colors.primaryGlow, 'transparent']} style={styles.ambient} pointerEvents="none" />
      <KeyboardAwareScrollView
        contentContainerStyle={StyleSheet.flatten([
          styles.container,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ])}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        keyboardOpeningTime={0}
      >
        <View style={[styles.mark, glow(colors.primary, 24, 0.6)]}>
          <Text style={styles.markText}>♥</Text>
        </View>
        <Text style={styles.eyebrow}>Welcome to</Text>
        <Text style={styles.title}>Rhythm</Text>
        <Text style={styles.subtitle}>
          A few details to set your goals. Everything you enter stays on this device only.
        </Text>

        <Field styles={styles} colors={colors} label="Your name" value={name} onChangeText={setName} placeholder="Asha" />
        <Field styles={styles} colors={colors} label="Age" value={age} onChangeText={setAge} placeholder="28" keyboardType="number-pad" />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.genderChip, gender === opt.value && styles.genderChipActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.genderChipText, gender === opt.value && styles.genderChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Field styles={styles} colors={colors} label="Height (cm)" value={heightCm} onChangeText={setHeightCm} placeholder="165" keyboardType="decimal-pad" />
        <Field styles={styles} colors={colors} label="Current weight (kg)" value={weightKg} onChangeText={setWeightKg} placeholder="68" keyboardType="decimal-pad" />

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Setting up…' : 'Get started'}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Field({ label, styles, colors, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.inkFaint}
        {...props}
      />
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
    container: { paddingHorizontal: spacing.xl, flexGrow: 1 },
    mark: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    markText: { fontSize: 24, color: colors.primary },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    title: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.ink,
      marginTop: 4,
      marginBottom: spacing.sm,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.inkSoft,
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    field: { marginBottom: spacing.lg },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.inkSoft,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.ink,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    buttonDisabled: { opacity: 0.35 },
    buttonText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
  });
