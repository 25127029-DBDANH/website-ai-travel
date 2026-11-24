const GENERIC_PHOTO_FILES = new Set([
  'pho.png',
  'banh-mi.png',
  'cafe.jpg',
  'coffee.jpg',
  'saigon-river.jpg'
]);

const EARTH_RADIUS_KM = 6371;

const CATEGORY_ALIASES = {
  attraction: 'sightseeing',
  culture: 'sightseeing',
  heritage: 'sightseeing',
  landmark: 'sightseeing',
  museum: 'sightseeing',
  sightseeing: 'sightseeing',
  park: 'nature',
  garden: 'nature',
  nature: 'nature',
  food: 'food',
  restaurant: 'food',
  street_food: 'food',
  cafe: 'cafe',
  coffee: 'cafe',
  shopping: 'shopping',
  market: 'shopping',
  mall: 'shopping',
  entertainment: 'entertainment',
  nightlife: 'entertainment'
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCoord(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
}

function parseNonNegNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parseRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 && num <= 5 ? num : null;
}

function parseTimeString(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour === 24 && minute === 0) return '24:00';
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
  const normalized = parseTimeString(timeStr);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

function extractHours(raw) {
  const openDirect = parseTimeString(raw.openTime ?? raw.open_time);
  const closeDirect = parseTimeString(raw.closeTime ?? raw.close_time);
  if (openDirect && closeDirect) {
    return { openTime: openDirect, closeTime: closeDirect };
  }

  const openingRaw = Array.isArray(raw.opening_hours)
    ? raw.opening_hours.find((entry) => typeof entry === 'string' && entry.trim())
    : raw.opening_hours;

  if (typeof openingRaw === 'string' && openingRaw.trim()) {
    const rangeMatch = openingRaw.match(
      /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{1,2}:\d{2}(?::\d{2})?)/
    );
    if (rangeMatch) {
      const openParsed = parseTimeString(rangeMatch[1]);
      const closeParsed = parseTimeString(rangeMatch[2]);
      if (openParsed && closeParsed) {
        return { openTime: openParsed, closeTime: closeParsed };
      }
    }
    if (/\b24\s*\/\s*7\b|\b24\s*\/\s*24\b/i.test(openingRaw)) {
      return { openTime: '00:00', closeTime: '24:00' };
    }
  }

  return {
    openTime: openDirect || null,
    closeTime: closeDirect || null
  };
}

function parseTags(rawTags) {
  let list = [];
  if (Array.isArray(rawTags)) {
    list = rawTags;
  } else if (typeof rawTags === 'string') {
    const trimmed = rawTags.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    } else if (trimmed) {
      list = trimmed.split(',');
    }
  }

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const tag = cleanString(String(item ?? ''));
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function isGenericPhoto(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (/(?:^|\/\/)images\.unsplash\.com(?:\/|\?|#|$)/.test(trimmed)) return true;

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  const basename = segments[segments.length - 1] || '';
  return GENERIC_PHOTO_FILES.has(basename);
}

export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return Boolean(na && nb && na === nb);
}

export function normalizePlace(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: null,
      name: '',
      nameVi: '',
      category: '',
      district: '',
      address: '',
      lat: null,
      lng: null,
      photoUrl: null,
      isGenericPhoto: false,
      openTime: null,
      closeTime: null,
      priceVnd: null,
      durationMin: null,
      isIndoor: null,
      rating: null,
      description: '',
      tags: []
    };
  }

  const rawId = raw.id ?? raw.place_id;
  const id = rawId !== null && rawId !== undefined && String(rawId).trim() !== ''
    ? String(rawId).trim()
    : null;

  const name = cleanString(raw.name) || cleanString(raw.place_name) || cleanString(raw.nameVi) || cleanString(raw.name_vi);
  const nameVi = cleanString(raw.nameVi) || cleanString(raw.name_vi) || cleanString(raw.place_name);
  const photoUrl = cleanString(raw.photoUrl ?? raw.photo_url) || null;
  const { openTime, closeTime } = extractHours(raw);

  const isIndoor =
    typeof raw.isIndoor === 'boolean'
      ? raw.isIndoor
      : typeof raw.is_indoor === 'boolean'
        ? raw.is_indoor
        : null;

  return {
    id,
    name,
    nameVi,
    category: cleanString(raw.category).toLowerCase(),
    district: cleanString(raw.district),
    address: cleanString(raw.address),
    lat: parseCoord(raw.lat ?? raw.latitude, -90, 90),
    lng: parseCoord(raw.lng ?? raw.longitude, -180, 180),
    photoUrl,
    isGenericPhoto: isGenericPhoto(photoUrl),
    openTime,
    closeTime,
    priceVnd: parseNonNegNumber(raw.priceVnd ?? raw.entry_fee_vnd ?? raw.estimated_cost),
    durationMin: parsePositiveNumber(raw.durationMin ?? raw.suggested_duration),
    isIndoor,
    rating: parseRating(raw.rating ?? raw.average_rating ?? raw.editorial_score),
    description: cleanString(raw.description),
    tags: parseTags(raw.tags)
  };
}

