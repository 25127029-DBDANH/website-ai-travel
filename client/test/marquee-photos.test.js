import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MARQUEE_PHOTO_ALLOWLIST,
  buildMarqueeTrack,
  extractPhotoFilename,
  pickRandomUniquePhotos,
  selectMarqueePhotos,
  shuffle
} from '../src/lib/marqueePhotos.js';
import { PLACES, api, setUseBackend } from '../src/lib/api.js';

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const FORBIDDEN_GENERIC_IMAGES = new Set([
  'pho.png',
  'cafe.jpg',
  'banh-mi.png',
  'coffee.jpg'
]);

test('selectMarqueePhotos only returns verified allowlisted pairs with unique image files', () => {
  const photos = selectMarqueePhotos(PLACES);
  const allowedNames = new Set(Object.values(MARQUEE_PHOTO_ALLOWLIST));

  assert.equal(photos.length, Object.keys(MARQUEE_PHOTO_ALLOWLIST).length);

  const seenFiles = new Set();
  for (const item of photos) {
    const file = extractPhotoFilename(item.photo_url);
    assert.ok(!seenFiles.has(file), `Ảnh bị lặp: ${file}`);
    seenFiles.add(file);

    assert.ok(allowedNames.has(item.name), `Tên không có trong bảng cho phép: ${item.name}`);
    assert.equal(MARQUEE_PHOTO_ALLOWLIST[file], item.name, `Ảnh ${file} ghép sai tên ${item.name}`);
    assert.ok(!FORBIDDEN_GENERIC_IMAGES.has(file), `Không được dùng ảnh món ăn/đồ uống chung: ${file}`);
    assert.ok(item.district, `Thiếu quận cho ${item.name}`);
    assert.ok(item.category, `Thiếu loại cho ${item.name}`);
  }

  assert.ok(
    photos.some((item) => item.name === 'Dinh Độc Lập' && extractPhotoFilename(item.photo_url) === 'independence-palace.jpg'),
    'Phải có Dinh Độc Lập với independence-palace.jpg'
  );
});

test('selectMarqueePhotos deduplicates repeated entries and ignores mismatched names', () => {
  const sample = [
    {
      place_id: 'wrong-opera',
      place_name: 'Nhà hát Lớn Thành phố (Saigon Opera House)',
      photo_url: '/images/independence-palace.jpg',
      district: 'Quận 1',
      category: 'sightseeing'
    },
    {
      place_id: 'dup-1',
      place_name: 'Dinh Độc Lập',
      photo_url: '/images/independence-palace.jpg',
      district: 'Quận 1',
      category: 'sightseeing'
    },
    {
      place_id: 'dup-2',
      place_name: 'Dinh Độc Lập',
      photo_url: '/images/independence-palace.jpg',
      district: 'Quận 1',
      category: 'sightseeing'
    },
    {
      place_id: 'food-1',
      place_name: 'Nhà hàng Cơm Niêu Sài Gòn',
      photo_url: '/images/pho.png',
      district: 'Quận 1',
      category: 'food'
    }
  ];

  const result = selectMarqueePhotos(sample);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Dinh Độc Lập');
});

test('api.listPhotos uses selectMarqueePhotos and keeps response shape', async () => {
  setUseBackend(false);
  try {
    const res = await api.listPhotos(20);
    assert.ok(Array.isArray(res.photos));
    assert.equal(res.photos.length, 6);

    for (const item of res.photos) {
      assert.ok(typeof item.place_id === 'string' && item.place_id.length > 0);
      assert.ok(typeof item.photo_url === 'string' && item.photo_url.startsWith('/images/'));
      assert.ok(typeof item.name === 'string' && item.name.length > 0);
      assert.equal(item.name_vi, item.name);
      assert.ok(typeof item.district === 'string' && item.district.length > 0);
      assert.ok(typeof item.category === 'string' && item.category.length > 0);
      assert.ok(typeof item.photo_credit === 'string' && item.photo_credit.length > 0);
    }
  } finally {
    setUseBackend(null);
  }
});

