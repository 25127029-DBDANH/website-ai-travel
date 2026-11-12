// Browser-only data layer with rich HCMC catalog, detailed time slots, contingency scenarios, and Google Calendar sync.
export const API_BASE = '';

export class ApiError extends Error {
  constructor(message, code = 'LOCAL_DATA', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const STORAGE_KEY = 'saigon-guide-local-data-v2';
const photo = (name) => `/images/${name}`;

export const PLACES = [
  {
    place_id: 'p-dinh-doc-lap',
    place_name: 'Dinh Độc Lập',
    category: 'sightseeing',
    description: 'Di tích lịch sử kiến trúc đặc sắc giữa lòng Sài Gòn, biểu tượng của ngày thống nhất đất nước.',
    address: '135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1',
    district: 'Quận 1',
    latitude: 10.7770,
    longitude: 106.6953,
    estimated_cost: 65000,
    photo_url: photo('independence-palace.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['08:00 - 16:30'],
    suggested_duration: 105
  },
  {
    place_id: 'p-bao-tang-ctct',
    place_name: 'Bảo tàng Chứng tích Chiến tranh',
    category: 'sightseeing',
    description: 'Khám phá các hiện vật, hình ảnh lịch sử giàu cảm xúc, địa điểm được du khách quốc tế đánh giá cao nhất.',
    address: '28 Võ Văn Tần, Phường 6, Quận 3',
    district: 'Quận 3',
    latitude: 10.7794,
    longitude: 106.6920,
    estimated_cost: 40000,
    photo_url: photo('trip-war-remnants.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['07:30 - 17:30'],
    suggested_duration: 75
  },
  {
    place_id: 'p-pho-hoa',
    place_name: 'Phở Hoa Pasteur',
    category: 'food',
    description: 'Thưởng thức tô phở bò gia truyền chuẩn vị với nước dùng đậm đà hơn 50 năm quen thuộc của người Sài Gòn.',
    address: '260C Pasteur, Phường 8, Quận 3',
    district: 'Quận 3',
    latitude: 10.7760,
    longitude: 106.6900,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:00 - 22:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-cafe-saigon',
    place_name: 'Cà phê Sài Gòn xưa',
    category: 'cafe',
    description: 'Không gian hoài niệm giữa phố cổ, nhâm nhi ly cà phê sữa đá đậm đà và ngắm nhìn dòng người qua lại.',
    address: '14 Tôn Thất Đạm, Phường Nguyễn Thái Bình, Quận 1',
    district: 'Quận 1',
    latitude: 10.7736,
    longitude: 106.7042,
    estimated_cost: 55000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['07:00 - 22:30'],
    suggested_duration: 60
  },
  {
    place_id: 'p-cho-ben-thanh',
    place_name: 'Chợ Bến Thành',
    category: 'shopping',
    description: 'Biểu tượng lịch sử văn hóa hơn 100 năm, nơi mua sắm đặc sản, quà lưu niệm và trải nghiệm nét giao thương nhộn nhịp.',
    address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1',
    district: 'Quận 1',
    latitude: 10.7725,
    longitude: 106.6980,
    estimated_cost: 100000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.4,
    is_indoor: true,
    opening_hours: ['06:00 - 18:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-nha-tho-duc-ba',
    place_name: 'Nhà thờ Đức Bà Sài Gòn',
    category: 'sightseeing',
    description: 'Công trình kiến trúc Gothic & Roman cổ kính, kiệt tác gạch ngói Marseille giữa trung tâm quảng trường Paris.',
    address: '01 Công trường Công xã Paris, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7798,
    longitude: 106.6990,
    estimated_cost: 0,
    photo_url: photo('notre-dame.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['Tham quan bên ngoài 24/7'],
    suggested_duration: 45
  },
  {
    place_id: 'p-banh-mi-viet',
    place_name: 'Bánh Mì Huỳnh Hoa & Ẩm thực đường phố',
    category: 'food',
    description: 'Ổ bánh mì đầy ắp pate, giăm bông và chả lụa nức tiếng Sài Gòn, bữa ăn sáng tràn đầy năng lượng.',
    address: '26 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1',
    district: 'Quận 1',
    latitude: 10.7752,
    longitude: 106.6970,
    estimated_cost: 68000,
    photo_url: photo('banh-mi.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:00 - 22:00'],
    suggested_duration: 45
  },
  {
    place_id: 'p-chua-ba-thien-hau',
    place_name: 'Chùa Bà Thiên Hậu (Chợ Lớn)',
    category: 'sightseeing',
    description: 'Ngôi chùa cổ linh thiêng của cộng đồng người Hoa với nghệ thuật gốm sứ tinh xảo và những vòng nhang treo độc đáo.',
    address: '710 Nguyễn Trãi, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7540,
    longitude: 106.6660,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:30 - 16:30'],
    suggested_duration: 75
  },
  {
    place_id: 'p-ben-bach-dang',
    place_name: 'Công viên Bến Bạch Đằng & Ngắm sông Sài Gòn',
    category: 'nature',
    description: 'Tản bộ dọc bờ sông ngắm hoàng hôn, đón gió mát trong lành và ngắm nhìn các tòa tháp Thủ Thiêm lung linh.',
    address: 'Đường Tôn Đức Thắng, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7720,
    longitude: 106.7060,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.5,
    is_indoor: false,
    opening_hours: ['Mở cửa 24/7'],
    suggested_duration: 60
  },
  {
    place_id: 'p-pho-di-bo',
    place_name: 'Phố đi bộ Nguyễn Huệ & Đài phun nước',
    category: 'entertaiment',
    description: 'Trái tim sôi động của thành phố về đêm với âm nhạc đường phố, ẩm thực trà sữa và không khí náo nhiệt.',
    address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7740,
    longitude: 106.7030,
    estimated_cost: 75000,
    photo_url: photo('nguyen_hue_walking_street.jpeg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['Nhộn nhịp từ 18:00 - 23:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-bao-tang-my-thuat',
    place_name: 'Bảo tàng Mỹ thuật TP. Hồ Chí Minh',
    category: 'sightseeing',
    description: 'Tòa biệt thự Pháp cổ kính mang phong cách Art Deco với những ô cửa kính màu và hàng ngàn tác phẩm hội họa quý giá.',
    address: '97A Phó Đức Chính, Phường Nguyễn Thái Bình, Quận 1',
    district: 'Quận 1',
    latitude: 10.7698,
    longitude: 106.6994,
    estimated_cost: 30000,
    photo_url: photo('museum.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['08:00 - 17:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-workshop-coffee',
    place_name: 'The Workshop Specialty Coffee',
    category: 'cafe',
    description: 'Quán cà phê specialty hàng đầu trên căn gác cổ, nơi thưởng thức hương vị cà phê rang xay thủ công thượng hạng.',
    address: '27 Ngô Đức Kế, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7731,
    longitude: 106.7051,
    estimated_cost: 85000,
    photo_url: photo('coffee.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['08:00 - 21:00'],
    suggested_duration: 60
  }
];

// Sinh khung giờ và khối di chuyển chuẩn xác từ sáng đến tối
export function generateScheduleForDay(dayNumber, placeCount = 4, seed = 0) {
  const count = Math.min(6, Math.max(3, placeCount));
  
  // Khung mẫu các mốc thời gian logic chuẩn
  const timeTemplates = {
    3: [
      { start: '08:30', end: '10:30', slot: '08:30 - 10:30', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.2, mode: 'walk', fare: 0 } },
      { start: '11:30', end: '13:30', slot: '11:30 - 13:30', cat: 'food', isLunch: true, transitToNext: { min: 20, dist: 1.8, mode: 'grab_bike', fare: 20000 } },
      { start: '15:00', end: '17:30', slot: '15:00 - 17:30', cat: 'cafe', transitToNext: { min: 15, dist: 1.0, mode: 'grab_bike', fare: 18000 } }
    ],
    4: [
      { start: '08:30', end: '10:15', slot: '08:30 - 10:15', cat: 'sightseeing', transitToNext: { min: 15, dist: 0.9, mode: 'walk', fare: 0 } },
      { start: '10:30', end: '11:45', slot: '10:30 - 11:45', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.2, mode: 'grab_bike', fare: 18000 } },
      { start: '12:00', end: '13:30', slot: '12:00 - 13:30', cat: 'food', isLunch: true, transitToNext: { min: 20, dist: 1.5, mode: 'grab_bike', fare: 22000 } },
      { start: '14:00', end: '16:00', slot: '14:00 - 16:00', cat: 'shopping', transitToNext: { min: 15, dist: 1.1, mode: 'walk', fare: 0 } }
    ],
    5: [
      { start: '08:00', end: '09:45', slot: '08:00 - 09:45', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.1, mode: 'walk', fare: 0 } },
      { start: '10:00', end: '11:30', slot: '10:00 - 11:30', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.3, mode: 'grab_bike', fare: 18000 } },
      { start: '11:45', end: '13:15', slot: '11:45 - 13:15', cat: 'food', isLunch: true, transitToNext: { min: 20, dist: 1.6, mode: 'grab_bike', fare: 22000 } },
      { start: '13:45', end: '15:30', slot: '13:45 - 15:30', cat: 'shopping', transitToNext: { min: 15, dist: 1.0, mode: 'walk', fare: 0 } },
      { start: '16:00', end: '17:45', slot: '16:00 - 17:45', cat: 'cafe', transitToNext: { min: 20, dist: 1.4, mode: 'grab_bike', fare: 20000 } }
    ],
    6: [
      { start: '08:00', end: '09:30', slot: '08:00 - 09:30', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.0, mode: 'walk', fare: 0 } },
      { start: '09:45', end: '11:15', slot: '09:45 - 11:15', cat: 'sightseeing', transitToNext: { min: 15, dist: 1.2, mode: 'grab_bike', fare: 18000 } },
      { start: '11:30', end: '13:00', slot: '11:30 - 13:00', cat: 'food', isLunch: true, transitToNext: { min: 20, dist: 1.5, mode: 'grab_bike', fare: 22000 } },
      { start: '13:30', end: '15:15', slot: '13:30 - 15:15', cat: 'shopping', transitToNext: { min: 15, dist: 0.9, mode: 'walk', fare: 0 } },
      { start: '15:30', end: '17:00', slot: '15:30 - 17:00', cat: 'cafe', transitToNext: { min: 20, dist: 1.3, mode: 'grab_bike', fare: 20000 } },
      { start: '17:30', end: '19:30', slot: '17:30 - 19:30', cat: 'entertaiment', transitToNext: { min: 15, dist: 1.0, mode: 'walk', fare: 0 } }
    ]
  };

  const template = timeTemplates[count] || timeTemplates[4];
  const items = [];

  for (let i = 0; i < count; i++) {
    const slotInfo = template[i];
    const placeIndex = (seed + (dayNumber - 1) * 3 + i) % PLACES.length;
    let place = PLACES[placeIndex];

    // Đảm bảo bữa trưa luôn là ẩm thực
    if (slotInfo.isLunch && place.category !== 'food') {
      place = PLACES.find((p) => p.category === 'food') || place;
    }

    const transit = i > 0 ? {
      duration_min: template[i - 1].transitToNext.min,
      distance_km: template[i - 1].transitToNext.dist,
      mode: template[i - 1].transitToNext.mode,
      estimated_fare_vnd: template[i - 1].transitToNext.fare,
      start_time: template[i - 1].end,
      end_time: slotInfo.start
    } : null;

    items.push({
      ...place,
      day_number: dayNumber,
      order_index: i + 1,
      time_slot: slotInfo.slot,
      start_time: slotInfo.start,
      end_time: slotInfo.end,
      is_lunch: Boolean(slotInfo.isLunch),
      transit_info: transit,
      visited: false
    });
  }

  return items;
}

export function makeItinerary(days, placesPerDay = 4, seed = 0) {
  const items = [];
  for (let day = 1; day <= days; day += 1) {
    const dayStops = generateScheduleForDay(day, placesPerDay, seed);
    items.push(...dayStops);
  }
  return items;
}

export function budgetFor(trip, items) {
  const activities = items.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
  const transit = items.reduce((sum, item) => sum + Number(item.transit_info?.estimated_fare_vnd || 0), 0) + (items.length * 5000);
  const total = activities + transit;
  const target = Number(trip?.budget || 0);
  return {
    total_budget: target,
    total_estimated: total,
    activities_cost: activities,
    transit_cost: transit,
    percentage: target ? Math.round((total / target) * 100) : 0,
    health: total > target ? 'over_budget' : total > target * 0.85 ? 'near_budget' : 'under_budget'
  };
}

function makeTrip(id, title, days, budget, seed, cover, shared = false, placesPerDay = 4) {
  const trip = {
    id,
    title,
    days,
    budget,
    places_per_day: placesPerDay,
    status: 'completed',
    created_at: new Date(Date.now() - seed * 86400000).toISOString(),
    start_location: 'Quận 1, TP. Hồ Chí Minh',
    preferences: ['food', 'culture'],
    cover_photo: photo(cover),
    cover_place_name: PLACES[seed % PLACES.length].place_name,
    is_shared: shared
  };
  const items = makeItinerary(days, placesPerDay, seed);
  const summary = budgetFor(trip, items);
  trip.total_estimated = summary.total_estimated;
  trip.place_count = items.length;
  return { trip, items };
}

function initialState() {
  const records = [
    makeTrip('trip-1', 'Khám phá Sài Gòn 3 ngày', 3, 5000000, 0, 'trip-palace.jpg', false, 4),
    makeTrip('trip-2', 'Một ngày ở trung tâm', 1, 2000000, 1, 'trip-war-remnants.jpg', false, 4),
    makeTrip('demo', 'Sài Gòn cùng bạn bè', 3, 6000000, 2, 'trip-palace-shared.jpg', true, 4),
    makeTrip('trip-4', 'Sài Gòn và Chợ Lớn', 3, 5000000, 7, 'trip-temple.jpg', false, 4)
  ];
  const trips = Object.fromEntries(records.map(({ trip, items }) => [trip.id, { trip, items }]));
  return { trips, messages: {}, shares: { demo: 'demo' }, settings: { tone: 'friendly' }, user: null };
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private browsing mode fallback
  }
  return state;
}

function missing() {
  return new ApiError('Không tìm thấy chuyến đi này.', 'NOT_FOUND', 404);
}

function record(id) {
  const state = readState();
  if (state.trips && state.trips[id]) return state.trips[id];

  // Luôn đảm bảo demo và bất kỳ ID nào cũng tự khởi tạo nếu chưa có
  if (!id || id === 'demo' || id.startsWith('demo')) {
    const demoTrip = makeTrip('demo', 'Khám phá Sài Gòn 3 ngày', 3, 5000000, 0, 'trip-palace.jpg', true, 4);
    if (!state.trips) state.trips = {};
    state.trips['demo'] = demoTrip;
    save(state);
    return demoTrip;
  }

  const existingTrips = state.trips ? Object.values(state.trips) : [];
  if (existingTrips.length > 0) {
    return existingTrips[0];
  }

  const fallback = makeTrip(id, 'Khám phá Sài Gòn 3 ngày', 3, 5000000, 0, 'trip-palace.jpg', false, 4);
  if (!state.trips) state.trips = {};
  state.trips[id] = fallback;
  save(state);
  return fallback;
}

function summarize(trip, items) {
  return budgetFor(trip, items);
}

function nextId() {
  return `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------- GOOGLE CALENDAR (.ICS) EXPORT ----------------
export function generateIcsContent(trip, items) {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Saigon Guide//AI Travel Planner//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Lịch trình Sài Gòn - ${trip?.title || 'TP.HCM'}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'
  ];

  items.forEach((item, index) => {
    const dayOffset = (Number(item.day_number) || 1) - 1;
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + dayOffset);

    const [startH, startM] = (item.start_time || '09:00').split(':').map(Number);
    const [endH, endM] = (item.end_time || '10:30').split(':').map(Number);

    const y = eventDate.getFullYear();
    const m = pad(eventDate.getMonth() + 1);
    const d = pad(eventDate.getDate());

    const dtStart = `${y}${m}${d}T${pad(startH)}${pad(startM)}00`;
    const dtEnd = `${y}${m}${d}T${pad(endH)}${pad(endM)}00`;
    const costText = item.estimated_cost ? `${Number(item.estimated_cost).toLocaleString('vi-VN')} đ` : 'Miễn phí';

    lines.push(
      'BEGIN:VEVENT',
      `UID:saigon-stop-${item.day_number}-${item.order_index}-${index}-${Date.now()}@saigonguide.app`,
      `DTSTAMP:${y}${m}${d}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:[${item.start_time} - ${item.end_time}] ${item.place_name}`,
      `DESCRIPTION:${item.description || ''}\\n\\nChi phí dự kiến: ${costText}\\nĐịa chỉ: ${item.address || ''}`,
      `LOCATION:${item.address || 'TP. Hồ Chí Minh'}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Nhắc nhở: Chuẩn bị đến ${item.place_name}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(trip, items) {
  const icsText = generateIcsContent(trip, items);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', `lich-trinh-saigon-${trip?.id || 'chuyen-di'}.ics`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const api = {
  register: async ({ email } = {}) => {
    const user = { id: 'local-user', email: email || 'guest@example.com', name: 'Khách du lịch Sài Gòn' };
    const state = readState();
    state.user = user;
    save(state);
    return { user, token: 'local-session' };
  },
  login: async ({ email } = {}) => api.register({ email }),
  loginWithGoogle: async () => api.register({ email: 'guest@example.com' }),
  getMe: async () => ({ user: readState().user }),
  changePassword: async () => ({ success: true }),
  deleteAccount: async () => {
    const state = readState();
    state.user = null;
    save(state);
    return { success: true };
  },
  getSettings: async () => ({ settings: readState().settings }),
  updateSettings: async (settings) => {
    const state = readState();
    state.settings = { ...state.settings, ...settings };
    save(state);
    return { settings: state.settings };
  },

  createTrip: async (payload = {}) => {
    const state = readState();
    const id = nextId();
    const days = Math.min(14, Math.max(1, Number(payload.days) || 3));
    const placesPerDay = Math.min(6, Math.max(3, Number(payload.places_per_day) || 4));
    const seed = Math.floor(Math.random() * PLACES.length);
    const items = makeItinerary(days, placesPerDay, seed);
    
    const trip = {
      id,
      title: `Khám phá Sài Gòn ${days} ngày`,
      days,
      places_per_day: placesPerDay,
      budget: Number(payload.budget) || 5000000,
      companion: payload.companion || 'friends',
      transport_mode: payload.transport_mode || 'grab_bike',
      start_time: payload.start_time || '08:00',
      end_time: payload.end_time || '21:30',
      status: 'completed',
      created_at: new Date().toISOString(),
      start_location: payload.start_location || 'Quận 1, TP. Hồ Chí Minh',
      preferences: payload.preferences || ['food', 'culture'],
      cover_photo: items[0]?.photo_url || photo('independence-palace.jpg'),
      cover_place_name: items[0]?.place_name || 'Dinh Độc Lập',
      is_shared: false,
      source: 'form'
    };

    trip.total_estimated = summarize(trip, items).total_estimated;
    trip.place_count = items.length;
    state.trips[id] = { trip, items };
    state.messages[id] = [];
    save(state);
    return trip;
  },

  listTrips: async () => ({
    trips: Object.values(readState().trips)
      .map(({ trip }) => trip)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }),

  getTrip: async (id) => {
    const { trip, items } = record(id);
    return { trip, itinerary_items: items, budget_summary: summarize(trip, items) };
  },

  updateTrip: async (id, updates) => {
    const state = readState();
    const item = state.trips[id];
    if (!item) throw missing();
    item.trip = { ...item.trip, ...updates };
    save(state);
    return item.trip;
  },

  deleteTrip: async (id) => {
    const state = readState();
    delete state.trips[id];
    delete state.messages[id];
    for (const [token, target] of Object.entries(state.shares)) {
      if (target === id) delete state.shares[token];
    }
    save(state);
    return { success: true };
  },

  duplicateTrip: async (id) => {
    const source = record(id);
    const state = readState();
    const copyId = nextId();
    const trip = {
      ...source.trip,
      id: copyId,
      title: `${source.trip.title} (bản sao)`,
      created_at: new Date().toISOString(),
      is_shared: false
    };
    state.trips[copyId] = { trip, items: source.items.map((item) => ({ ...item })) };
    state.messages[copyId] = [];
    save(state);
    return { id: copyId, trip };
  },

  createShareLink: async (id) => {
    record(id);
    const state = readState();
    const token = `share-${Math.random().toString(36).slice(2, 9)}`;
    state.shares[token] = id;
    state.trips[id].trip.is_shared = true;
    save(state);
    return { token, share_url: `${window.location.origin}/s/${token}` };
  },

  revokeShareLink: async (id, token) => {
    const state = readState();
    const key = token || Object.keys(state.shares).find((val) => state.shares[val] === id);
    if (key) delete state.shares[key];
    if (state.trips[id]) state.trips[id].trip.is_shared = false;
    save(state);
    return { success: true };
  },

  getSharedTrip: async (token) => {
    const id = readState().shares[token];
    if (!id) throw missing();
    const { trip, items } = record(id);
    return { trip, itinerary_items: items, budget_summary: summarize(trip, items) };
  },

  cloneSharedTrip: async (token) => {
    const id = readState().shares[token];
    if (!id) throw missing();
    return api.duplicateTrip(id);
  },

  // Lấy danh sách địa điểm thay thế tương đương
  getAlternatives: (item) => {
    const sameCat = PLACES.filter(
      (p) => p.category === item.category && p.place_name !== item.place_name
    );
    const sameDist = PLACES.filter(
      (p) => p.district === item.district && p.place_name !== item.place_name && !sameCat.some((c) => c.place_id === p.place_id)
    );
    const others = PLACES.filter(
      (p) => p.place_name !== item.place_name && !sameCat.some((c) => c.place_id === p.place_id) && !sameDist.some((d) => d.place_id === p.place_id)
    );
    return [...sameCat, ...sameDist, ...others].slice(0, 4);
  },

  // Đổi địa điểm trực tiếp trên giao diện
  swapPlace: async (tripId, dayNumber, orderIndex, replacement) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    const targetIdx = entry.items.findIndex(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (targetIdx !== -1) {
      const original = entry.items[targetIdx];
      entry.items[targetIdx] = {
        ...replacement,
        day_number: original.day_number,
        order_index: original.order_index,
        time_slot: original.time_slot,
        start_time: original.start_time,
        end_time: original.end_time,
        transit_info: original.transit_info,
        visited: original.visited || false
      };
      const summary = summarize(entry.trip, entry.items);
      entry.trip.total_estimated = summary.total_estimated;
      save(state);
      return { items: entry.items, budget_summary: summary };
    }
    return { items: entry.items, budget_summary: summarize(entry.trip, entry.items) };
  },

  // Đánh dấu đã ghé thăm (Check-in Companion)
  toggleVisited: async (tripId, dayNumber, orderIndex) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    const target = entry.items.find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (target) {
      target.visited = !target.visited;
      save(state);
      return { items: entry.items };
    }
    return { items: entry.items };
  },

  // Chốt / Chấp nhận địa điểm trong lịch trình (Accept stop)
  toggleAcceptPlace: async (tripId, dayNumber, orderIndex) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    const target = entry.items.find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (target) {
      target.is_accepted = !target.is_accepted;
      save(state);
      return { items: entry.items };
    }
    return { items: entry.items };
  },

  // Lưu ảnh và ghi chú check-in thực tế
  saveCheckin: async (tripId, dayNumber, orderIndex, { photoUrl, note } = {}) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    const target = entry.items.find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (target) {
      target.visited = true;
      if (photoUrl) target.checkin_photo = photoUrl;
      if (note) target.checkin_note = note;
      target.checkin_time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      save(state);
      return { items: entry.items };
    }
    return { items: entry.items };
  },

  // Áp dụng Kịch bản Trời mưa (Rain Mode) cho 1 ngày
  applyRainMode: async (tripId, dayNumber, enableRain) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    const indoorPlaces = PLACES.filter((p) => p.is_indoor);
    let indoorCursor = 0;

    entry.items = entry.items.map((item) => {
      if (item.day_number !== Number(dayNumber)) return item;

      if (enableRain) {
        let updated = item;
        // Nếu là điểm ngoài trời, đổi sang điểm trong nhà
        if (!item.is_indoor) {
          const replacement = indoorPlaces[indoorCursor % indoorPlaces.length];
          indoorCursor++;
          updated = {
            ...replacement,
            day_number: item.day_number,
            order_index: item.order_index,
            time_slot: item.time_slot,
            start_time: item.start_time,
            end_time: item.end_time,
            visited: item.visited
          };
        }
        // Đổi transit sang xe ô tô GrabCar có mái che
        if (updated.transit_info) {
          updated.transit_info = {
            ...updated.transit_info,
            mode: 'grab_car',
            estimated_fare_vnd: Math.max(35000, (updated.transit_info.estimated_fare_vnd || 18000) * 1.8)
          };
        }
        return updated;
      }
      return item;
    });

    const summary = summarize(entry.trip, entry.items);
    entry.trip.total_estimated = summary.total_estimated;
    save(state);
    return { items: entry.items, budget_summary: summary };
  },

