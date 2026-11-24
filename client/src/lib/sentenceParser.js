import { preferenceOptions } from '../i18n/translations.js';
import { addDateDays, AI_TRANSPORT_MODE, COMPANION_ALIAS, hcmcDate } from './tripOptions.js';

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
    'banh mi',
    'am thuc',
    'do an',
    'an uong',
    'mon an',
    'an vat',
    'quan an',
    'pho bo',
    'pho ga',
    'com tam',
    'hai san'
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
    'kien truc',
    'di tich',
    'di chua',
    'tham quan'
  ],
  cafe: ['cafe', 'cà phê', 'ca phe', 'coffee', 'espresso', 'caphe', 'brunch', 'tra sua'],
  shopping: [
    'shopping',
    'market',
    'mall',
    'boutique',
    'souvenir',
    'mua sam',
    'trung tam thuong mai',
    'quan ao',
    'di cho',
    'cho dem',
    'cho ben thanh',
    'cho binh tay'
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
    'cay xanh',
    'ngoai troi',
    'bo song',
    'ven song'
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
    'bia',
    'bui vien'
  ]
};

// Diacritic-sensitive Vietnamese words that collide with common words once stripped
// (chợ/cho, chùa/chưa, phở/phố, sông/sống).
const DIACRITIC_PREFERENCE_PATTERNS = {
  food: /(^|[^\p{L}])phở([^\p{L}]|$)/iu,
  culture: /(^|[^\p{L}])chùa([^\p{L}]|$)/iu,
  shopping: /(^|[^\p{L}])chợ([^\p{L}]|$)/iu,
  nature: /(^|[^\p{L}])sông([^\p{L}]|$)/iu
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

  if (/\b(weekend|cuoi tuan)\b/i.test(text)) return 2;
  return null;
}

function parseBudget(text) {
  // Shorthand Vietnamese millions such as "2tr5", "1 triệu 5", "2tr500".
  const splitMillions = text.match(/(\d{1,3})\s*(?:tr|trieu)\s*(\d{1,3})\b/);
  if (splitMillions) {
    const value = Math.round(Number(`${splitMillions[1]}.${splitMillions[2]}`) * 1_000_000);
    if (value > 0 && value <= 1_000_000_000) return value;
  }

  const millions = text.match(
    /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:tr\b|trieu\b|million\b|mil\b|m\b)/
  );
  if (millions) {
    const value = Math.round(Number(millions[1].replace(',', '.')) * 1_000_000);
    if (value > 0 && value <= 1_000_000_000) return value;
  }

  const thousands = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:k\b|nghin\b|ngan\b|thousand\b)/);
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

const COMPANION_PATTERNS = {
  solo: /\b(one person|solo|alone|by myself|mot minh|1 minh)\b/,
  couple: /\b(couple|partner|girlfriend|boyfriend|wife|husband|cap doi|ban gai|ban trai|vo chong|nguoi yeu|romantic|lang man)\b/,
  family: /\b(family|kids?|children|gia dinh|tre em|con nho|bo me|ba me)\b/,
  colleagues: /\b(colleagues?|coworkers?|company|dong nghiep|cong ty|team building)\b/,
  friends: /\b(friends?|squad|ban be|nhom ban|hoi ban|ban than)\b/
};

// Check grab_car before grab_bike so "grab car" / "grabcar" does not fall through to "grab".
const TRANSPORT_PATTERNS = {
  grab_car: /\b(grab\s*car|taxi|car|driving|o to|oto|xe hoi)\b/,
  public: /\b(metro|tau dien|bus|buses|xe buyt|cong cong)\b/,
  walk: /\b(walking|walk|on foot|di bo)\b/,
  grab_bike: /\b(grab\s*bike|motorbike|motorcycle|scooter|xe may|xe om|grab)\b/
};

const PACE_PATTERNS = {
  relaxed: /\b(relaxed|slow|chill|thong tha|thu gian|nhe nhang|cham rai)\b/,
  packed: /\b(packed|intense|busy|day dac|kham pha toi da|di nhieu|kin lich)\b/,
  moderate: /\b(moderate|balanced|can bang|vua phai)\b/
};

const DIETARY_PATTERNS = {
  vegan: /\b(vegan|thuan chay)\b/,
  vegetarian: /\b(vegetarian|an chay)\b/,
  no_seafood: /\b(no seafood|without seafood|khong (?:an )?hai san|kieng hai san)\b/,
  no_spicy: /\b(no spicy|not spicy|khong (?:an )?cay|kieng cay|it cay)\b/,
  halal: /\bhalal\b/,
  nut_allergy: /\b(nut allergy|allergic to (?:nuts|peanuts)|di ung (?:dau phong|lac|hat))\b/
};