test('PLACES fixes the 3 targeted landmark photo_url assignments', () => {
  const byId = new Map(PLACES.map((place) => [place.place_id, place]));

  assert.equal(byId.get('p-bao-tang-ctct')?.photo_url, '/images/trip-war-remnants.jpg');
  assert.equal(byId.get('p-bao-tang-my-thuat')?.photo_url, '/images/saigon-river.jpg');
  assert.equal(byId.get('p-buu-dien-tt')?.photo_url, '/images/saigon-river.jpg');
});

test('buildMarqueeTrack pads short card lists for seamless wide-screen looping', () => {
  const cards = Array.from({ length: 6 }, (_, i) => ({ key: `c-${i}` }));

  const animated = buildMarqueeTrack(cards, { reduced: false });
  assert.equal(animated.length, 24);
  assert.deepEqual(animated.slice(0, 12), animated.slice(12, 24));

  const reduced = buildMarqueeTrack(cards, { reduced: true });
  assert.equal(reduced.length, 6);
});

test('shuffle returns a new array without mutating the original and preserves all elements', () => {
  const original = ['a', 'b', 'c', 'd', 'e', 'f'];
  const snapshot = [...original];

  const shuffled = shuffle(original, createRng(42));
  assert.notEqual(shuffled, original);
  assert.deepEqual(original, snapshot);
  assert.equal(shuffled.length, original.length);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test('pickRandomUniquePhotos deduplicates shared URLs (5 places with 2 URLs -> 2 unique photos)', () => {
  const places = [
    { id: 'u1', name: 'Place 1', name_vi: 'Điểm 1', district: 'Quận 1', category: 'food', photo_url: 'https://images.unsplash.com/photo-1', is_active: true },
    { id: 'u2', name: 'Place 2', name_vi: 'Điểm 2', district: 'Quận 1', category: 'cafe', photo_url: 'https://images.unsplash.com/photo-1', is_active: true },
    { id: 'u3', name: 'Place 3', name_vi: 'Điểm 3', district: 'Quận 3', category: 'food', photo_url: 'https://images.unsplash.com/photo-2', is_active: true },
    { id: 'u4', name: 'Place 4', name_vi: 'Điểm 4', district: 'Quận 3', category: 'culture', photo_url: 'https://images.unsplash.com/photo-1', is_active: true },
    { id: 'u5', name: 'Place 5', name_vi: 'Điểm 5', district: 'Quận 5', category: 'food', photo_url: 'https://images.unsplash.com/photo-2', is_active: true }
  ];

  const picked = pickRandomUniquePhotos(places, { limit: 20, rng: createRng(7) });
  assert.equal(picked.length, 2);
  const urls = new Set(picked.map((p) => p.photo_url));
  assert.equal(urls.size, 2);
  assert.ok(picked.every((p) => p.photo_credit === 'Unsplash' && p.photo_source_url === ''));
});

test('pickRandomUniquePhotos treats URLs differing only by query or hash as duplicates', () => {
  const places = [
    { id: 'q1', name: 'A', photo_url: 'https://images.unsplash.com/photo-abc?w=400&q=80' },
    { id: 'q2', name: 'B', photo_url: 'https://images.unsplash.com/photo-abc?w=1200' },
    { id: 'q3', name: 'C', photo_url: 'https://images.unsplash.com/photo-abc#hero' },
    { id: 'q4', name: 'D', photo_url: 'https://cdn.example.com/other.jpg?w=800' }
  ];

  const picked = pickRandomUniquePhotos(places, { limit: 10, rng: createRng(99) });
  assert.equal(picked.length, 2);
  const nonUnsplash = picked.find((p) => p.place_id === 'q4');
  assert.equal(nonUnsplash?.photo_credit, '');
});

test('pickRandomUniquePhotos respects limit, skips inactive or missing photo_url, and maps place_id from id', () => {
  const places = [
    { id: 'inactive-1', name: 'Closed', photo_url: 'https://cdn.example.com/1.jpg', is_active: false },
    { id: 'no-photo', name: 'No Photo', photo_url: '', is_active: true },
    { id: 'null-photo', name: 'Null Photo', photo_url: null, is_active: true },
    { id: 'uuid-1', place_id: 'legacy-1', name: 'First', name_vi: 'Một', district: 'Quận 1', category: 'sightseeing', photo_url: 'https://cdn.example.com/a.jpg', is_active: true },
    { id: 'uuid-2', name: 'Second', name_vi: 'Hai', district: 'Quận 3', category: 'cafe', photo_url: 'https://cdn.example.com/b.jpg', is_active: true },
    { place_id: 'fallback-id', name: 'Third', name_vi: 'Ba', district: 'Quận 5', category: 'food', photo_url: 'https://cdn.example.com/c.jpg' }
  ];

  const allValid = pickRandomUniquePhotos(places, { limit: 10, rng: createRng(123) });
  assert.equal(allValid.length, 3);
  const ids = new Set(allValid.map((p) => p.place_id));
  assert.ok(ids.has('uuid-1'));
  assert.ok(ids.has('uuid-2'));
  assert.ok(ids.has('fallback-id'));
  assert.ok(!ids.has('legacy-1'));
  assert.ok(!ids.has('inactive-1'));
  assert.ok(!ids.has('no-photo'));

  const limited = pickRandomUniquePhotos(places, { limit: 2, rng: createRng(123) });
  assert.equal(limited.length, 2);
});

test('pickRandomUniquePhotos produces different orders with different rng seeds', () => {
  const places = Array.from({ length: 10 }, (_, idx) => ({
    id: `uuid-${idx}`,
    name: `Place ${idx}`,
    photo_url: `https://images.unsplash.com/photo-${idx}`
  }));

  const orderA = pickRandomUniquePhotos(places, { limit: 10, rng: createRng(1) }).map((p) => p.place_id);
  const orderB = pickRandomUniquePhotos(places, { limit: 10, rng: createRng(9999) }).map((p) => p.place_id);
  assert.notDeepEqual(orderA, orderB);
});

test('api.listPhotos loads unique backend photos and falls back cleanly on error', async () => {
  const originalFetch = globalThis.fetch;
  setUseBackend(true);
  try {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        total: 3,
        results: [
          { id: 'be-1', name: 'Cafe A', name_vi: 'Cà phê A', district: 'Quận 1', category: 'cafe', photo_url: 'https://images.unsplash.com/photo-10?w=400', is_active: true },
          { id: 'be-2', name: 'Cafe B', name_vi: 'Cà phê B', district: 'Quận 3', category: 'cafe', photo_url: 'https://images.unsplash.com/photo-10?w=800', is_active: true },
          { id: 'be-3', name: 'Museum C', name_vi: 'Bảo tàng C', district: 'Quận 1', category: 'culture', photo_url: 'https://cdn.example.com/museum.jpg', is_active: true }
        ]
      })
    });

    const backendRes = await api.listPhotos(5);
    assert.equal(backendRes.photos.length, 2);
    assert.ok(backendRes.photos.some((p) => p.place_id === 'be-3' && p.photo_credit === ''));
    assert.ok(backendRes.photos.some((p) => (p.place_id === 'be-1' || p.place_id === 'be-2') && p.photo_credit === 'Unsplash'));

    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    const fallbackRes = await api.listPhotos(20);
    assert.equal(fallbackRes.photos.length, 6);
    assert.ok(fallbackRes.photos.every((p) => p.photo_url.startsWith('/images/')));
  } finally {
    globalThis.fetch = originalFetch;
    setUseBackend(null);
  }
});
