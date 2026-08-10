export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export function bmiCategory(bmi) {
  if (bmi == null) return '—';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Higher range';
}

// Very rough estimate: ~0.04 kcal per step, adjustable later per user weight.
export function estimateCaloriesFromSteps(steps) {
  return Math.round((steps || 0) * 0.04);
}

export function estimateDistanceKm(steps) {
  // Average stride ~0.762m
  return Math.round(((steps || 0) * 0.000762) * 10) / 10;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
