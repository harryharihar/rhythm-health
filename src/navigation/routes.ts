// Single source of truth for the bottom tab route names — used as the
// Tab.Screen `name` prop and as the lookup key everywhere else in
// RootNavigator (icons, accent colors) so the string only lives in one place.
export const ROUTES = {
  HOME: 'Home',
  ACTIVITY: 'Activity',
  NUTRITION: 'Nutrition',
  SLEEP: 'Sleep',
  PROFILE: 'Profile',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