export function mergePlace(seed, detail) {
  const base = normalizePlace(seed);
  if (!detail || typeof detail !== 'object') return base;
  const next = normalizePlace(detail);

  const merged = { ...base };

  const stringFields = [
    'id',
    'name',
    'nameVi',
    'category',
    'district',
    'address',
    'photoUrl',
    'description'
  ];
  for (const field of stringFields) {
    if (next[field]) {
      merged[field] = next[field];
    }
  }

  const nullableFields = ['lat', 'lng', 'priceVnd', 'durationMin', 'isIndoor', 'rating'];
  for (const field of nullableFields) {
    if (next[field] !== null && next[field] !== undefined && !Number.isNaN(next[field])) {
      merged[field] = next[field];
    }
  }

  if (next.openTime && next.closeTime) {
    merged.openTime = next.openTime;
    merged.closeTime = next.closeTime;
  } else {
    if (!merged.openTime && next.openTime) merged.openTime = next.openTime;
    if (!merged.closeTime && next.closeTime) merged.closeTime = next.closeTime;
  }

  if (next.tags.length > 0) {
    merged.tags = next.tags;
  }

  merged.isGenericPhoto = isGenericPhoto(merged.photoUrl);
  return merged;
}

function getVietnamMinutes(now) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    const minPart = parts.find((p) => p.type === 'minute');
    if (hourPart && minPart) {
      const h = Number(hourPart.value) % 24;
      const m = Number(minPart.value);
      if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
    }
  } catch {
    // Fallback to fixed UTC+7 (Vietnam has no DST)
  }

  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
}

export function openStatus(place, now = new Date()) {
  if (!place || typeof place !== 'object') return { state: 'unknown' };
  const normalized =
    'openTime' in place && 'closeTime' in place
      ? { openTime: parseTimeString(place.openTime), closeTime: parseTimeString(place.closeTime) }
      : extractHours(place);

  const openMin = timeToMinutes(normalized.openTime);
  const closeMin = timeToMinutes(normalized.closeTime);
  if (openMin === null || closeMin === null) return { state: 'unknown' };

  const nowMin = getVietnamMinutes(now);
  if (nowMin === null) return { state: 'unknown' };

  if ((openMin === 0 && closeMin === 1440) || openMin === closeMin) {
    return { state: 'open' };
  }

  if (openMin < closeMin) {
    if (nowMin >= openMin && nowMin < closeMin) {
      return { state: 'open', closesAt: normalized.closeTime };
    }
    return { state: 'closed', opensAt: normalized.openTime };
  }

  // Overnight schedule (e.g. 18:00 - 02:00)
  if (nowMin >= openMin || nowMin < closeMin) {
    return { state: 'open', closesAt: normalized.closeTime };
  }
  return { state: 'closed', opensAt: normalized.openTime };
}

export function haversineKm(a, b) {
  if (!a || !b) return null;
  const lat1 = parseCoord(a.lat ?? a.latitude, -90, 90);
  const lng1 = parseCoord(a.lng ?? a.longitude, -180, 180);
  const lat2 = parseCoord(b.lat ?? b.latitude, -90, 90);
  const lng2 = parseCoord(b.lng ?? b.longitude, -180, 180);
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = Math.min(
    1,
    Math.max(0, sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng)
  );
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pickNearby(origin, list, { radiusKm = 1.5, limit = 4, excludeId } = {}) {
  if (!origin || !Array.isArray(list) || limit <= 0) return [];
  const center = normalizePlace(origin);
  if (center.lat === null || center.lng === null) return [];

  const targetExcludeId = excludeId !== undefined ? excludeId : center.id;
  const originNames = [center.name, center.nameVi].filter(Boolean);
  const seen = new Set();
  const candidates = [];

  for (const item of list) {
    const place = normalizePlace(item);
    if (place.lat === null || place.lng === null) continue;

    if (
      targetExcludeId !== null &&
      targetExcludeId !== undefined &&
      place.id !== null &&
      String(place.id) === String(targetExcludeId)
    ) {
      continue;
    }

    if (
      originNames.some(
        (originName) => namesMatch(originName, place.name) || namesMatch(originName, place.nameVi)
      )
    ) {
      continue;
    }

    const distance = haversineKm(center, place);
    if (distance === null || distance > radiusKm) continue;

    const dedupeKey = place.id ? `id:${place.id}` : `name:${normalizeName(place.nameVi || place.name)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    candidates.push({
      ...place,
      distanceKm: Math.round(distance * 1000) / 1000
    });
  }

  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  return candidates.slice(0, limit);
}

export function googleMapsPlaceUrl(lat, lng) {
  const validLat = parseCoord(lat, -90, 90);
  const validLng = parseCoord(lng, -180, 180);
  if (validLat === null || validLng === null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${validLat},${validLng}`;
}

export function resolveCategoryKey(category) {
  const key = cleanString(category).toLowerCase();
  return CATEGORY_ALIASES[key] || 'sightseeing';
}

export function getDisplayPlaceName(place, lang = 'vi') {
  if (!place) return '';
  if (lang === 'vi') return place.nameVi || place.name || '';
  return place.name || place.nameVi || '';
}
