import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MARQUEE_PHOTO_ALLOWLIST,
  buildMarqueeTrack,
  extractPhotoFilename,
  selectMarqueePhotos
} from '../src/lib/marqueePhotos.js';
import { PLACES, api } from '../src/lib/api.js';

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