const DISTRICT_MATCHERS = [
  { name: 'Thủ Đức', startLabel: 'Thảo Điền, TP. Thủ Đức', pattern: /\bthao dien\b/g },
  { name: 'Thủ Đức', startLabel: 'Thủ Đức, TP. Hồ Chí Minh', pattern: /\b(?:tp\.?\s*thu duc|thu duc|quan\s*2|q\.?\s*2|district\s*2|quan\s*9|q\.?\s*9)\b/g },
  { name: 'Bình Thạnh', startLabel: 'Bình Thạnh, TP. Hồ Chí Minh', pattern: /\b(?:binh thanh|landmark\s*81|ba chieu)\b/g },
  { name: 'Phú Nhuận', startLabel: 'Phú Nhuận, TP. Hồ Chí Minh', pattern: /\b(?:phu nhuan|phan xich long)\b/g },
  { name: 'Quận 7', startLabel: 'Quận 7, TP. Hồ Chí Minh', pattern: /\b(?:quan\s*7|q\.?\s*7|district\s*7|phu my hung)\b/g },
  { name: 'Quận 5', startLabel: 'Quận 5, TP. Hồ Chí Minh', pattern: /\b(?:quan\s*5|q\.?\s*5|district\s*5|cho lon)\b/g },
  { name: 'Quận 4', startLabel: 'Quận 4, TP. Hồ Chí Minh', pattern: /\b(?:quan\s*4|q\.?\s*4|district\s*4|vinh khanh)\b/g },
  { name: 'Quận 3', startLabel: 'Quận 3, TP. Hồ Chí Minh', pattern: /\b(?:quan\s*3|q\.?\s*3|district\s*3|ho con rua|tan dinh)\b/g },
  { name: 'Quận 1', startLabel: 'Quận 1, TP. Hồ Chí Minh', pattern: /\b(?:quan\s*1|q\.?\s*1|district\s*1|ben thanh|nguyen hue|bui vien)\b/g }
];

const AVOID_CLAUSE_PATTERN =
  /\b(?:tranh|khong\s+(?:muon\s+)?(?:di|den|ghe)|bo\s+qua|avoid|skip)\s+([^.,;!?\n]+)/g;

function firstMatching(text, patterns) {
  return Object.entries(patterns).find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function parseGroupSize(text) {
  const match =
    text.match(
      /\b(\d{1,2})\s*(?:people|persons?|travelers?|travellers?|guests?|members?|nguoi|thanh vien|dong nghiep|khach)\b/
    ) || text.match(/\bnhom\s*(\d{1,2})\b/);
  if (!match) return null;
  const size = Number(match[1]);
  return size >= 1 && size <= 20 ? size : null;
}

function parseDistricts(text) {
  const avoidDistricts = [];
  let remaining = text;

  for (const match of text.matchAll(AVOID_CLAUSE_PATTERN)) {
    const clause = match[1];
    let foundInClause = false;
    for (const matcher of DISTRICT_MATCHERS) {
      matcher.pattern.lastIndex = 0;
      if (matcher.pattern.test(clause)) {
        foundInClause = true;
        if (!avoidDistricts.includes(matcher.name)) avoidDistricts.push(matcher.name);
      }
    }
    if (foundInClause) {
      remaining = remaining.replace(match[0], ' ');
    }
  }

  let district = null;
  let start_location = null;
  let earliestIndex = Infinity;
  for (const matcher of DISTRICT_MATCHERS) {
    matcher.pattern.lastIndex = 0;
    const hit = matcher.pattern.exec(remaining);
    if (hit && hit.index < earliestIndex) {
      earliestIndex = hit.index;
      district = matcher.name;
      start_location = matcher.startLabel;
    }
  }

  return {
    district,
    start_location,
    avoid_districts: avoidDistricts.slice(0, 3)
  };
}

function parseTravelDate(text, now) {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const local = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  const explicit = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : local
      ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`
      : null;
  if (explicit) return explicit;
  if (/\b(tomorrow|ngay mai)\b/.test(text)) return addDateDays(hcmcDate(now), 1);
  if (/\b(today|hom nay)\b/.test(text)) return hcmcDate(now);
  return null;
}

export function parseTripSentence(sentence, now = new Date()) {
  const raw = String(sentence || '');
  const normalized = normalize(raw);
  const preferences = preferenceOptions.filter(
    (preference) =>
      NORMALIZED_KEYWORDS[preference].some((keyword) => hasKeyword(normalized, keyword)) ||
      Boolean(DIACRITIC_PREFERENCE_PATTERNS[preference]?.test(raw))
  );

  const rawCompanion = firstMatching(normalized, COMPANION_PATTERNS);
  const companions = rawCompanion ? COMPANION_ALIAS[rawCompanion] || 'friends' : null;
  const rawTransport = firstMatching(normalized, TRANSPORT_PATTERNS);
  const transportation = rawTransport ? AI_TRANSPORT_MODE[rawTransport] || rawTransport : null;
  const { district, start_location, avoid_districts } = parseDistricts(normalized);

  return {
    days: parseDays(normalized),
    budget: parseBudget(normalized),
    preferences,
    companions,
    transportation,
    pace: firstMatching(normalized, PACE_PATTERNS),
    travel_date: parseTravelDate(normalized, now),
    group_size: parseGroupSize(normalized),
    dietary: Object.entries(DIETARY_PATTERNS)
      .filter(([, pattern]) => pattern.test(normalized))
      .map(([key]) => key),
    district,
    start_location,
    avoid_districts
  };
}
