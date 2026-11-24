// Bảng cho phép ánh xạ tên file ảnh trong client/public/images/ tới đúng tên địa điểm trong PLACES.
// Chỉ gồm các cặp ảnh–địa điểm đã kiểm chứng; không gán ảnh món ăn/đồ uống chung cho tên quán cụ thể.
export const MARQUEE_PHOTO_ALLOWLIST = Object.freeze({
  'independence-palace.jpg': 'Dinh Độc Lập',
  'trip-war-remnants.jpg': 'Bảo tàng Chứng tích Chiến tranh',
  'notre-dame.jpg': 'Nhà thờ Đức Bà Sài Gòn',
  'ben_thanh.jpeg': 'Chợ Bến Thành',
  'nguyen_hue_walking_street.jpeg': 'Phố đi bộ Nguyễn Huệ',
  'saigon-river.jpg': 'Công viên Bến Bạch Đằng & Ga Tàu Thủy'
});

const MIN_MARQUEE_HALF_CARDS = 12;

export function extractPhotoFilename(photoUrl) {
  if (typeof photoUrl !== 'string') return '';
  const cleaned = photoUrl.split('?')[0].split('#')[0].trim();
  const segments = cleaned.split('/');
  return segments[segments.length - 1] || '';
}

export function selectMarqueePhotos(places) {
  if (!Array.isArray(places)) return [];

  const seenFiles = new Set();
  const selected = [];

  for (const place of places) {
    if (!place || typeof place !== 'object') continue;
    const filename = extractPhotoFilename(place.photo_url);
    const allowedName = MARQUEE_PHOTO_ALLOWLIST[filename];

    if (!allowedName) continue;
    if (place.place_name !== allowedName) continue;
    if (seenFiles.has(filename)) continue;

    seenFiles.add(filename);
    selected.push({
      place_id: place.place_id || `photo-${selected.length}`,
      photo_url: place.photo_url,
      name: place.place_name,
      name_vi: place.place_name,
      district: place.district,
      category: place.category,
      photo_credit: 'Ảnh tư liệu dự án TP.HCM',
      photo_source_url: ''
    });
  }

  return selected;
}

function normalizePhotoUrlKey(photoUrl) {
  if (typeof photoUrl !== 'string') return '';
  return photoUrl.trim().split('?')[0].split('#')[0].trim();
}

export function shuffle(list, rng = Math.random) {
  if (!Array.isArray(list)) return [];
  const random = typeof rng === 'function' ? rng : Math.random;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandomUniquePhotos(places, { limit = 20, rng = Math.random } = {}) {
  if (!Array.isArray(places)) return [];
  const parsed = Number(limit);
  const max = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 20;
  if (max === 0) return [];

  const eligible = places.filter(
    (place) =>
      place &&
      typeof place === 'object' &&
      place.is_active !== false &&
      typeof place.photo_url === 'string' &&
      normalizePhotoUrlKey(place.photo_url).length > 0
  );

  const shuffled = shuffle(eligible, rng);
  const seenUrls = new Set();
  const picked = [];

  for (const place of shuffled) {
    const url = place.photo_url.trim();
    const key = normalizePhotoUrlKey(url);
    if (!key || seenUrls.has(key)) continue;

    seenUrls.add(key);
    const name = place.name ?? place.place_name ?? '';
    picked.push({
      place_id: place.id ?? place.place_id ?? `photo-${picked.length}`,
      photo_url: url,
      name,
      name_vi: place.name_vi || name,
      district: place.district ?? '',
      category: place.category ?? '',
      photo_credit: /unsplash\.com/i.test(url) ? 'Unsplash' : '',
      photo_source_url: ''
    });

    if (picked.length >= max) break;
  }

  return picked;
}

export function buildMarqueeTrack(cards, { reduced = false, minHalfCards = MIN_MARQUEE_HALF_CARDS } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  if (reduced) return cards;

  const repeatCount = Math.max(1, Math.ceil(minHalfCards / cards.length));
  const half = [];
  for (let i = 0; i < repeatCount; i += 1) {
    half.push(...cards);
  }
  return [...half, ...half];
}