  // Áp dụng Kịch bản Giờ cao điểm (Rush-Hour Mode) cho 1 ngày
  applyTrafficMode: async (tripId, dayNumber, enableTraffic) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    entry.items = entry.items.map((item) => {
      if (item.day_number !== Number(dayNumber)) return item;

      if (enableTraffic && item.transit_info) {
        // Tăng thêm 20 phút kẹt xe vào thời gian di chuyển
        return {
          ...item,
          transit_info: {
            ...item.transit_info,
            duration_min: item.transit_info.duration_min + 20,
            is_rush_hour: true
          }
        };
      }
      return item;
    });

    const summary = summarize(entry.trip, entry.items);
    save(state);
    return { items: entry.items, budget_summary: summary };
  },

  // Tinh chỉnh AI: Tối ưu tiết kiệm ngân sách 20%
  optimizeBudget: async (tripId) => {
    const state = readState();
    const entry = state.trips[tripId];
    if (!entry) throw missing();

    entry.items.forEach((item) => {
      if (item.estimated_cost > 30000) {
        item.estimated_cost = Math.round((item.estimated_cost * 0.8) / 1000) * 1000;
      }
    });
    const summary = summarize(entry.trip, entry.items);
    entry.trip.total_estimated = summary.total_estimated;
    save(state);
    return { items: entry.items, budget_summary: summary };
  },

  getMessages: async (id) => {
    record(id);
    return { messages: readState().messages[id] || [] };
  },

  sendMessage: async (id, text) => {
    const state = readState();
    const entry = state.trips[id];
    if (!entry) throw missing();
    const messages = state.messages[id] || [];
    const content = String(text || '').trim();
    const userMessage = { id: nextId(), role: 'user', content, created_at: new Date().toISOString() };
    const reply = 'Hệ thống đã cập nhật lịch trình trực quan theo lựa chọn của bạn!';
    const summary = summarize(entry.trip, entry.items);
    const assistantMessage = { id: nextId(), role: 'assistant', content: reply, created_at: new Date().toISOString() };
    state.messages[id] = [...messages, userMessage, assistantMessage];
    save(state);
    return { reply, messages: [userMessage, assistantMessage], quick_replies: [], status: 'completed', updated_itinerary: entry.items, budget_summary: summary };
  },

  listPhotos: async (limit = 20) => ({
    photos: PLACES.slice(0, Math.max(0, Number(limit) || 20)).map((place, index) => ({
      place_id: `photo-${index}`,
      photo_url: place.photo_url,
      name: place.place_name,
      name_vi: place.place_name,
      district: place.district,
      category: place.category,
      photo_credit: 'Ảnh tư liệu dự án TP.HCM',
      photo_source_url: ''
    }))
  })
};

export function assetUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value;
}

export function openGrabTransport(place) {
  if (!place) return;
  const lat = place.latitude || 10.7769;
  const lng = place.longitude || 106.7009;
  const name = encodeURIComponent(place.place_name || 'Điểm đến');

  const grabAppUrl = `grab://open?screenType=TRANSPORT&dropoff_lat=${lat}&dropoff_lng=${lng}&dropoff_name=${name}`;
  const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = grabAppUrl;
    setTimeout(() => {
      window.open(webFallbackUrl, '_blank');
    }, 1500);
  } else {
    window.open(webFallbackUrl, '_blank');
  }
}
