// Browser-only data layer. It keeps the existing UI usable when no API server is configured.
export const API_BASE = '';

export class ApiError extends Error {
  constructor(message, code = 'LOCAL_DATA', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const STORAGE_KEY = 'saigon-guide-local-data-v1';
const photo = (name) => `/images/${name}`;

const PLACES = [
  { place_name: 'Dinh Độc Lập', category: 'sightseeing', description: 'Dạo quanh di tích lịch sử giữa trung tâm thành phố.', address: '135 Nam Kỳ Khởi Nghĩa, Quận 1', latitude: 10.777, longitude: 106.6953, estimated_cost: 65000, time_slot: '09:00', photo_url: photo('independence-palace.jpg'), editorial_score: 4.8 },
  { place_name: 'Bảo tàng Chứng tích Chiến tranh', category: 'sightseeing', description: 'Tìm hiểu những câu chuyện lịch sử qua các khu trưng bày.', address: '28 Võ Văn Tần, Quận 3', latitude: 10.7794, longitude: 106.692, estimated_cost: 40000, time_slot: '10:30', photo_url: photo('trip-war-remnants.jpg'), editorial_score: 4.7 },
  { place_name: 'Phở Hoa Pasteur', category: 'food', description: 'Thưởng thức một tô phở nóng trong không gian quen thuộc của Sài Gòn.', address: '260C Pasteur, Quận 3', latitude: 10.776, longitude: 106.69, estimated_cost: 95000, time_slot: '12:00', photo_url: photo('pho.png'), editorial_score: 4.6 },
  { place_name: 'Cà phê Sài Gòn', category: 'cafe', description: 'Nghỉ chân với cà phê và ngắm nhịp sống phố thị.', address: 'Quận 1, TP. Hồ Chí Minh', latitude: 10.7736, longitude: 106.7042, estimated_cost: 85000, time_slot: '14:00', photo_url: photo('cafe.jpg'), editorial_score: 4.5 },
  { place_name: 'Chợ Bến Thành', category: 'shopping', description: 'Khám phá khu chợ trung tâm và các quầy hàng địa phương.', address: 'Lê Lợi, Quận 1', latitude: 10.7725, longitude: 106.698, estimated_cost: 100000, time_slot: '15:30', photo_url: photo('ben_thanh.jpeg'), editorial_score: 4.4 },
  { place_name: 'Nhà thờ Đức Bà', category: 'sightseeing', description: 'Ghé thăm công trình kiến trúc biểu tượng của thành phố.', address: 'Công trường Công xã Paris, Quận 1', latitude: 10.7798, longitude: 106.699, estimated_cost: 0, time_slot: '16:30', photo_url: photo('notre-dame.jpg'), editorial_score: 4.7 },
  { place_name: 'Bữa sáng món Việt', category: 'food', description: 'Thưởng thức món ăn địa phương trong khu phố trung tâm.', address: 'Quận 1, TP. Hồ Chí Minh', latitude: 10.7752, longitude: 106.697, estimated_cost: 180000, time_slot: '18:30', photo_url: photo('banh-mi.png'), editorial_score: 4.5 },
  { place_name: 'Chùa Bà Thiên Hậu', category: 'sightseeing', description: 'Tham quan ngôi chùa cổ trong khu phố người Hoa.', address: '710 Nguyễn Trãi, Quận 5', latitude: 10.754, longitude: 106.666, estimated_cost: 0, time_slot: '09:30', photo_url: photo('trip-temple.jpg'), editorial_score: 4.6 },
  { place_name: 'Bến Bạch Đằng', category: 'nature', description: 'Tản bộ dọc bờ sông và tận hưởng làn gió mát.', address: 'Tôn Đức Thắng, Quận 1', latitude: 10.772, longitude: 106.706, estimated_cost: 0, time_slot: '17:00', photo_url: photo('saigon-river.jpg'), editorial_score: 4.5 },
  { place_name: 'Phố đi bộ', category: 'entertaiment', description: 'Thư giãn bằng việc đi bộ và tận hưởng các hoạt động trên phố đi bộ', address: 'Đường Nguyễn Huệ, Quận 1', latitude: 10.774, longitude: 106.703, estimated_cost: 75000, time_slot: '15:00', photo_url: photo('nguyen_hue_walking_street.jpeg'), editorial_score: 4.4 }
];

function makeItinerary(days, seed = 0) {
  const items = [];
  for (let day = 1; day <= days; day += 1) {
    for (let order = 0; order < 4; order += 1) {
      const place = PLACES[(seed + (day - 1) * 3 + order) % PLACES.length];
      items.push({ ...place, day_number: day, order_index: order + 1, place_id: `place-${(seed + (day - 1) * 3 + order) % PLACES.length}` });
    }
  }
  return items;
}

function budgetFor(trip, items) {
  const activities = items.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
  const transit = Math.round(items.length * 18000);
  const total = activities + transit;
  const target = Number(trip.budget || 0);
  return { total_budget: target, total_estimated: total, activities_cost: activities, transit_cost: transit, percentage: target ? Math.round((total / target) * 100) : 0, health: total > target ? 'over_budget' : total > target * 0.85 ? 'near_budget' : 'under_budget' };
}

function makeTrip(id, title, days, budget, seed, cover, shared = false) {
  const trip = { id, title, days, budget, status: 'completed', created_at: new Date(Date.now() - seed * 86400000).toISOString(), start_location: 'Quận 1, TP. Hồ Chí Minh', preferences: ['food', 'culture'], cover_photo: photo(cover), cover_place_name: PLACES[seed % PLACES.length].place_name, is_shared: shared };
  const items = makeItinerary(days, seed);
  const summary = budgetFor(trip, items);
  trip.total_estimated = summary.total_estimated;
  trip.place_count = items.length;
  return { trip, items };
}

function initialState() {
  const records = [
    makeTrip('trip-1', 'Khám phá Sài Gòn 3 ngày', 3, 5000000, 0, 'trip-palace.jpg'),
    makeTrip('trip-2', 'Một ngày ở trung tâm', 2, 2000000, 1, 'trip-war-remnants.jpg'),
    makeTrip('demo', 'Sài Gòn cùng bạn bè', 4, 7000000, 2, 'trip-palace-shared.jpg', true),
    makeTrip('trip-4', 'Sài Gòn và Chợ Lớn', 3, 5000000, 7, 'trip-temple.jpg')
  ];
  const trips = Object.fromEntries(records.map(({ trip, items }) => [trip.id, { trip, items }]));
  return { trips, messages: {}, shares: { demo: 'demo' }, settings: { tone: 'friendly', ai_interaction: 'guided' }, user: null };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.trips && parsed?.shares) return parsed;
    }
    const state = initialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    return initialState();
  }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private browsing can disable storage */ }
  return state;
}

