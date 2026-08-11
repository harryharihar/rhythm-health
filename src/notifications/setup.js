// Foundation for local, on-device notifications — no backend, no Firebase.
// Everything here runs entirely on the phone: expo-notifications schedules
// notifications with the OS directly (AlarmManager on Android, the local
// notification system on iOS), which still fire when the app is closed.
// There is nothing to sync anywhere, matching the rest of the app's
// local-only storage model (src/storage/storage.js).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// One channel per reminder category so Android users can mute one kind of
// reminder (e.g. Steps) without muting all of them — a single "default"
// channel wouldn't allow that granularity.
export const CHANNELS = {
  water: { id: 'water', name: 'Water Reminders' },
  steps: { id: 'steps', name: 'Step Reminders' },
  sleep: { id: 'sleep', name: 'Sleep Reminders' },
  meals: { id: 'meals', name: 'Meal Reminders' },
};

// Determines how a scheduled notification behaves if it fires while the app
// is open. shouldShowBanner/shouldShowList control the OS presentation;
// Phase 5 layers a branded in-app toast on top via addNotificationReceivedListener,
// which fires regardless of this handler's return value.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    Object.values(CHANNELS).map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    )
  );
}

// Idempotent — safe to call on every app launch regardless of whether
// reminders are enabled, since creating channels/setting the handler
// requires no permission and has no user-visible effect on its own.
export async function initNotifications() {
  await setupAndroidChannels();
}

// Only call this from an explicit user action (e.g. turning the Reminders
// toggle on) — requesting on app launch before the user has asked for
// reminders is the kind of premature prompt that gets permissions
// permanently denied.
export async function requestNotificationPermissions() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function hasNotificationPermission() {
  const result = await Notifications.getPermissionsAsync();
  return result.granted;
}
