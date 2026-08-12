type WeekdayFormat = 'long' | 'short' | 'narrow';

export function todayKey(date = new Date()) {
  // YYYY-MM-DD in local time, used as the grouping key for "today" totals.
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function isSameDay(isoTimestamp, dateKey) {
  return todayKey(new Date(isoTimestamp)) === dateKey;
}

export function formatFriendlyDate(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatShortTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Returns the last `days` day-keys, oldest first, each with a short label (M, T, W...)
// weekdayFormat: 'narrow' -> "M", 'short' -> "Mon"
export function lastNDays(days = 7, weekdayFormat: WeekdayFormat = 'narrow') {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: todayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: weekdayFormat }),
    });
  }
  return out;
}

// Sums a numeric field from `logs` for each day in lastNDays(), for weekly bar charts.
export function sumByDay(logs: any[], days: number, field: string, weekdayFormat: WeekdayFormat = 'narrow') {
  const buckets = lastNDays(days, weekdayFormat);
  return buckets.map((bucket) => {
    const total = logs
      .filter((log) => isSameDay(log.timestamp, bucket.key))
      .reduce((acc, log) => acc + (Number(log[field]) || 0), 0);
    return { ...bucket, value: total };
  });
}

// 7.383 -> "7h 23m"
export function formatHoursMinutes(hoursDecimal) {
  const totalMinutes = Math.round((hoursDecimal || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// ---------- Generic range buckets (for the Activity screen's range picker) ----------
// Each bucket is { key, label, start: Date, end: Date } — end is exclusive.
// sumByBuckets sums a numeric field into whichever buckets are given, so the
// same code path covers day/week/month granularity.

function startOfDay(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

// `offsetDays` shifts the whole window back further (e.g. offsetDays=7 with
// days=7 gives "last week" instead of "this week").
export function dayBuckets(days = 7, offsetDays = 0, weekdayFormat: WeekdayFormat = 'narrow') {
  const out = [];
  const todayStart = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i -= 1) {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - i - offsetDays);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    out.push({
      key: todayKey(start),
      label: start.toLocaleDateString(undefined, { weekday: weekdayFormat }),
      start,
      end,
    });
  }
  return out;
}

// Weeks run Monday-aligned-ish by just using rolling 7-day windows ending today.
export function weekBuckets(weeks = 4) {
  const out = [];
  const todayStart = startOfDay(new Date());
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(todayStart);
    end.setDate(end.getDate() - i * 7 + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    out.push({
      key: `w${i}`,
      label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      start,
      end,
    });
  }
  return out;
}

export function monthBuckets(months = 6) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString(undefined, { month: 'short' }),
      start,
      end,
    });
  }
  return out;
}

// Sums `field` from `logs` into each [start, end) bucket.
export function sumByBuckets(logs, buckets, field) {
  return buckets.map((bucket) => {
    const total = logs
      .filter((log) => {
        const t = new Date(log.timestamp).getTime();
        return t >= bucket.start.getTime() && t < bucket.end.getTime();
      })
      .reduce((acc, log) => acc + (Number(log[field]) || 0), 0);
    return { key: bucket.key, label: bucket.label, value: total };
  });
}

// "2h ago" / "Yesterday" / "3 days ago" / "Aug 2" — for recent-activity lists.
export function formatRelativeTime(isoTimestamp) {
  const then = new Date(isoTimestamp);
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (isSameDay(isoTimestamp, todayKey(new Date(Date.now() - 86400000)))) return 'Yesterday';
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------- Bedtime/wake-time goal helpers ----------
// Goals and logged bedtime/wake time are stored as 24h "HH:mm" strings
// (e.g. "23:00") so they're reliably comparable — free-text time entry can't
// be math'd against a goal, which is what makes the auto on-time/quality
// checks in the Sleep screen possible.

export function formatClockLabel(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// 8:00 PM through 2:00 AM, 30-minute steps.
export function bedtimeOptions() {
  const times = [];
  for (let h = 20; h <= 26; h++) {
    for (const m of [0, 30]) {
      const hhmm = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      times.push({ value: hhmm, label: formatClockLabel(hhmm) });
    }
  }
  return times;
}

// 4:00 AM through 10:00 AM, 30-minute steps.
export function wakeTimeOptions() {
  const times = [];
  for (let h = 4; h <= 10; h++) {
    for (const m of [0, 30]) {
      const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      times.push({ value: hhmm, label: formatClockLabel(hhmm) });
    }
  }
  return times;
}

// Every half-hour slot across the full day — used by the custom Reminders
// picker, which (unlike bedtime/wake) has no natural window to narrow to
// since a reminder can be for anything at any time.
export function timeOptions() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      times.push({ value: hhmm, label: formatClockLabel(hhmm) });
    }
  }
  return times;
}

// Minutes from `actualHHMM` to `goalHHMM` as times-of-day, wrapped to the
// shorter direction across midnight (so 11:50 PM vs 12:10 AM reads as 20
// minutes late, not ~23h40 early). Positive = actual is later than goal.
export function clockDiffMinutes(actualHHMM, goalHHMM) {
  if (!actualHHMM || !goalHHMM) return null;
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  let diff = toMin(actualHHMM) - toMin(goalHHMM);
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  return diff;
}

// Duration in hours (1 decimal) from bedtime to wake time, both "HH:mm"
// 24h — assumes wake time is the next calendar day if it's not later than
// bedtime (the normal case: sleep 23:00, wake 07:00 next morning).
export function hoursBetweenClockTimes(bedtimeHHMM, wakeTimeHHMM) {
  if (!bedtimeHHMM || !wakeTimeHHMM) return null;
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  let diffMin = toMin(wakeTimeHHMM) - toMin(bedtimeHHMM);
  if (diffMin <= 0) diffMin += 24 * 60;
  return Math.round((diffMin / 60) * 10) / 10;
}
