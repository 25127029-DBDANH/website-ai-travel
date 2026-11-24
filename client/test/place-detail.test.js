import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisplayPlaceName,
  googleMapsPlaceUrl,
  haversineKm,
  isGenericPhoto,
  mergePlace,
  namesMatch,
  normalizePlace,
  openStatus,
  pickNearby,
  resolveCategoryKey
} from '../src/lib/placeDetail.js';

// Provide an in-memory localStorage for testing api.getPlaceDetail in local mode
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const { api, setUseBackend } = await import('../src/lib/api.js');

test('normalizePlace: normalizes local stop / catalog shape accurately', () => {
  const place = normalizePlace({
    place_id: 'p-dinh-doc-lap',
    place_name: 'Dinh Độc Lập',
    category: 'sightseeing',
    district: 'Quận 1',
    address: '135 Nam Kỳ Khởi Nghĩa, Quận 1',
    latitude: 10.777,
    longitude: 106.6953,
    estimated_cost: 65000,
    photo_url: '/images/independence-palace.jpg',
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['08:00 - 16:30'],
    suggested_duration: 105,
    description: 'Di tích lịch sử giữa lòng Sài Gòn.'
  });

  assert.equal(place.id, 'p-dinh-doc-lap');
  assert.equal(place.name, 'Dinh Độc Lập');
  assert.equal(place.nameVi, 'Dinh Độc Lập');
  assert.equal(place.category, 'sightseeing');
  assert.equal(place.district, 'Quận 1');
  assert.equal(place.address, '135 Nam Kỳ Khởi Nghĩa, Quận 1');
  assert.equal(place.lat, 10.777);
  assert.equal(place.lng, 106.6953);
  assert.equal(place.photoUrl, '/images/independence-palace.jpg');
  assert.equal(place.isGenericPhoto, false);
  assert.equal(place.openTime, '08:00');
  assert.equal(place.closeTime, '16:30');
  assert.equal(place.priceVnd, 65000);
  assert.equal(place.durationMin, 105);
  assert.equal(place.isIndoor, true);
  assert.equal(place.rating, 4.8);
  assert.equal(place.description, 'Di tích lịch sử giữa lòng Sài Gòn.');
  assert.deepEqual(place.tags, []);
});

test('normalizePlace: normalizes backend GET /api/v1/places/{id} shape accurately', () => {
  const place = normalizePlace({
    id: 'uuid-123',
    name: 'War Remnants Museum',
    name_vi: 'Bảo tàng Chứng tích Chiến tranh',
    address: '28 Võ Văn Tần, Quận 3',
    district: 'Quận 3',
    latitude: 10.7794,
    longitude: 106.692,
    category: 'culture',
    is_indoor: true,
    open_time: '07:30',
    close_time: '17:30',
    entry_fee_vnd: 40000,
    average_rating: 4.7,
    photo_url: 'https://images.unsplash.com/photo-123456',
    description: 'Lịch sử chiến tranh.',
    tags: ['lịch sử', 'bảo tàng', 'Lịch sử']
  });

  assert.equal(place.id, 'uuid-123');
  assert.equal(place.name, 'War Remnants Museum');
  assert.equal(place.nameVi, 'Bảo tàng Chứng tích Chiến tranh');
  assert.equal(place.category, 'culture');
  assert.equal(place.openTime, '07:30');
  assert.equal(place.closeTime, '17:30');
  assert.equal(place.priceVnd, 40000);
  assert.equal(place.rating, 4.7);
  assert.equal(place.isGenericPhoto, true);
  assert.deepEqual(place.tags, ['lịch sử', 'bảo tàng']);
  assert.equal(getDisplayPlaceName(place, 'vi'), 'Bảo tàng Chứng tích Chiến tranh');
  assert.equal(getDisplayPlaceName(place, 'en'), 'War Remnants Museum');
  assert.equal(resolveCategoryKey(place.category), 'sightseeing');
});

test('normalizePlace: preserves 0 cost and false is_indoor while keeping missing fields null (never fabricated)', () => {
  const minimal = normalizePlace({
    place_name: 'Nhà thờ Đức Bà',
    estimated_cost: 0,
    is_indoor: false
  });

  assert.equal(minimal.priceVnd, 0);
  assert.equal(minimal.isIndoor, false);
  assert.equal(minimal.openTime, null);
  assert.equal(minimal.closeTime, null);
  assert.equal(minimal.rating, null);
  assert.equal(minimal.durationMin, null);
  assert.equal(minimal.lat, null);
  assert.equal(minimal.lng, null);

  const missingSetting = normalizePlace({ name: 'Test' });
  assert.equal(missingSetting.isIndoor, null);
  assert.equal(missingSetting.priceVnd, null);
});

