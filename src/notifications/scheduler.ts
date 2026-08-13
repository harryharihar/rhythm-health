// Turns the user's own list of reminders (src/types/models.ts Reminder,
// stored in the `reminders` table) into real OS-level daily alarms. There is
// no preset schedule here — every reminder's category/label/time was chosen
// by the user in Profile, this module just keeps the OS in sync with that
// list. `rescheduleAll` is idempotent and cheap enough to call after every
// reminder add/edit/delete and whenever the master Reminders toggle changes
// — it always clears our own notifications first, so it never stacks
// duplicates or leaves a deleted reminder still firing.
import * as Notifications from 'expo-notifications';
import { CHANNELS } from './setup';
import { LABELS } from '../constants/labels';
import type { Reminder, ReminderCategory } from '../types/models';

const CATEGORY_CHANNEL: Record<ReminderCategory, string> = {
  water: CHANNELS.water.id,
  breakfast: CHANNELS.meals.id,
  lunch: CHANNELS.meals.id,
  dinner: CHANNELS.meals.id,
  snack: CHANNELS.meals.id,
  sleep: CHANNELS.sleep.id,
  steps: CHANNELS.steps.id,
};

const CATEGORY_BODY: Record<ReminderCategory, string> = {
  water: LABELS.notifications.bodyWater,
  breakfast: LABELS.notifications.bodyMeals,
  lunch: LABELS.notifications.bodyMeals,
  dinner: LABELS.notifications.bodyMeals,
  snack: LABELS.notifications.bodyMeals,
  sleep: LABELS.notifications.bodySleep,
  steps: LABELS.notifications.bodySteps,
};

// Cancels every notification this app has scheduled. Safe to call broadly
// since this app never schedules anything other than these reminders.
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Clears and re-schedules every enabled reminder from the given list.
// 'daily' reminders fire once at a fixed clock time; 'interval' reminders
// repeat every N minutes starting from whenever this call runs (there's no
// "start/end window" concept — a 30-minute water reminder created at 11pm
// will fire at 11:30pm, same as at any other time of day).
export async function rescheduleAllReminders(reminders: Reminder[]) {
  await cancelAllReminders();
  const enabled = reminders.filter((r) => r.enabled);
  await Promise.all(
    enabled.map((r) => {
      const trigger: Notifications.SchedulableNotificationTriggerInput =
        r.mode === 'interval'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(60, (r.intervalMinutes || 30) * 60),
              repeats: true,
              channelId: CATEGORY_CHANNEL[r.category],
            }
          : (() => {
              const [hour, minute] = (r.time || '08:00').split(':').map(Number);
              return {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
                channelId: CATEGORY_CHANNEL[r.category],
              };
            })();
      return Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.label, body: CATEGORY_BODY[r.category] },
        trigger,
      });
    })
  );
}
