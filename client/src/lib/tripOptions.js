export const COMPANION_SIZES = { solo: 1, couple: 2, friends: 4, family: 4 };

export const COMPANION_ALIAS = {
  solo: 'solo',
  couple: 'couple',
  friends: 'friends',
  family: 'family',
  colleagues: 'friends'
};

export const AI_TRANSPORT_MODE = {
  walk: 'walk',
  walking: 'walk',
  grab_bike: 'grab_bike',
  motorbike: 'grab_bike',
  grab: 'grab_bike',
  grab_car: 'grab_car',
  car: 'grab_car',
  public: 'public',
  bus: 'public',
  metro_walking: 'public'
};

export const PLACES_PER_DAY_BY_PACE = {
  relaxed: 3,
  moderate: 4,
  packed: 6
};

export const TRIP_OPTION_VALUES = {
  companions: ['solo', 'couple', 'friends', 'family'],
  transport_mode: ['grab_bike', 'grab_car', 'public', 'walk'],
  pace: ['relaxed', 'moderate', 'packed'],
  dietary: ['vegetarian', 'vegan', 'no_seafood', 'no_spicy', 'halal', 'nut_allergy']
};

// ---------------------------------------------------------------------------
// T-044 form redesign — shared contract `.orchestra/work/T-044/contract.md`.
// ---------------------------------------------------------------------------

export const MAX_INTERESTS = 5;

// Mục 2 của hợp đồng: 18 sở thích, giữ đúng chính tả key; `legacy` là preferences cũ suy ra.
export const INTERESTS = [
  { key: 'street_food', legacy: ['food'] },
  { key: 'local_classics', legacy: ['food'] },
  { key: 'seafood_nhau', legacy: ['food', 'nightlife'] },
  { key: 'cafe_hopping', legacy: ['cafe'] },
  { key: 'coffee_retro', legacy: ['cafe'] },
  { key: 'rooftop_night', legacy: ['nightlife'] },
  { key: 'nightlife_street', legacy: ['nightlife'] },
  { key: 'french_architecture', legacy: ['culture'] },
  { key: 'temples_churches', legacy: ['culture'] },
  { key: 'museums_art', legacy: ['culture'] },
  { key: 'history', legacy: ['culture'] },
  { key: 'markets', legacy: ['shopping'] },
  { key: 'riverside', legacy: ['nature'] },
  { key: 'parks', legacy: ['nature'] },
  { key: 'photo_spots', legacy: ['culture'] },
  { key: 'local_life', legacy: ['culture'] },
  { key: 'chinatown', legacy: ['culture', 'food'] },
  { key: 'family_fun', legacy: ['nature'] }
];

export const INTEREST_KEYS = INTERESTS.map((item) => item.key);

// Map ngược preferences cũ (sentence parser, draft v1) sang interests mặc định.
export const LEGACY_PREFERENCE_INTERESTS = {
  food: ['street_food', 'local_classics'],
  culture: ['history', 'french_architecture'],
  cafe: ['cafe_hopping'],
  shopping: ['markets'],
  nature: ['riverside', 'parks'],
  nightlife: ['nightlife_street']
};

export function interestImage(key) {
  return `/images/form/interest-${key}.webp`;
}

export function templateImage(key) {
  return `/images/form/template-${key}.webp`;
}

// Mục 4: khu lưu trú. Giá trị gửi lên `"<Khu>, TP. Hồ Chí Minh"`, chỉ dùng quận có trong catalog.
export const STAY_AREAS = [
  { key: 'd1', district: 'Quận 1' },
  { key: 'd3', district: 'Quận 3' },
  { key: 'd5', district: 'Quận 5' },
  { key: 'binh_thanh', district: 'Bình Thạnh' },
  { key: 'phu_nhuan', district: 'Phú Nhuận' },
  { key: 'd7', district: 'Quận 7' },
  { key: 'thu_duc', district: 'Thủ Đức' }
].map((area) => ({ ...area, value: `${area.district}, TP. Hồ Chí Minh` }));

export const DEFAULT_STAY_LOCATION = STAY_AREAS[0].value;

export function stayAreaForLocation(location) {
  const value = String(location || '').trim();
  return STAY_AREAS.find((area) => area.value === value)?.key || null;
}

