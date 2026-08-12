import { useState } from 'react';
import { useHealth } from '../../store/healthStore';

export function useOnboardingScreen() {
  const { updateProfile } = useHealth();
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

  return {
    name, setName,
    age, setAge,
    gender, setGender,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    saving,
    canContinue,
    handleContinue,
  };
}
