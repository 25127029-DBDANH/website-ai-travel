export function formatVnd(value, lang = 'en') {
  const amount = Number(value) || 0;
  const formatted = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(amount);
  return lang === 'vi' ? `${formatted} ₫` : `₫${formatted}`;
}

export function formatDistance(km) {
  const value = Number(km) || 0;
  return value < 1 ? `${Math.round(value * 1000)}m` : `${value.toFixed(1)}km`;
}

export function formatDayLabel(lang, n) {
  return lang === 'vi' ? `Ngày ${n}` : `Day ${n}`;
}

const RELATIVE_UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60]
];

export function formatRelativeTime(lang, value, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(lang === 'vi' ? 'vi' : 'en', {
    numeric: 'auto'
  });

  if (Math.abs(diffSeconds) < 60) return formatter.format(0, 'second');

  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(0, 'second');
}
