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
export function lastNDays(days = 7, weekdayFormat = 'narrow') {
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
export function sumByDay(logs, days, field, weekdayFormat = 'narrow') {
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
export function dayBuckets(days = 7, offsetDays = 0, weekdayFormat = 'narrow') {
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