// Mục 3: 6 mẫu chuyến. Field không khai báo thì giữ giá trị hiện tại của form.
export const TRIP_TEMPLATES = [
  {
    key: 'first_time',
    days: 2,
    district: 'Quận 1',
    companions: 'solo',
    interests: ['french_architecture', 'history', 'street_food', 'riverside'],
    pace: 'moderate',
    budget_preset: 1_000_000
  },
  {
    key: 'food_tour',
    days: 1,
    district: 'Quận 1',
    interests: ['street_food', 'local_classics', 'seafood_nhau', 'chinatown'],
    pace: 'packed',
    budget_preset: 500_000
  },
  {
    key: 'couple',
    days: 2,
    district: 'Quận 1',
    companions: 'couple',
    interests: ['cafe_hopping', 'rooftop_night', 'riverside', 'photo_spots'],
    pace: 'moderate',
    budget_preset: 1_000_000
  },
  {
    key: 'family',
    days: 2,
    district: 'Quận 7',
    companions: 'family',
    group_size: 4,
    has_children: true,
    interests: ['family_fun', 'parks', 'markets'],
    pace: 'relaxed',
    budget_preset: 1_000_000
  },
  {
    key: 'night',
    days: 1,
    district: 'Quận 1',
    companions: 'friends',
    group_size: 4,
    interests: ['nightlife_street', 'rooftop_night', 'seafood_nhau', 'street_food'],
    pace: 'packed',
    budget_preset: 1_000_000,
    day_start: '16:00',
    day_end: '23:30'
  },
  {
    key: 'culture',
    days: 2,
    district: 'Quận 1',
    interests: ['history', 'museums_art', 'temples_churches', 'french_architecture'],
    pace: 'moderate',
    budget_preset: 1_000_000
  }
];

export const DAY_PRESETS = [1, 2, 3];

// Chuyển vibe_energy cũ (draft v2) sang pace: < 34 → relaxed; < 67 → moderate; còn lại → packed.
export function paceFromEnergy(energy) {
  const value = Number(energy);
  if (!Number.isFinite(value)) return 'moderate';
  if (value < 34) return 'relaxed';
  if (value < 67) return 'moderate';
  return 'packed';
}

// Giá trị vibe_energy gửi backend suy từ pace.
export const ENERGY_FOR_PACE = { relaxed: 25, moderate: 50, packed: 80 };

// Gợi ý phương tiện ở bước "Ai đi cùng". null = không có gợi ý riêng.
export function suggestTransport(form) {
  if (!form) return null;
  if (form.mobility === 'limited' || form.has_elderly) return 'grab_car';
  if (form.companions === 'solo' || form.companions === 'couple') return 'grab_bike';
  return null;
}

// Synced with server/app/db/hcmc_data.py (327 places across 8 core HCMC districts).
export const CATALOG_DISTRICTS = [
  { name: 'Quận 1', count: 42 },
  { name: 'Quận 3', count: 40 },
  { name: 'Quận 4', count: 40 },
  { name: 'Quận 5', count: 40 },
  { name: 'Quận 7', count: 42 },
  { name: 'Bình Thạnh', count: 41 },
  { name: 'Phú Nhuận', count: 40 },
  { name: 'Thủ Đức', count: 42 }
];

export const DISTRICTS = CATALOG_DISTRICTS.map((item) => item.name);

export function hcmcDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const part = (type) => parts.find((value) => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDateDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function normalizeCompanion(value) {
  return COMPANION_ALIAS[value] || 'solo';
}

export function normalizeTransportMode(value) {
  return AI_TRANSPORT_MODE[value] || 'grab_bike';
}

export function defaultTripOptions() {
  return {
    companions: 'solo',
    group_size: 1,
    transport_mode: 'grab_bike',
    dietary: [],
    avoid_districts: [],
    custom_notes: ''
  };
}

export function mergeParsedOptions(options, parsed) {
  if (!parsed) return { ...options };
  const next = { ...options };
  if (parsed.companions) next.companions = normalizeCompanion(parsed.companions);
  if (parsed.group_size) next.group_size = parsed.group_size;
  else if (parsed.companions) next.group_size = COMPANION_SIZES[next.companions];
  if (parsed.transportation) next.transport_mode = normalizeTransportMode(parsed.transportation);
  if (parsed.pace && TRIP_OPTION_VALUES.pace.includes(parsed.pace)) next.pace = parsed.pace;
  if (parsed.dietary?.length) next.dietary = parsed.dietary;
  if (parsed.avoid_districts?.length) next.avoid_districts = parsed.avoid_districts;
  return next;
}

export function validateTripOptions(options) {
  if (!TRIP_OPTION_VALUES.companions.includes(options.companions)) return 'companions';
  if (!Number.isInteger(options.group_size) || options.group_size < 1 || options.group_size > 20) {
    return 'group_size';
  }
  if (!TRIP_OPTION_VALUES.transport_mode.includes(options.transport_mode)) return 'transport_mode';
  if (!TRIP_OPTION_VALUES.pace.includes(options.pace)) return 'pace';
  return null;
}

export function hasParsedTripContent(parsed) {
  return Boolean(
    parsed &&
      (parsed.days ||
        parsed.budget ||
        parsed.preferences?.length ||
        parsed.companions ||
        parsed.transportation ||
        parsed.group_size ||
        parsed.start_location ||
        parsed.district ||
        parsed.pace ||
        parsed.travel_date ||
        parsed.has_children ||
        parsed.has_elderly ||
        parsed.dietary?.length ||
        parsed.avoid_districts?.length)
  );
}
