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