test('mergePlace: prefers detail values without overwriting seed with empty values', () => {
  const seed = {
    place_id: 'p-1',
    place_name: 'Dinh Độc Lập',
    category: 'sightseeing',
    district: 'Quận 1',
    address: '135 Nam Kỳ Khởi Nghĩa',
    latitude: 10.777,
    longitude: 106.6953,
    estimated_cost: 65000,
    photo_url: '/images/pho.png',
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['08:00 - 16:30'],
    suggested_duration: 105,
    description: 'Mô tả từ seed',
    tags: ['di tích']
  };

  const detail = {
    id: 'uuid-dinh',
    name: 'Independence Palace',
    name_vi: '',
    address: null,
    district: 'Quận 1',
    open_time: null,
    close_time: null,
    entry_fee_vnd: null,
    average_rating: 4.9,
    photo_url: '/images/independence-palace.jpg',
    description: '',
    tags: []
  };

  const merged = mergePlace(seed, detail);
  assert.equal(merged.id, 'uuid-dinh');
  assert.equal(merged.name, 'Independence Palace');
  assert.equal(merged.nameVi, 'Dinh Độc Lập');
  assert.equal(merged.address, '135 Nam Kỳ Khởi Nghĩa');
  assert.equal(merged.openTime, '08:00');
  assert.equal(merged.closeTime, '16:30');
  assert.equal(merged.priceVnd, 65000);
  assert.equal(merged.durationMin, 105);
  assert.equal(merged.rating, 4.9);
  assert.equal(merged.description, 'Mô tả từ seed');
  assert.deepEqual(merged.tags, ['di tích']);
  assert.equal(merged.photoUrl, '/images/independence-palace.jpg');
  assert.equal(merged.isGenericPhoto, false);
});

test('openStatus: evaluates daytime, closed, overnight, 24/7, and missing hours in Asia/Ho_Chi_Minh', () => {
  const daytime = { openTime: '08:00', closeTime: '19:00' };
  // 10:30 VN = 03:30 UTC
  assert.deepEqual(openStatus(daytime, new Date('2026-11-24T03:30:00Z')), {
    state: 'open',
    closesAt: '19:00'
  });
  // 19:00 VN = 12:00 UTC (exact close boundary -> closed)
  assert.deepEqual(openStatus(daytime, new Date('2026-11-24T12:00:00Z')), {
    state: 'closed',
    opensAt: '08:00'
  });
  // 07:15 VN = 00:15 UTC (before opening -> closed)
  assert.deepEqual(openStatus(daytime, new Date('2026-11-24T00:15:00Z')), {
    state: 'closed',
    opensAt: '08:00'
  });

  // Overnight venue: 18:00 - 02:00
  const overnight = { openTime: '18:00', closeTime: '02:00' };
  // 23:30 VN = 16:30 UTC -> open
  assert.deepEqual(openStatus(overnight, new Date('2026-11-24T16:30:00Z')), {
    state: 'open',
    closesAt: '02:00'
  });
  // 01:15 VN = 18:15 UTC prev day -> open
  assert.deepEqual(openStatus(overnight, new Date('2026-11-23T18:15:00Z')), {
    state: 'open',
    closesAt: '02:00'
  });
  // 10:00 VN = 03:00 UTC -> closed
  assert.deepEqual(openStatus(overnight, new Date('2026-11-24T03:00:00Z')), {
    state: 'closed',
    opensAt: '18:00'
  });

  // 24/7 opening_hours string
  const alwaysOpen = normalizePlace({ opening_hours: ['Tham quan bên ngoài 24/7'] });
  assert.deepEqual(openStatus(alwaysOpen, new Date('2026-11-24T17:00:00Z')), {
    state: 'open'
  });

  // Missing hours -> unknown
  assert.deepEqual(openStatus({ openTime: null, closeTime: null }, new Date('2026-11-24T05:00:00Z')), {
    state: 'unknown'
  });
});