function missing() { return new ApiError('Không tìm thấy chuyến đi này.', 'NOT_FOUND', 404); }
function record(id) { const found = readState().trips[id]; if (!found) throw missing(); return found; }
function summarize(trip, items) { return budgetFor(trip, items); }
function nextId() { return `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }

export const api = {
  register: async ({ email } = {}) => { const user = { id: 'local-user', email: email || 'guest@example.com', name: 'Khách du lịch' }; const state = readState(); state.user = user; save(state); return { user, token: 'local-session' }; },
  login: async ({ email } = {}) => api.register({ email }),
  loginWithGoogle: async () => api.register({ email: 'guest@example.com' }),
  getMe: async () => ({ user: readState().user }),
  changePassword: async () => ({ success: true }),
  deleteAccount: async () => { const state = readState(); state.user = null; save(state); return { success: true }; },
  getSettings: async () => ({ settings: readState().settings }),
  updateSettings: async (settings) => { const state = readState(); state.settings = { ...state.settings, ...settings }; save(state); return { settings: state.settings }; },
  createTrip: async (payload = {}) => {
    const state = readState(); const id = nextId(); const days = Math.min(14, Math.max(1, Number(payload.days) || 3));
    const seed = Math.floor(Math.random() * PLACES.length); const items = makeItinerary(days, seed);
    const trip = { id, title: `Khám phá Sài Gòn ${days} ngày`, days, budget: Number(payload.budget) || 5000000, status: 'completed', created_at: new Date().toISOString(), start_location: payload.start_location || 'Quận 1, TP. Hồ Chí Minh', preferences: payload.preferences || [], cover_photo: items[0]?.photo_url || photo('saigon-river.jpg'), cover_place_name: items[0]?.place_name || 'Sài Gòn', is_shared: false, source: payload.source || 'form' };
    trip.total_estimated = summarize(trip, items).total_estimated; trip.place_count = items.length; state.trips[id] = { trip, items }; state.messages[id] = []; save(state); return trip;
  },
  listTrips: async () => ({ trips: Object.values(readState().trips).map(({ trip }) => trip).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) }),
  getTrip: async (id) => { const { trip, items } = record(id); return { trip, itinerary_items: items, budget_summary: summarize(trip, items) }; },
  updateTrip: async (id, updates) => { const state = readState(); const item = state.trips[id]; if (!item) throw missing(); item.trip = { ...item.trip, ...updates }; save(state); return item.trip; },
  deleteTrip: async (id) => { const state = readState(); delete state.trips[id]; delete state.messages[id]; for (const [token, target] of Object.entries(state.shares)) if (target === id) delete state.shares[token]; save(state); return { success: true }; },
  duplicateTrip: async (id) => { const source = record(id); const state = readState(); const copyId = nextId(); const trip = { ...source.trip, id: copyId, title: `${source.trip.title} (bản sao)`, created_at: new Date().toISOString(), is_shared: false }; state.trips[copyId] = { trip, items: source.items.map((item) => ({ ...item })) }; state.messages[copyId] = []; save(state); return { id: copyId, trip }; },
  createShareLink: async (id) => { record(id); const state = readState(); const token = `share-${Math.random().toString(36).slice(2, 9)}`; state.shares[token] = id; state.trips[id].trip.is_shared = true; save(state); return { token, share_url: `${window.location.origin}/s/${token}` }; },
  revokeShareLink: async (id, token) => { const state = readState(); const key = token || Object.keys(state.shares).find((value) => state.shares[value] === id); if (key) delete state.shares[key]; if (state.trips[id]) state.trips[id].trip.is_shared = false; save(state); return { success: true }; },
  getSharedTrip: async (token) => { const id = readState().shares[token]; if (!id) throw missing(); const { trip, items } = record(id); return { trip, itinerary_items: items, budget_summary: summarize(trip, items) }; },
  cloneSharedTrip: async (token) => { const id = readState().shares[token]; if (!id) throw missing(); return api.duplicateTrip(id); },
  getMessages: async (id) => { record(id); return { messages: readState().messages[id] || [] }; },
  sendMessage: async (id, text) => {
    const state = readState(); const entry = state.trips[id]; if (!entry) throw missing(); const messages = state.messages[id] || [];
    const content = String(text || '').trim(); const lower = content.toLocaleLowerCase('vi');
    const userMessage = { id: nextId(), role: 'user', content, created_at: new Date().toISOString() };
    let reply = 'Mình đã ghi nhận yêu cầu. Bạn có thể xem lịch trình và chi phí được cập nhật ở bên cạnh nhé.';
    if (/thêm.*(cà phê|cafe|coffee)|((cà phê|cafe|coffee).*thêm)/.test(lower)) {
      const day = Number(lower.match(/ngày\s*(\d+)/)?.[1]) || 1;
      if (!entry.items.some((item) => item.day_number === day && item.category === 'cafe')) {
        const cafe = { ...PLACES[9], day_number: day, order_index: Math.max(0, ...entry.items.filter((item) => item.day_number === day).map((item) => item.order_index)) + 1, time_slot: '20:00', place_id: 'place-evening-cafe' };
        entry.items.push(cafe); reply = `Mình đã thêm ${cafe.place_name} vào ngày ${day}.`;
      } else reply = `Ngày ${day} đã có điểm dừng cà phê trong lịch trình rồi.`;
    }
    else if (/cà phê|cafe|coffee/.test(lower)) { const item = entry.items.find((place) => place.category === 'cafe'); if (item) { Object.assign(item, PLACES.find((place) => place.category === 'cafe' && place.place_name !== item.place_name) || PLACES[9]); reply = `Mình đã cập nhật điểm dừng cà phê thành ${item.place_name}.`; } }
    else if (/rẻ|tiết kiệm|budget|cheap/.test(lower)) { entry.items.forEach((item) => { item.estimated_cost = Math.round(item.estimated_cost * 0.85); }); reply = 'Mình đã điều chỉnh các khoản ăn uống để lịch trình tiết kiệm hơn.'; }
    else if (/đổi|thay|swap|replace/.test(lower)) {
      const targetName = entry.items.find((place) => lower.includes(place.place_name.toLocaleLowerCase('vi')))?.place_name;
      const targetDay = Number(lower.match(/ngày\s*(\d+)/)?.[1]);
      const item = entry.items.find((place) => targetName ? place.place_name === targetName : targetDay ? place.day_number === targetDay && place.category === 'food' : place.category === 'food');
      if (item) {
        const replacement = PLACES.find((place) => place.category === item.category && place.place_name !== item.place_name) || PLACES.find((place) => place.category === 'food' && place.place_name !== item.place_name) || PLACES[2];
        const original = { day_number: item.day_number, order_index: item.order_index };
        Object.assign(item, replacement, original);
        reply = `Đã đổi điểm dừng thành ${item.place_name}.`;
      }
    }
    const summary = summarize(entry.trip, entry.items); entry.trip.total_estimated = summary.total_estimated;
    const assistantMessage = { id: nextId(), role: 'assistant', content: reply, created_at: new Date().toISOString() };
    state.messages[id] = [...messages, userMessage, assistantMessage]; save(state);
    return { reply, messages: [userMessage, assistantMessage], quick_replies: [], status: 'completed', updated_itinerary: entry.items, budget_summary: summary };
  },
  listPhotos: async (limit = 20) => ({ photos: PLACES.slice(0, Math.max(0, Number(limit) || 20)).map((place, index) => ({ place_id: `photo-${index}`, photo_url: place.photo_url, name: place.place_name, name_vi: place.place_name, district: place.address.split(',').slice(-1)[0].trim(), category: place.category, photo_credit: 'Ảnh tham khảo trong dự án', photo_source_url: '' })) })
};

export function assetUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value;
}
