// Schedules the per-category local reminders (water / meals / sleep) that
// CHANNELS in setup.ts creates Android channels for. Everything here is a
// fixed daily local trigger — no background task/server checks whether
// something was already logged before firing, since a fully local app with
// no background-fetch entitlement can't reliably run JS on a schedule
// separate from these OS-level triggers. `rescheduleAll` is idempotent and
// cheap enough to call on every relevant change (toggling reminders on,
// editing a goal, app startup) — it always clears our own notifications
// first, so it never stacks duplicates.
import * as Notifications from 'expo-notifications';
import { CHANNELS } from './setup';
import { LABELS } from '../constants/labels';
import type { Profile } from '../types/models';

interface DailyReminder {
  identifier: string;
  channelId: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

// Fixed times chosen to spread across waking hours without being intrusive —
// not tied to any goal data, since water logging has no natural "due time".
const WATER_TIMES: Array<{ hour: number; minute: number }> = [
  { hour: 11, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 17, minute: 0 },
  { hour: 20, minute: 0 },
];

const MEAL_TIMES = [
  { key: 'breakfast', hour: 8, minute: 30, title: LABELS.notifications.mealBreakfastTitle, body: LABELS.notifications.mealBreakfastBody },
  { key: 'lunch', hour: 13, minute: 0, title: LABELS.notifications.mealLunchTitle, body: LABELS.notifications.mealLunchBody },
  { key: 'dinner', hour: 20, minute: 0, title: LABELS.notifications.mealDinnerTitle, body: LABELS.notifications.mealDinnerBody },
];

const DEFAULT_BEDTIME = { hour: 22, minute: 30 };
// Sleep is logged the morning after, so this fires a bit after the wake
// goal (or a sensible default) rather than at it.
const DEFAULT_WAKE_LOG_DELAY_MIN = 30;

function parseHHMM(hhmm: string | null | undefined): { hour: number; minute: number } | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

function addMinutes(time: { hour: number; minute: number }, minutes: number) {
  const total = (time.hour * 60 + time.minute + minutes + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

function buildReminders(profile: Profile | null): DailyReminder[] {
  const reminders: DailyReminder[] = WATER_TIMES.map((t, i) => ({
    identifier: `water-${i}`,
    channelId: CHANNELS.water.id,
    hour: t.hour,
    minute: t.minute,
    title: LABELS.notifications.waterTitle,
    body: LABELS.notifications.waterBody,
  }));

  reminders.push(
    ...MEAL_TIMES.map((t) => ({
      identifier: `meal-${t.key}`,
      channelId: CHANNELS.meals.id,
      hour: t.hour,
      minute: t.minute,
      title: t.title,
      body: t.body,
    }))
  );

  const bedtime = parseHHMM(profile?.goals?.bedtimeGoal) || DEFAULT_BEDTIME;
  reminders.push({
    identifier: 'sleep-bedtime',
    channelId: CHANNELS.sleep.id,
    hour: bedtime.hour,
    minute: bedtime.minute,
    title: LABELS.notifications.sleepBedtimeTitle,
    body: LABELS.notifications.sleepBedtimeBody,
  });

  const wake = parseHHMM(profile?.goals?.wakeTimeGoal);
  const sleepLogTime = wake ? addMinutes(wake, DEFAULT_WAKE_LOG_DELAY_MIN) : { hour: 8, minute: 0 };
  reminders.push({
    identifier: 'sleep-log',
    channelId: CHANNELS.sleep.id,
    hour: sleepLogTime.hour,
    minute: sleepLogTime.minute,
    title: LABELS.notifications.sleepLogTitle,
    body: LABELS.notifications.sleepLogBody,
  });

  return reminders;
}

// Cancels every notification this app has scheduled. Safe to call broadly
// since this app never schedules anything other than these reminders.
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Clears and re-schedules every category reminder from scratch, using the
// current profile's sleep goals where set. Call after: reminders turned on,
// bedtime/wake goal changed, or app startup (as a safety net in case the OS
// dropped a scheduled alarm, e.g. after a device reboot).
export async function rescheduleAllReminders(profile: Profile | null) {
  await cancelAllReminders();
  const reminders = buildReminders(profile);
  await Promise.all(
    reminders.map((r) =>
      Notifications.scheduleNotificationAsync({
        identifier: r.identifier,
        content: { title: r.title, body: r.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: r.hour,
          minute: r.minute,
          channelId: r.channelId,
        },
      })
    )
  );
}
