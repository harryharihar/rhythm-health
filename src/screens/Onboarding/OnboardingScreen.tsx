import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glow, spacing } from '../../theme/theme';
import { useThemeColors } from '../../theme/useTheme';
import { LABELS } from '../../constants/labels';
import { GENDER_OPTIONS } from '../../constants/genderOptions';
import { useOnboardingScreen } from './useOnboardingScreen';
import { makeStyles } from './OnboardingScreen.styles';

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    name, setName,
    age, setAge,
    gender, setGender,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    saving,
    canContinue,
    handleContinue,
  } = useOnboardingScreen();

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
        <Text style={styles.eyebrow}>{LABELS.onboarding.eyebrow}</Text>
        <Text style={styles.title}>{LABELS.onboarding.appName}</Text>
        <Text style={styles.subtitle}>{LABELS.onboarding.subtitle}</Text>

        <Field styles={styles} colors={colors} label={LABELS.onboarding.nameLabel} value={name} onChangeText={setName} placeholder={LABELS.onboarding.namePlaceholder} />
        <Field styles={styles} colors={colors} label={LABELS.onboarding.ageLabel} value={age} onChangeText={setAge} placeholder={LABELS.onboarding.agePlaceholder} keyboardType="number-pad" />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{LABELS.onboarding.genderLabel}</Text>
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

        <Field styles={styles} colors={colors} label={LABELS.onboarding.heightLabel} value={heightCm} onChangeText={setHeightCm} placeholder={LABELS.onboarding.heightPlaceholder} keyboardType="decimal-pad" />
        <Field styles={styles} colors={colors} label={LABELS.onboarding.weightLabel} value={weightKg} onChangeText={setWeightKg} placeholder={LABELS.onboarding.weightPlaceholder} keyboardType="decimal-pad" />

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
        >
          <Text style={styles.buttonText}>{saving ? LABELS.onboarding.submitSaving : LABELS.onboarding.submitReady}</Text>
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
