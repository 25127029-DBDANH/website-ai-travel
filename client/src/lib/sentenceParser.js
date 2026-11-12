import { preferenceOptions } from '../i18n/translations.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const PREFERENCE_KEYWORDS = {
  food: [
    'street food',
    'local food',
    'food',
    'eat',
    'noodle',
    'pho',
    'banh mi',
    'am thuc',
    'do an',
    'an uong',
    'mon an',
    'an vat',
    'quan an'
  ],
  culture: [
    'culture',
    'history',
    'historic',
    'museum',
    'landmark',
    'temple',
    'pagoda',
    'architecture',
    'van hoa',
    'lich su',
    'bao tang',
    'dia danh',
    'chua',
    'kien truc',
    'di tich'
  ],
  cafe: ['cafe', 'cà phê', 'ca phe', 'coffee', 'espresso', 'caphe', 'brunch', 'tra sua'],
  shopping: [
    'shopping',
    'market',
    'mall',
    'boutique',
    'souvenir',
    'mua sam',
    'cho',
    'trung tam thuong mai',
    'quan ao'
  ],
  nature: [
    'nature',
    'park',
    'garden',
    'river',
    'outdoor',
    'green',
    'cong vien',
    'thien nhien',
    'song',
    'cay xanh',
    'ngoai troi'
  ],
  nightlife: [
    'nightlife',
    'night life',
    'bar',
    'pub',
    'rooftop',
    'cocktail',
    'club',
    'beer',
    've dem',
    'quan bar',
    'hop dem',
    'bia'
  ]
};

const NORMALIZED_KEYWORDS = Object.fromEntries(
  Object.entries(PREFERENCE_KEYWORDS).map(([preference, keywords]) => [
    preference,
    keywords.map(normalize).sort((a, b) => b.length - a.length)
  ])
);

function hasKeyword(text, keyword) {
  if (keyword.includes(' ')) return text.includes(keyword);
  return new RegExp(`(^|[^a-z0-9])${keyword}s?([^a-z0-9]|$)`, 'i').test(text);
}

function parseDays(text) {
  const dayMatch =
    text.match(/(\d{1,2})\s*(?:[a-z]+\s+){0,2}?(?:day|days|ngay)\b/i) ||
    text.match(/\b(?:day|days|ngay)\s*(\d{1,2})\b/i);
  if (dayMatch) {
    const value = Number(dayMatch[1]);
    if (value >= 1 && value <= 14) return value;
  }

  const nightMatch =
    text.match(/(\d{1,2})\s*[- ]?\s*(?:night|nights|dem)\b/i) ||
    text.match(/\b(?:night|nights|dem)\s*(\d{1,2})\b/i);
  if (nightMatch) {
    const value = Math.min(14, Number(nightMatch[1]) + 1);
    if (value >= 1) return value;
  }

  if (/\b(weekend)\b/i.test(text)) return 2;
  return null;
}

function parseBudget(text) {
  const millions = text.match(
    /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:tr\b|trieu\b|million\b|mil\b|m\b)/
  );
  if (millions) {
    const value = Math.round(Number(millions[1].replace(',', '.')) * 1_000_000);
    if (value > 0 && value <= 1_000_000_000) return value;
  }

  const thousands = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:k\b|nghin\b|thousand\b)/);
  if (thousands) {
    const value = Math.round(Number(thousands[1].replace(',', '.')) * 1_000);
    if (value >= 100_000 && value <= 1_000_000_000) return value;
  }

  const grouped = text.match(/\b(\d{1,3}(?:[.,]\d{3})+)\b/);
  if (grouped) {
    const value = Number(grouped[1].replace(/[.,]/g, ''));
    if (value > 0 && value <= 1_000_000_000) return value;
  }

  const plain = text.match(/\b(\d{6,9})\b/);
  if (plain) {
    const value = Number(plain[1]);
    if (value > 0 && value <= 1_000_000_000) return value;
  }

  return null;
}

export function parseTripSentence(sentence) {
  const normalized = normalize(sentence);
  const preferences = preferenceOptions.filter((preference) =>
    NORMALIZED_KEYWORDS[preference].some((keyword) => hasKeyword(normalized, keyword))
  );

  return {
    days: parseDays(normalized),
    budget: parseBudget(normalized),
    preferences
  };
}