test('isGenericPhoto: detects shared stock/placeholder photos and ignores real place photos', () => {
  assert.equal(isGenericPhoto('https://images.unsplash.com/photo-1583417319070?w=800'), true);
  assert.equal(isGenericPhoto('/images/pho.png'), true);
  assert.equal(isGenericPhoto('/images/banh-mi.png?v=2'), true);
  assert.equal(isGenericPhoto('/images/cafe.jpg'), true);
  assert.equal(isGenericPhoto('/images/coffee.jpg'), true);
  assert.equal(isGenericPhoto('/images/saigon-river.jpg'), true);

  assert.equal(isGenericPhoto('/images/notre-dame.jpg'), false);
  assert.equal(isGenericPhoto('/images/independence-palace.jpg'), false);
  assert.equal(isGenericPhoto('/api/v1/places/photo?name=places/abc/photos/1'), false);
  assert.equal(isGenericPhoto(null), false);
  assert.equal(isGenericPhoto(''), false);
});

test('haversineKm & pickNearby: filters by radius, excludes self, sorts by distance, limits count', () => {
  const origin = {
    id: 'p-dinh',
    name: 'Dinh Độc Lập',
    lat: 10.777,
    lng: 106.6953
  };

  assert.equal(haversineKm(origin, origin), 0);

  const list = [
    // Self by id -> excluded
    { id: 'p-dinh', name: 'Dinh Độc Lập', latitude: 10.777, longitude: 106.6953 },
    // Self by normalized name with different UUID -> excluded
    { id: 'uuid-self', name_vi: 'dinh doc lap', latitude: 10.777, longitude: 106.6953 },
    // ~0.5 km away (Nhà thờ Đức Bà)
    { id: 'p-ntdb', name: 'Nhà thờ Đức Bà', latitude: 10.7798, longitude: 106.699 },
    // ~0.4 km away (Bảo tàng CTCT)
    { id: 'p-btctct', name: 'Bảo tàng Chứng tích Chiến tranh', latitude: 10.7794, longitude: 106.692 },
    // ~0.6 km away (Chợ Bến Thành)
    { id: 'p-cbt', name: 'Chợ Bến Thành', latitude: 10.7725, longitude: 106.698 },
    // ~0.9 km away (Phố đi bộ Nguyễn Huệ)
    { id: 'p-nh', name: 'Phố đi bộ Nguyễn Huệ', latitude: 10.7745, longitude: 106.7035 },
    // ~3.5 km away (Landmark 81) -> outside 1.5 km
    { id: 'p-lm81', name: 'Landmark 81', latitude: 10.795, longitude: 106.7218 }
  ];

  const nearby = pickNearby(origin, list, { radiusKm: 1.5, limit: 3, excludeId: 'p-dinh' });
  assert.equal(nearby.length, 3);
  assert.deepEqual(
    nearby.map((p) => p.id),
    ['p-btctct', 'p-ntdb', 'p-cbt']
  );
  assert.ok(nearby[0].distanceKm <= nearby[1].distanceKm);
  assert.ok(nearby[1].distanceKm <= nearby[2].distanceKm);
  assert.ok(nearby.every((p) => p.distanceKm <= 1.5));
});

test('namesMatch: strips Vietnamese diacritics, handles đ/Đ, case and whitespace', () => {
  assert.equal(namesMatch('Nhà thờ Đức Bà', 'nha tho duc ba'), true);
  assert.equal(namesMatch('  Dinh   Độc   Lập ', 'dinh doc lap'), true);
  assert.equal(namesMatch('Bến Thành', 'Ben Thanh'), true);
  assert.equal(namesMatch('Nhà thờ Đức Bà', 'Chợ Bến Thành'), false);
  assert.equal(namesMatch('', ''), false);
  assert.equal(namesMatch(null, 'Dinh Độc Lập'), false);
});

test('googleMapsPlaceUrl: builds valid search URL and rejects invalid coordinates', () => {
  assert.equal(
    googleMapsPlaceUrl(10.777, 106.6953),
    'https://www.google.com/maps/search/?api=1&query=10.777,106.6953'
  );
  assert.equal(googleMapsPlaceUrl(null, 106.6953), null);
  assert.equal(googleMapsPlaceUrl(95, 106.6953), null);
});

test('api.getPlaceDetail local mode returns null when id is unknown (not PLACES[0])', async () => {
  setUseBackend(false);
  try {
    const found = await api.getPlaceDetail('p-dinh-doc-lap');
    assert.ok(found);
    assert.equal(found.place_id, 'p-dinh-doc-lap');

    const missing = await api.getPlaceDetail('id-khong-ton-tai-999');
    assert.equal(missing, null);
  } finally {
    setUseBackend(null);
  }
});
