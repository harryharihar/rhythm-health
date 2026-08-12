// Shared between Onboarding (first-time setup) and Profile (Edit Profile) —
// lives outside both screens so neither has to import from the other.
import { LABELS } from './labels';

export const GENDER_OPTIONS = [
  { value: 'female', label: LABELS.gender.female },
  { value: 'male', label: LABELS.gender.male },
  { value: 'other', label: LABELS.gender.other },
  { value: 'unspecified', label: LABELS.gender.unspecified },
];
