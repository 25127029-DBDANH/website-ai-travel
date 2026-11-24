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
  dietary: ['vegetarian', 'vegan', 'no_seafood', 'no_spicy', 'halal', 'nut_allergy'],
  quick_notes: ['ac_preferred', 'limited_walking']
};

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

export const START_LOCATION_SUGGESTIONS = [
  { label: 'Quận 1', value: 'Quận 1, TP. Hồ Chí Minh' },
  { label: 'Quận 3', value: 'Quận 3, TP. Hồ Chí Minh' },
  { label: 'Quận 5', value: 'Quận 5, TP. Hồ Chí Minh' },
  { label: 'Thảo Điền', value: 'Thảo Điền, TP. Thủ Đức' }
];

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
    pace: 'moderate',
    dietary: [],
    avoid_districts: [],
    quick_notes: [],
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
