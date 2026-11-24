// Data layer & API Gateway with rich HCMC catalog, detailed time slots, contingency scenarios,
// Google Calendar sync, and VITE_USE_BACKEND toggle between FastAPI Backend (Khang/Lam/Đạt) and Mock Data.
// Authors: Diệp Bảo Danh (API Gateway Lead), Đỗ Nguyễn An Khang (Auth & Trip CRUD), Lê Hữu Lam (Gemini AI), Ngô Tấn Đạt (Places)
import { getAuthToken, clearAuthToken, getSessionId } from './auth.js';
import { selectMarqueePhotos } from './marqueePhotos.js';

const RAW_API_BASE = (import.meta.env?.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '');
const API_ORIGIN = RAW_API_BASE.replace(/\/api\/v1$/, '');
export const API_BASE = API_ORIGIN;
const AI_API_BASE = `${API_ORIGIN}/api/v1`;

// ---------------------------------------------------------------------------
// VITE_USE_BACKEND Gateway Toggle (Issue #11)
// - Default: true (calls FastAPI endpoints of Khang, Lam, Đạt)
// - When VITE_USE_BACKEND=false: uses local Mock Data so UI never fails offline
// ---------------------------------------------------------------------------
const RAW_USE_BACKEND = String(import.meta.env?.VITE_USE_BACKEND ?? 'true').trim().toLowerCase();
export const USE_BACKEND = RAW_USE_BACKEND !== 'false' && RAW_USE_BACKEND !== '0';

let runtimeUseBackendOverride = null;

export function setUseBackend(enabled) {
  runtimeUseBackendOverride = typeof enabled === 'boolean' ? enabled : null;
}

export function isBackendEnabled() {
  if (typeof runtimeUseBackendOverride === 'boolean') return runtimeUseBackendOverride;
  return USE_BACKEND;
}

export class ApiError extends Error {
  constructor(message, code = 'LOCAL_DATA', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function postAiRequest(path, payload) {
  let response;
  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(`${AI_API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch {
    throw new ApiError('Không thể kết nối máy chủ AI. Hãy kiểm tra backend đang chạy.', 'AI_UNAVAILABLE', 0);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.detail === 'string' ? result.detail : 'Yêu cầu AI không thành công.';
    throw new ApiError(detail, 'AI_REQUEST_FAILED', response.status);
  }
  return result;
}

// ---------------------------------------------------------------------------
// HTTP helper — calls real backend with JWT auth
// ---------------------------------------------------------------------------
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (path.startsWith('/api/v1/trips') || path.startsWith('/api/v1/auth/')) {
    headers['x-session-id'] = getSessionId();
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error', 'NETWORK_ERROR', 0);
  }

  if (res.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new Event('hcmc-auth-expired'));
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail || 'Unauthorized', data.detail || 'AUTH_TOKEN_EXPIRED', 401);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail || 'Request failed', data.detail || 'default', res.status);
  }

  return res.json();
}

const STORAGE_KEY = 'saigon-guide-local-data-v2';
const photo = (name) => `/images/${name}`;

export const PLACES = [
  // --- QUẬN 1 (15 ĐỊA ĐIỂM) ---
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
    place_id: 'p-bao-tang-my-thuat',
    place_name: 'Bảo tàng Mỹ thuật TP.HCM',
    category: 'sightseeing',
    description: 'Tòa dinh thự Pháp cổ tuyệt đẹp với hành lang gạch hoa kiều diễm, trưng bày hàng nghìn cổ vật quý.',
    address: '97A Phó Đức Chính, Phường Nguyễn Thái Bình, Quận 1',
    district: 'Quận 1',
    latitude: 10.7698,
    longitude: 106.6995,
    estimated_cost: 30000,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['08:00 - 17:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-buu-dien-tt',
    place_name: 'Bưu điện Trung tâm Sài Gòn',
    category: 'sightseeing',
    description: 'Kiệt tác kiến trúc thời Pháp thuộc của kiến trúc sư Gustave Eiffel với vòm trần nguy nga.',
    address: '02 Công xã Paris, Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7798,
    longitude: 106.6998,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['07:30 - 18:00'],
    suggested_duration: 45
  },
  {
    place_id: 'p-nha-tho-duc-ba',
    place_name: 'Nhà thờ Đức Bà Sài Gòn',
    category: 'sightseeing',
    description: 'Công trình kiến trúc Gothic & Roman cổ kính, kiệt tác gạch ngói Marseille giữa quảng trường Paris.',
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
    place_id: 'p-pho-di-bo-nguyen-hue',
    place_name: 'Phố đi bộ Nguyễn Huệ',
    category: 'sightseeing',
    description: 'Quảng trường đi bộ sầm uất ngắm nhạc nước lung linh, tòa nhà UBND thành phố và đường chân trời Bitexco.',
    address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7745,
    longitude: 106.7035,
    estimated_cost: 0,
    photo_url: photo('nguyen_hue_walking_street.jpeg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['Mở cửa cả ngày 24/7'],
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
    place_id: 'p-saigon-centre-mall',
    place_name: 'TTTM Saigon Centre / Takashimaya',
    category: 'shopping',
    description: 'Tổ hợp mua sắm, ẩm thực và cafe máy lạnh hiện đại bậc nhất trung tâm Sài Gòn.',
    address: '65 Lê Lợi, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7733,
    longitude: 106.7010,
    estimated_cost: 80000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['09:30 - 22:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-ben-bach-dang',
    place_name: 'Công viên Bến Bạch Đằng & Ga Tàu Thủy',
    category: 'sightseeing',
    description: 'Tuyến công viên ven sông thoáng đãng ngắm bến tàu Saigon Waterbus và tòa tháp tài chính.',
    address: 'Tôn Đức Thắng, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7738,
    longitude: 106.7067,
    estimated_cost: 15000,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['06:00 - 23:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-nha-hat-thanh-pho',
    place_name: 'Nhà hát Lớn Thành phố (Saigon Opera House)',
    category: 'sightseeing',
    description: 'Công trình kiến trúc Flamboyant Pháp cổ kính khánh thành năm 1900, điểm check-in lịch lãm.',
    address: '07 Công trường Lam Sơn, Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7766,
    longitude: 106.7032,
    estimated_cost: 0,
    photo_url: photo('independence-palace.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['Tham quan mặt tiền 24/7'],
    suggested_duration: 40
  },
  {
    place_id: 'p-cafe-saigon',
    place_name: 'Cà phê Sài Gòn xưa Tôn Thất Đạm',
    category: 'cafe',
    description: 'Không gian hoài niệm giữa chung cư cổ, nhâm nhi ly cà phê sữa đá đậm đà và ngắm nhìn dòng người qua lại.',
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
    place_id: 'p-banh-mi-viet',
    place_name: 'Bánh Mì Huỳnh Hoa & Ẩm thực Lê Thị Riêng',
    category: 'food',
    description: 'Ổ bánh mì đầy ắp pate béo ngậy, giăm bông và chả lụa nức tiếng, bữa sáng tràn đầy năng lượng.',
    address: '26 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1',
    district: 'Quận 1',
    latitude: 10.7752,
    longitude: 106.6925,
    estimated_cost: 68000,
    photo_url: photo('banh-mi.png'),
    editorial_score: 4.8,
    is_indoor: false,
    opening_hours: ['06:00 - 22:00'],
    suggested_duration: 40
  },
  {
    place_id: 'p-com-nieu-sg',
    place_name: 'Nhà hàng Cơm Niêu Sài Gòn',
    category: 'food',
    description: 'Ẩm thực truyền thống Việt Nam với niêu cơm đập độc đáo, cá kho tộ và canh cua rau đay chuẩn vị.',
    address: '27 Tú Xương / Nguyễn Du, Quận 1',
    district: 'Quận 1',
    latitude: 10.7765,
    longitude: 106.6980,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['10:00 - 22:00'],
    suggested_duration: 75
  },
  {
    place_id: 'p-quan-bui',
    place_name: 'Quán Bụi — Hương Vị Đồng Quê',
    category: 'food',
    description: 'Món ngon ba miền chuẩn vị gia đình Sài Gòn trong không gian Indochine ấm cúng.',
    address: '19 Ngô Văn Năm, Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7810,
    longitude: 106.7040,
    estimated_cost: 90000,
    photo_url: photo('pho.png'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['09:00 - 22:30'],
    suggested_duration: 70
  },
  {
    place_id: 'p-bep-me-in',
    place_name: 'Bếp Mẹ Ỉn — Bánh Xèo Michelin Bib Gourmand',
    category: 'food',
    description: 'Bánh xèo giòn rụm và các món ăn chơi đường phố Sài Gòn nổi tiếng đạt vinh danh Michelin Guide.',
    address: '136 Lê Thánh Tôn, Bến Thành, Quận 1',
    district: 'Quận 1',
    latitude: 10.7730,
    longitude: 106.6970,
    estimated_cost: 85000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['10:30 - 22:30'],
    suggested_duration: 65
  },
  {
    place_id: 'p-pho-le-q1',
    place_name: 'Phở Lệ Nguyễn Trãi',
    category: 'food',
    description: 'Tô phở bò tái nạm bò viên béo thơm vị miền Nam đậm đà, thương hiệu phở lâu đời hút khách.',
    address: '303-305 An Dương Vương / Nguyễn Trãi, Quận 1',
    district: 'Quận 1',
    latitude: 10.7602,
    longitude: 106.6780,
    estimated_cost: 90000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:00 - 01:00'],
    suggested_duration: 50
  },

  // --- QUẬN 3 (10 ĐỊA ĐIỂM) ---
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
    place_id: 'p-ho-con-rua',
    place_name: 'Hồ Con Rùa & Cà phê vỉa hè Quận 3',
    category: 'cafe',
    description: 'Vòng xoay lịch sử biểu tượng gắn liền với tuổi trẻ Sài Gòn, nơi ngồi bệt thưởng thức bánh tráng trộn và trà đào.',
    address: 'Vòng xoay Công trường Quốc Tế, Quận 3',
    district: 'Quận 3',
    latitude: 10.7827,
    longitude: 106.6958,
    estimated_cost: 35000,
    photo_url: photo('coffee.jpg'),
    editorial_score: 4.5,
    is_indoor: false,
    opening_hours: ['Mở cửa cả ngày 24/7'],
    suggested_duration: 50
  },
  {
    place_id: 'p-nha-tho-tan-dinh',
    place_name: 'Nhà thờ Tân Định (Nhà thờ Màu Hồng)',
    category: 'sightseeing',
    description: 'Tòa thánh đường màu hồng rực rỡ mang phong cách Gothic lãng mạn, điểm check-in hút khách bậc nhất Quận 3.',
    address: '289 Hai Bà Trưng, Phường 8, Quận 3',
    district: 'Quận 3',
    latitude: 10.7884,
    longitude: 106.6908,
    estimated_cost: 0,
    photo_url: photo('notre-dame.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['08:00 - 17:30'],
    suggested_duration: 50
  },
  {
    place_id: 'p-chua-vinh-nghiem',
    place_name: 'Chùa Vĩnh Nghiêm',
    category: 'sightseeing',
    description: 'Ngôi đại tự Phật giáo trang nghiêm với bảo tháp 7 tầng uy nghi bên kênh Nhiêu Lộc.',
    address: '339 Nam Kỳ Khởi Nghĩa, Phường 14, Quận 3',
    district: 'Quận 3',
    latitude: 10.7915,
    longitude: 106.6826,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['07:00 - 20:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-pho-hoa',
    place_name: 'Phở Hòa Pasteur',
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
    suggested_duration: 60
  },
  {
    place_id: 'p-banh-xeo-an-la-ghien',
    place_name: 'Bánh xèo Ăn Là Ghiền',
    category: 'food',
    description: 'Thưởng thức bánh xèo vỏ giòn rụm với nhân tôm thịt, củ hũ dừa và rổ rau rừng tươi xanh mướt mát.',
    address: '74 Sương Nguyệt Ánh, Phường Bến Thành, Quận 3',
    district: 'Quận 3',
    latitude: 10.7720,
    longitude: 106.6895,
    estimated_cost: 85000,
    photo_url: photo('pho.png'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['09:00 - 22:00'],
    suggested_duration: 70
  },
  {
    place_id: 'p-cafe-do-phu',
    place_name: 'Cà phê Đỗ Phủ — Hầm Biệt Động Sài Gòn',
    category: 'cafe',
    description: 'Quán cafe độc nhất vô nhị lưu giữ căn hầm bí mật lịch sử của lực lượng Biệt Động thành năm xưa.',
    address: '113A Đặng Dung, Phường Tân Định, Quận 3',
    district: 'Quận 3',
    latitude: 10.7930,
    longitude: 106.6885,
    estimated_cost: 50000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['07:00 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-cho-tan-dinh',
    place_name: 'Chợ Tân Định (Ẩm thực đêm & Vải vóc)',
    category: 'shopping',
    description: 'Khu chợ sầm uất với khu ẩm thực đêm nức tiếng món cháo ếch, xôi gà và súp cua trứng bắc thảo.',
    address: '336 Hai Bà Trưng, Phường Tân Định, Quận 3',
    district: 'Quận 3',
    latitude: 10.7895,
    longitude: 106.6895,
    estimated_cost: 70000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.4,
    is_indoor: true,
    opening_hours: ['06:00 - 23:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-bao-tang-phu-nu',
    place_name: 'Bảo tàng Phụ nữ Nam Bộ',
    category: 'sightseeing',
    description: 'Nơi tôn vinh nét đẹp và sự kiên cường của người phụ nữ Việt Nam qua các thời kỳ lịch sử.',
    address: '202 Võ Thị Sáu, Phường 7, Quận 3',
    district: 'Quận 3',
    latitude: 10.7835,
    longitude: 106.6865,
    estimated_cost: 30000,
    photo_url: photo('museum.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['07:30 - 17:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-lau-bo-khu-q3',
    place_name: 'Lẩu Bò Nhà Gỗ Sài Gòn',
    category: 'food',
    description: 'Nồi lẩu bò sục sôi ngập tràn nạm gân bò mềm thơm giữa không gian gỗ mộc mạc ấm cúng.',
    address: '162 Lý Chính Thắng, Phường 7, Quận 3',
    district: 'Quận 3',
    latitude: 10.7870,
    longitude: 106.6850,
    estimated_cost: 110000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['11:00 - 22:30'],
    suggested_duration: 80
  },

  // --- QUẬN 5 (CHỢ LỚN) (10 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-chua-ba-thien-hau',
    place_name: 'Chùa Bà Thiên Hậu (Miếu Tuệ Thành)',
    category: 'sightseeing',
    description: 'Một trong những ngôi chùa cổ nhất của người Hoa tại Chợ Lớn với nhang vòng khổng lồ và phù điêu gốm tinh xảo.',
    address: '710 Nguyễn Trãi, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7538,
    longitude: 106.6608,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['06:30 - 17:30'],
    suggested_duration: 60
  },
  {
    place_id: 'p-cho-binh-tay',
    place_name: 'Chợ Bình Tây (Chợ Lớn Mới)',
    category: 'shopping',
    description: 'Trung tâm đầu mối thương mại sầm uất với mái ngói chồng lớp kiểu Á Đông đặc trưng của thương gia Quách Đàm.',
    address: '57A Tháp Mười, Phường 2, Quận 5',
    district: 'Quận 5',
    latitude: 10.7485,
    longitude: 106.6515,
    estimated_cost: 80000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:00 - 18:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-pho-long-den',
    place_name: 'Phố Lồng Đèn Lương Nhữ Học',
    category: 'sightseeing',
    description: 'Con phố rực rỡ sắc màu truyền thống của người Tiều & Quảng Đông, lung linh nhất vào các mùa lễ hội.',
    address: 'Lương Nhữ Học, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7530,
    longitude: 106.6625,
    estimated_cost: 40000,
    photo_url: photo('nguyen_hue_walking_street.jpeg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['08:00 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-hao-si-phuong',
    place_name: 'Hẻm Hào Sĩ Phường',
    category: 'sightseeing',
    description: 'Khu chung cư trăm tuổi mang nét kiến trúc Hong Kong cổ kính, yên bình giữa phố Chợ Lớn tấp nập.',
    address: '206 Trần Hưng Đạo B, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7515,
    longitude: 106.6635,
    estimated_cost: 0,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.5,
    is_indoor: false,
    opening_hours: ['07:00 - 18:00'],
    suggested_duration: 45
  },
  {
    place_id: 'p-dimsum-tien-phat',
    place_name: 'Tiến Phát Điểm Tâm Hong Kong',
    category: 'food',
    description: 'Thưởng thức xửng há cảo tôm tươi, xíu mại và bánh bao kim sa chuẩn vị Quảng Đông buổi sáng.',
    address: '18 Ký Hòa, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7555,
    longitude: 106.6610,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['06:00 - 12:30'],
    suggested_duration: 65
  },
  {
    place_id: 'p-sui-cao-ha-ton-quyen',
    place_name: 'Sủi Cảo Hà Tôn Quyền',
    category: 'food',
    description: 'Con hẻm sủi cảo nức tiếng với những viên sủi cảo nhân tôm thịt tươi giòn sần sật trong nước dùng mực nướng thơm lừng.',
    address: '195 Hà Tôn Quyền, Phường 4, Quận 5',
    district: 'Quận 5',
    latitude: 10.7580,
    longitude: 106.6555,
    estimated_cost: 75000,
    photo_url: photo('pho.png'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['14:00 - 23:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-che-ha-ky',
    place_name: 'Chè Tàu Hà Ký',
    category: 'food',
    description: 'Quán chè người Hoa nổi tiếng hơn 30 năm với món chè mè đen, quy linh cao và hột gà trà thơm thanh mát.',
    address: '138 Châu Văn Liêm, Phường 11, Quận 5',
    district: 'Quận 5',
    latitude: 10.7525,
    longitude: 106.6575,
    estimated_cost: 40000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['10:00 - 22:30'],
    suggested_duration: 45
  },
  {
    place_id: 'p-cafe-vot-ba-lu',
    place_name: 'Cà phê vợt Ba Lù Chợ Lớn',
    category: 'cafe',
    description: 'Quán cafe rang xay bơ củi thủ công bằng vợt thiếc hơn 70 năm đậm đà bản sắc Chợ Lớn xưa.',
    address: '192 Phùng Hưng, Phường 14, Quận 5',
    district: 'Quận 5',
    latitude: 10.7540,
    longitude: 106.6560,
    estimated_cost: 30000,
    photo_url: photo('coffee.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['05:30 - 18:00'],
    suggested_duration: 50
  },
  {
    place_id: 'p-chua-ong-bon',
    place_name: 'Hội quán Nhị Phủ (Chùa Ông Bổn)',
    category: 'sightseeing',
    description: 'Di tích kiến trúc nghệ thuật cấp quốc gia với hệ thống cột gỗ lim và phù điêu gốm đắp nổi cầu kỳ.',
    address: '264 Hải Thượng Lãn Ông, Phường 14, Quận 5',
    district: 'Quận 5',
    latitude: 10.7495,
    longitude: 106.6550,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['07:00 - 17:30'],
    suggested_duration: 50
  },
  {
    place_id: 'p-pho-dong-y',
    place_name: 'Phố Đông Y Hải Thượng Lãn Ông',
    category: 'shopping',
    description: 'Dạo bước con phố thoang thoảng mùi thảo mộc thuốc Bắc đặc trưng cùng các tiệm thuốc hàng thế kỷ.',
    address: 'Hải Thượng Lãn Ông, Phường 10, Quận 5',
    district: 'Quận 5',
    latitude: 10.7510,
    longitude: 106.6580,
    estimated_cost: 50000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.5,
    is_indoor: false,
    opening_hours: ['08:00 - 18:00'],
    suggested_duration: 50
  },

  // --- BÌNH THẠNH (8 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-landmark-81',
    place_name: 'Tòa nhà Landmark 81 & Đài quan sát SkyView',
    category: 'sightseeing',
    description: 'Tòa tháp cao nhất Việt Nam, ngắm trọn vẹn toàn cảnh sông Sài Gòn và thành phố từ tầng 81.',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.7950,
    longitude: 106.7218,
    estimated_cost: 250000,
    photo_url: photo('independence-palace.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['09:30 - 22:00'],
    suggested_duration: 100
  },
  {
    place_id: 'p-cong-vien-central-park',
    place_name: 'Công viên Central Park ven sông Bình Thạnh',
    category: 'nature',
    description: 'Công viên 14 hecta xanh mướt ven sông Sài Gòn với thảm cỏ mát rượi, cầu đi bộ vòm ấn tượng.',
    address: 'Khu đô thị Vinhomes Central Park, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.7935,
    longitude: 106.7230,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['05:00 - 22:30'],
    suggested_duration: 75
  },
  {
    place_id: 'p-cho-ba-chieu',
    place_name: 'Chợ Bà Chiểu & Xôi Gà Bà Chiểu',
    category: 'food',
    description: 'Ghé khu chợ lâu đời nhất Bình Thạnh thưởng thức gói xôi gà xá xíu đậm sốt cay ngọt nức tiếng.',
    address: 'Bùi Hữu Nghĩa, Phường 1, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.8010,
    longitude: 106.6975,
    estimated_cost: 45000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['16:00 - 23:30'],
    suggested_duration: 60
  },
  {
    place_id: 'p-lang-ong-ba-chieu',
    place_name: 'Lăng Ông Bà Chiểu (Thượng Công Miếu)',
    category: 'sightseeing',
    description: 'Di tích lịch sử văn hóa tâm linh thờ Tả quân Lê Văn Duyệt với kiến trúc cung đình lăng tẩm trang nghiêm.',
    address: '01 Vũ Tùng, Phường 1, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.8018,
    longitude: 106.6965,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['07:00 - 17:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-kdl-van-thanh',
    place_name: 'Khu du lịch Văn Thánh',
    category: 'nature',
    description: 'Ốc đảo đồng quê mộc mạc với rặng tre, hồ sen xanh ngát giữa lòng đô thị náo nhiệt.',
    address: '48/10 Điện Biên Phủ, Phường 22, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.7980,
    longitude: 106.7160,
    estimated_cost: 50000,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.5,
    is_indoor: false,
    opening_hours: ['08:00 - 21:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-bo-ke-thanh-da',
    place_name: 'Bán đảo Thanh Đa & Vịt nướng chao',
    category: 'food',
    description: 'Bán đảo lộng gió bốn bề sông nước, nổi tiếng với món vịt nướng chao thơm lừng và cháo vịt ngọt ấm.',
    address: 'Khu Thanh Đa, Phường 27, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.8250,
    longitude: 106.7260,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['10:00 - 22:00'],
    suggested_duration: 75
  },
  {
    place_id: 'p-cafe-bo-song-bt',
    place_name: 'Chill Sky Lounge & Cafe Bờ Sông Bình Thạnh',
    category: 'cafe',
    description: 'Ngắm nhìn hoàng hôn rực rỡ buông xuống sông Sài Gòn trong không gian lộng gió thoáng đãng.',
    address: 'Bình Quới, Phường 28, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.8150,
    longitude: 106.7320,
    estimated_cost: 65000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['07:00 - 22:30'],
    suggested_duration: 60
  },
  {
    place_id: 'p-bun-nuoc-co-co',
    place_name: 'Bún nước tôm bò Cô Có',
    category: 'food',
    description: 'Đặc sản bún nước Phú Nhuận - Bình Thạnh cay nồng muối ớt với tôm quết và thịt bò tái tươi mềm.',
    address: 'Trần Kế Xương, Phường 7, Bình Thạnh',
    district: 'Bình Thạnh',
    latitude: 10.7995,
    longitude: 106.6910,
    estimated_cost: 55000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['11:00 - 20:00'],
    suggested_duration: 45
  },

  // --- QUẬN 4 (8 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-ben-nha-rong',
    place_name: 'Bến Nhà Rồng (Bảo tàng Hồ Chí Minh)',
    category: 'sightseeing',
    description: 'Di tích lịch sử nơi Bác Hồ ra đi tìm đường cứu nước năm 1911, soi bóng bên ngã ba sông Sài Gòn tuyệt đẹp.',
    address: '01 Nguyễn Tất Thành, Phường 12, Quận 4',
    district: 'Quận 4',
    latitude: 10.7682,
    longitude: 106.7068,
    estimated_cost: 30000,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['07:30 - 17:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-pho-oc-vinh-khanh',
    place_name: 'Phố Ốc Vĩnh Khánh',
    category: 'food',
    description: 'Thiên đường ốc Sài Gòn nhộn nhịp về đêm với hàng chục món ốc hương xào bơ tỏi, ốc mỡ xào me cay xé lưỡi.',
    address: 'Đường Vĩnh Khánh, Phường 8, Quận 4',
    district: 'Quận 4',
    latitude: 10.7615,
    longitude: 106.7005,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['15:00 - 23:30'],
    suggested_duration: 80
  },
  {
    place_id: 'p-cho-xom-chieu',
    place_name: 'Chợ Xóm Chiếu (Chợ 200 Ăn Vặt)',
    category: 'food',
    description: 'Thủ phủ món ngon đường phố Quận 4 với chuối nướng cốt dừa, hủ tiếu bò viên và phá lấu bò truyền thống.',
    address: 'Lê Quốc Hưng, Phường 12, Quận 4',
    district: 'Quận 4',
    latitude: 10.7635,
    longitude: 106.7040,
    estimated_cost: 50000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['06:00 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-pha-lau-di-nui',
    place_name: 'Phá Lấu Bò Dì Nủi',
    category: 'food',
    description: 'Chén phá lấu thơm ngậy nước cốt dừa ăn kèm ổ bánh mì nóng giòn và chén nước chấm tắc chua ngọt.',
    address: '243/30 Tôn Đản, Phường 15, Quận 4',
    district: 'Quận 4',
    latitude: 10.7585,
    longitude: 106.7050,
    estimated_cost: 35000,
    photo_url: photo('banh-mi.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['13:00 - 21:00'],
    suggested_duration: 45
  },
  {
    place_id: 'p-cau-mong',
    place_name: 'Cầu Mống (Cầu xanh lịch sử nối Q1 & Q4)',
    category: 'sightseeing',
    description: 'Cây cầu thép trăm tuổi do hãng Eiffel chế tác, điểm dạo mát ngắm hoàng hôn và sông Bến Nghé.',
    address: 'Bến Vân Đồn, Quận 4',
    district: 'Quận 4',
    latitude: 10.7690,
    longitude: 106.7045,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['Mở cửa 24/7'],
    suggested_duration: 40
  },
  {
    place_id: 'p-tau-saigon-princess',
    place_name: 'Du Thuyền Ngắm Cảnh Saigon Princess Q4',
    category: 'entertainment',
    description: 'Trải nghiệm du ngoạn ẩm thực lãng mạn trên du thuyền ngắm nhìn ánh đèn thành phố lung linh.',
    address: 'Cảng Sài Gòn, 05 Nguyễn Tất Thành, Quận 4',
    district: 'Quận 4',
    latitude: 10.7675,
    longitude: 106.7085,
    estimated_cost: 250000,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['18:00 - 21:30'],
    suggested_duration: 120
  },
  {
    place_id: 'p-banh-trang-ba-bac',
    place_name: 'Bánh tráng cuốn Bà Bắc Quận 4',
    category: 'food',
    description: 'Cuốn bánh tráng dẻo thơm với trứng cút, bơ béo và sốt chấm me chua ngọt độc quyền.',
    address: '40 Đường số 11, Phường 4, Quận 4',
    district: 'Quận 4',
    latitude: 10.7610,
    longitude: 106.6985,
    estimated_cost: 35000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['10:00 - 21:00'],
    suggested_duration: 40
  },
  {
    place_id: 'p-cafe-chung-cu-ton-that-thuyet',
    place_name: 'The Alley Cafe Bến Vân Đồn',
    category: 'cafe',
    description: 'Quán cafe view kênh râm mát nhìn sang trung tâm Quận 1 lung linh về đêm.',
    address: 'Bến Vân Đồn, Phường 1, Quận 4',
    district: 'Quận 4',
    latitude: 10.7620,
    longitude: 106.6940,
    estimated_cost: 50000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['07:30 - 22:30'],
    suggested_duration: 60
  },

  // --- PHÚ NHUẬN (8 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-com-tam-ba-ghien',
    place_name: 'Cơm Tấm Ba Ghiền Đặng Văn Ngữ',
    category: 'food',
    description: 'Quán cơm tấm sườn nướng than hoa to choán cả đĩa trứ danh Sài Gòn đạt chứng nhận Michelin Bib Gourmand.',
    address: '84 Đặng Văn Ngữ, Phường 10, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7925,
    longitude: 106.6710,
    estimated_cost: 55000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['07:00 - 21:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-pho-am-thuc-phan-xich-long',
    place_name: 'Con đường Ẩm thực Phan Xích Long',
    category: 'food',
    description: 'Tuyến phố ăn uống và cà phê sầm uất bậc nhất Phú Nhuận tập trung hàng trăm thương hiệu ẩm thực.',
    address: 'Đường Phan Xích Long, Phường 2, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7965,
    longitude: 106.6850,
    estimated_cost: 80000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['08:00 - 23:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-chua-giac-uyen',
    place_name: 'Chùa Giác Uyển bên Kênh Nhiêu Lộc',
    category: 'sightseeing',
    description: 'Ngôi chùa thanh tịnh cổ kính ven bờ kênh, điểm chiêm bái bình an giữa lòng thành phố.',
    address: 'Đường Trường Sa, Phường 13, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7940,
    longitude: 106.6780,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['07:00 - 19:30'],
    suggested_duration: 50
  },
  {
    place_id: 'p-cafe-bo-ke-pn',
    place_name: 'Cà phê Bờ Kè Hoàng Sa — Trường Sa',
    category: 'cafe',
    description: 'Thưởng thức ly trà trái cây nhiệt đới ngắm dòng nước kênh Nhiêu Lộc xanh mát dưới bóng cây râm mát.',
    address: 'Đường Hoàng Sa, Phường 7, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7910,
    longitude: 106.6830,
    estimated_cost: 45000,
    photo_url: photo('coffee.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['06:30 - 23:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-cong-vien-gia-dinh',
    place_name: 'Công viên Gia Định',
    category: 'nature',
    description: 'Lá phổi xanh rộng lớn với hàng nghìn cây cổ thụ rợp bóng mát, khu vui chơi ngoài trời lý tưởng.',
    address: 'Hoàng Minh Giám, Phường 3, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.8140,
    longitude: 106.6740,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['05:00 - 22:00'],
    suggested_duration: 70
  },
  {
    place_id: 'p-bo-ne-le-hong',
    place_name: 'Bò Né Lệ Hồng Phú Nhuận',
    category: 'food',
    description: 'Chảo bò né xèo xèo thơm ngậy pate và trứng ốp la lòng đào nóng hổi ăn kèm bánh mì giòn rụm.',
    address: '489/27 Huỳnh Văn Bánh, Phường 13, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7920,
    longitude: 106.6745,
    estimated_cost: 65000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['06:00 - 13:00, 16:00 - 21:00'],
    suggested_duration: 50
  },
  {
    place_id: 'p-nha-tho-phu-nhuan',
    place_name: 'Giáo xứ Phú Nhuận',
    category: 'sightseeing',
    description: 'Ngôi giáo đường cổ kính thanh bình với tháp chuông ngân vang giữa khu dân cư truyền thống.',
    address: '60 Huỳnh Văn Bánh, Phường 15, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.7955,
    longitude: 106.6770,
    estimated_cost: 0,
    photo_url: photo('notre-dame.jpg'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['07:00 - 18:00'],
    suggested_duration: 40
  },
  {
    place_id: 'p-banh-duc-nong-pn',
    place_name: 'Bánh Đúc Nóng Thích Quảng Đức',
    category: 'food',
    description: 'Tô bánh đúc dẻo quánh ngập sốt thịt băm mộc nhĩ và hành phi vàng giòn rụm hơn 20 năm truyền thống.',
    address: '116 Thích Quảng Đức, Phường 5, Phú Nhuận',
    district: 'Phú Nhuận',
    latitude: 10.8030,
    longitude: 106.6820,
    estimated_cost: 30000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['11:30 - 18:30'],
    suggested_duration: 40
  },

  // --- TP. THỦ ĐỨC (8 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-thao-dien-saigon-outcast',
    place_name: 'Khu nghệ thuật Thảo Điền & Saigon Outcast',
    category: 'entertainment',
    description: 'Tụ điểm sáng tạo quốc tế với leo núi nhân tạo, bia thủ công, tranh graffiti và các sự kiện âm nhạc indie.',
    address: '188/1 Nguyễn Văn Hưởng, Thảo Điền, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.8120,
    longitude: 106.7360,
    estimated_cost: 100000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['10:00 - 23:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-chua-buu-long',
    place_name: 'Chùa Bửu Long (Chùa Thái Lan)',
    category: 'sightseeing',
    description: 'Ngôi chùa có kiến trúc bảo tháp vàng rực lộng lẫy được tạp chí Mỹ bầu chọn vào top chùa đẹp nhất thế giới.',
    address: '81 Nguyễn Xiển, Phường Long Bình, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.8710,
    longitude: 106.8290,
    estimated_cost: 0,
    photo_url: photo('trip-temple.jpg'),
    editorial_score: 4.9,
    is_indoor: true,
    opening_hours: ['08:00 - 17:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-ga-metro-bason',
    place_name: 'Tuyến Metro số 1 Bến Thành — Suối Tiên',
    category: 'sightseeing',
    description: 'Trải nghiệm tuyến tàu điện ngầm hiện đại đầu tiên của TP.HCM đi qua sông Sài Gòn sang thành phố mới.',
    address: 'Ga Ba Son / Thảo Điền, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.8035,
    longitude: 106.7290,
    estimated_cost: 20000,
    photo_url: photo('independence-palace.jpg'),
    editorial_score: 4.8,
    is_indoor: true,
    opening_hours: ['05:30 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-cong-vien-bo-song-thu-duc',
    place_name: 'Công viên Bờ sông Sài Gòn Thủ Đức',
    category: 'nature',
    description: 'Không gian quảng trường ven sông rộng thoáng ngắm trọn vẹn đường chân trời Bitexco và Landmark 81.',
    address: 'Khu đô thị Thủ Thiêm, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.7720,
    longitude: 106.7110,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['Mở cửa 24/7'],
    suggested_duration: 75
  },
  {
    place_id: 'p-snow-town-saigon',
    place_name: 'Thị trấn Tuyết Snow Town Sài Gòn',
    category: 'entertainment',
    description: 'Khu trượt tuyết nhân tạo công nghệ Nhật Bản mát lạnh âm độ C giữa lòng vùng đất nhiệt đới.',
    address: '125 Đồng Văn Cống, Thạnh Mỹ Lợi, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.7830,
    longitude: 106.7580,
    estimated_cost: 160000,
    photo_url: photo('independence-palace-source.jpg'),
    editorial_score: 4.5,
    is_indoor: true,
    opening_hours: ['09:00 - 19:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-khu-do-thi-sala',
    place_name: 'Công viên Sala & Cầu ngắm cảnh hoa Sala',
    category: 'nature',
    description: 'Khu công viên cảnh quan xanh mát với đài hoa khổng lồ phát sáng lộng lẫy về đêm.',
    address: 'Đường Mai Chí Thọ, An Lợi Đông, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.7680,
    longitude: 106.7180,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['06:00 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-banh-cuon-tay-ho-td',
    place_name: 'Bánh Cuốn Tây Hồ Thủ Đức',
    category: 'food',
    description: 'Bánh cuốn tráng mỏng mềm mướt phủ đầy hành phi giòn tan và chả quế thơm lừng chuẩn vị Bắc.',
    address: 'Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.8520,
    longitude: 106.7640,
    estimated_cost: 45000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['06:30 - 21:30'],
    suggested_duration: 45
  },
  {
    place_id: 'p-cafe-view-landmark-td',
    place_name: 'Cafe Bến Thuyền Thảo Điền View Landmark',
    category: 'cafe',
    description: 'Thưởng thức trà chiều ngắm ca nô lướt sóng và tòa nhà Landmark 81 tráng lệ phản chiếu trên sông.',
    address: 'Nguyễn Văn Hưởng, Thảo Điền, TP. Thủ Đức',
    district: 'TP. Thủ Đức',
    latitude: 10.8060,
    longitude: 106.7320,
    estimated_cost: 75000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.7,
    is_indoor: false,
    opening_hours: ['07:00 - 22:30'],
    suggested_duration: 60
  },

  // --- QUẬN 7 (8 ĐỊA ĐIỂM) ---
  {
    place_id: 'p-cau-anh-sao',
    place_name: 'Cầu Ánh Sao & Hồ Bán Nguyệt',
    category: 'sightseeing',
    description: 'Cây cầu đi bộ uốn lượn rực rỡ với hệ thống đèn led phun nước đổi màu lung linh trên Hồ Bán Nguyệt.',
    address: 'Khu đô thị Phú Mỹ Hưng, Tân Phú, Quận 7',
    district: 'Quận 7',
    latitude: 10.7258,
    longitude: 106.7212,
    estimated_cost: 0,
    photo_url: photo('nguyen_hue_walking_street.jpeg'),
    editorial_score: 4.8,
    is_indoor: false,
    opening_hours: ['Mở đèn phun nước 18:30 - 22:00'],
    suggested_duration: 75
  },
  {
    place_id: 'p-crescent-mall',
    place_name: 'TTTM Crescent Mall Phú Mỹ Hưng',
    category: 'shopping',
    description: 'Trung tâm mua sắm và giải trí chuẩn quốc tế bên bờ hồ Bán Nguyệt với không gian rực rỡ máy lạnh.',
    address: '101 Tôn Dật Tiên, Tân Phú, Quận 7',
    district: 'Quận 7',
    latitude: 10.7275,
    longitude: 106.7225,
    estimated_cost: 85000,
    photo_url: photo('ben_thanh.jpeg'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['10:00 - 22:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-artinus-3d',
    place_name: 'Bảo tàng Tranh 3D Artinus',
    category: 'entertainment',
    description: 'Thế giới tranh vẽ 3D khổng lồ đa chiều sống động cho những bức ảnh check-in ảo giác kỳ thú.',
    address: 'Số 2-4 Đường số 9, KDC Him Lam, Tân Hưng, Quận 7',
    district: 'Quận 7',
    latitude: 10.7420,
    longitude: 106.6960,
    estimated_cost: 150000,
    photo_url: photo('museum.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['09:00 - 18:00'],
    suggested_duration: 90
  },
  {
    place_id: 'p-pho-han-quoc-tan-phong',
    place_name: 'Phố Ẩm thực Hàn Quốc Tân Phong',
    category: 'food',
    description: 'Thưởng thức thịt nướng than hoa, canh kim chi và mì lạnh chuẩn vị Seoul giữa khu phố Hàn lớn nhất Sài Gòn.',
    address: 'Khu Hưng Gia — Hưng Phước, Tân Phong, Quận 7',
    district: 'Quận 7',
    latitude: 10.7285,
    longitude: 106.7080,
    estimated_cost: 130000,
    photo_url: photo('pho.png'),
    editorial_score: 4.7,
    is_indoor: true,
    opening_hours: ['11:00 - 23:00'],
    suggested_duration: 80
  },
  {
    place_id: 'p-cong-vien-panorama',
    place_name: 'Công viên Bờ sông Panorama Phú Mỹ Hưng',
    category: 'nature',
    description: 'Khu công viên rợp bóng dừa nước thanh bình dọc sông Thầy Tiêu, điểm tản bộ thư thái đón gió mát.',
    address: 'Đường Trần Văn Trà, Tân Phong, Quận 7',
    district: 'Quận 7',
    latitude: 10.7210,
    longitude: 106.7150,
    estimated_cost: 0,
    photo_url: photo('saigon-river.jpg'),
    editorial_score: 4.6,
    is_indoor: false,
    opening_hours: ['05:00 - 22:00'],
    suggested_duration: 60
  },
  {
    place_id: 'p-com-nieu-d-one-q7',
    place_name: 'Cơm Niêu D-One Phú Mỹ Hưng',
    category: 'food',
    description: 'Cơm niêu cháy giòn thơm phức ăn cùng cá bống kho tiêu cay nồng và canh chua bông điên điển.',
    address: 'Nguyễn Đức Cảnh, Tân Phong, Quận 7',
    district: 'Quận 7',
    latitude: 10.7260,
    longitude: 106.7115,
    estimated_cost: 95000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['10:00 - 21:30'],
    suggested_duration: 70
  },
  {
    place_id: 'p-cafe-view-ho-ban-nguyet',
    place_name: 'The Coffee House View Hồ Bán Nguyệt',
    category: 'cafe',
    description: 'Thưởng thức ly trà đào cam sả thơm lừng với tầm nhìn bao quát toàn bộ Hồ Bán Nguyệt thơ mộng.',
    address: 'Tôn Dật Tiên, Tân Phú, Quận 7',
    district: 'Quận 7',
    latitude: 10.7270,
    longitude: 106.7205,
    estimated_cost: 55000,
    photo_url: photo('cafe.jpg'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['07:00 - 22:30'],
    suggested_duration: 60
  },
  {
    place_id: 'p-banh-beo-thanh-nga-q7',
    place_name: 'Bánh bèo chén Thanh Nga Quận 7',
    category: 'food',
    description: 'Khay bánh bèo tôm chấy chén nóng hổi rưới mỡ hành, bánh bột lọc nhân tôm thịt đậm đà miền Trung.',
    address: 'Lê Văn Lương, Tân Quy, Quận 7',
    district: 'Quận 7',
    latitude: 10.7410,
    longitude: 106.7040,
    estimated_cost: 45000,
    photo_url: photo('pho.png'),
    editorial_score: 4.6,
    is_indoor: true,
    opening_hours: ['11:00 - 21:00'],
    suggested_duration: 45
  }
];

// Sinh khung giờ và khối di chuyển chuẩn xác từ sáng đến tối
export function generateScheduleForDay(dayNumber, placeCount = 4, seed = 0, startLocation = '', transportMode = 'grab_bike') {
  const count = Math.min(6, Math.max(3, placeCount));

  // Lọc địa điểm ưu tiên theo quận người dùng đã chọn
  let eligiblePlaces = [...PLACES];
  if (startLocation) {
    const locLower = startLocation.toLowerCase();
    const matched = PLACES.filter((p) => locLower.includes(p.district.toLowerCase()));
    if (matched.length >= count) {
      eligiblePlaces = matched;
    } else if (matched.length > 0) {
      // Đặt các điểm của quận đó lên đầu
      eligiblePlaces = [...matched, ...PLACES.filter((p) => !locLower.includes(p.district.toLowerCase()))];
    }
  }
  
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
      { start: '17:30', end: '19:30', slot: '17:30 - 19:30', cat: 'entertainment', transitToNext: { min: 15, dist: 1.0, mode: 'walk', fare: 0 } }
    ]
  };

  const template = timeTemplates[count] || timeTemplates[4];
  const items = [];
  const stride = count; // Khắc phục lỗi trùng lặp điểm giữa các ngày liên tiếp

  for (let i = 0; i < count; i++) {
    const slotInfo = template[i];
    const placeIndex = (seed + (dayNumber - 1) * stride + i) % eligiblePlaces.length;
    let place = eligiblePlaces[placeIndex];

    // Đảm bảo bữa trưa luôn là ẩm thực, ưu tiên ẩm thực cùng quận đã chọn
    if (slotInfo.isLunch && place.category !== 'food') {
      const foodInDistrict = eligiblePlaces.find((p) => p.category === 'food');
      place = foodInDistrict || PLACES.find((p) => p.category === 'food') || place;
    }

    let nextMode = template[i - 1]?.transitToNext.mode || 'walk';
    let nextFare = template[i - 1]?.transitToNext.fare || 0;

    // Tôn trọng phương tiện người dùng đã chọn trong form khởi hành
    if (transportMode === 'grab_car' && nextMode === 'grab_bike') {
      nextMode = 'grab_car';
      nextFare = Math.max(35000, Math.round(nextFare * 1.6));
    } else if (transportMode === 'public' && nextMode === 'grab_bike') {
      nextMode = 'walk';
      nextFare = 0;
    }

    const transit = i > 0 ? {
      duration_min: template[i - 1].transitToNext.min,
      distance_km: template[i - 1].transitToNext.dist,
      mode: nextMode,
      estimated_fare_vnd: nextFare,
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

export function makeItinerary(days, placesPerDay = 4, seed = 0, startLocation = '', transportMode = 'grab_bike') {
  const items = [];
  for (let day = 1; day <= days; day += 1) {
    const dayStops = generateScheduleForDay(day, placesPerDay, seed, startLocation, transportMode);
    items.push(...dayStops);
  }
  return items;
}

export function budgetFor(trip, items) {
  const memberCount = Number(trip?.member_count) || (trip?.companion === 'solo' ? 1 : 4);
  const activitiesUnit = items.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
  const activitiesTotal = activitiesUnit * memberCount;
  
  const transitTotal = items.reduce((sum, item) => {
    const fare = Number(item.transit_info?.estimated_fare_vnd || 0);
    const mode = item.transit_info?.mode;
    if (mode === 'grab_bike') {
      // Mỗi người 1 xe GrabBike
      return sum + fare * memberCount;
    }
    // GrabCar hoặc bus dùng chung
    return sum + fare;
  }, 0) + (items.length * 5000);

  const total = activitiesTotal + transitTotal;
  const target = Number(trip?.budget || 0);
  return {
    total_budget: target,
    total_estimated: total,
    activities_cost: activitiesTotal,
    transit_cost: transitTotal,
    member_count: memberCount,
    per_person_estimated: Math.round(total / memberCount),
    percentage: target ? Math.round((total / target) * 100) : 0,
    health: total > target ? 'over_budget' : total > target * 0.85 ? 'near_budget' : 'under_budget'
  };
}

function makeTrip(id, title, days, budget, seed, cover, shared = false, placesPerDay = 4, memberCount = 4, companion = 'group', startLocation = 'Quận 1, TP. Hồ Chí Minh') {
  const trip = {
    id,
    title,
    days,
    budget,
    places_per_day: placesPerDay,
    companion,
    member_count: memberCount,
    status: 'completed',
    created_at: new Date(Date.now() - seed * 86400000).toISOString(),
    start_location: startLocation,
    preferences: ['food', 'culture'],
    cover_photo: photo(cover),
    cover_place_name: PLACES[seed % PLACES.length].place_name,
    is_shared: shared
  };
  const items = makeItinerary(days, placesPerDay, seed, startLocation);
  const summary = budgetFor(trip, items);
  trip.total_estimated = summary.total_estimated;
  trip.place_count = items.length;
  return { trip, items };
}

function initialState() {
  const records = [
    makeTrip('trip-1', 'Khám phá Sài Gòn 3 ngày', 3, 5000000, 0, 'trip-palace.jpg', false, 4, 4, 'group', 'Quận 1, TP. Hồ Chí Minh'),
    makeTrip('trip-2', 'Một ngày ở trung tâm', 1, 2000000, 1, 'trip-war-remnants.jpg', false, 4, 1, 'solo', 'Quận 1, TP. Hồ Chí Minh'),
    makeTrip('demo', 'Sài Gòn cùng bạn bè', 3, 6000000, 2, 'trip-palace-shared.jpg', true, 4, 4, 'group', 'Quận 1, TP. Hồ Chí Minh'),
    makeTrip('trip-4', 'Sài Gòn và Chợ Lớn', 3, 5000000, 7, 'trip-temple.jpg', false, 4, 4, 'group', 'Quận 5, TP. Hồ Chí Minh')
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

function cacheBackendTrip(trip, items) {
  if (!trip?.id) return null;
  const state = readState();
  const existing = state.trips?.[trip.id]?.trip || {};
  const cachedTrip = { ...existing, ...trip };
  state.trips = { ...state.trips, [trip.id]: { trip: cachedTrip, items: items || [] } };
  save(state);
  return { trip: cachedTrip, items: items || [] };
}

function cacheBackendItems(tripId, items, tripUpdates = {}) {
  const state = readState();
  const existing = state.trips?.[tripId]?.trip || { id: tripId };
  const trip = { ...existing, ...tripUpdates };
  state.trips = { ...state.trips, [tripId]: { trip, items } };
  save(state);
  return { items, budget_summary: budgetFor(trip, items) };
}

function getLocalTripData(tripId) {
  const entry = record(tripId);
  return {
    trip: entry.trip,
    itinerary_items: entry.items || [],
    budget_summary: summarize(entry.trip, entry.items || []),
  };
}

async function getBackendTrip(tripId) {
  if (!isBackendEnabled()) {
    return getLocalTripData(tripId);
  }
  try {
    const data = await request('GET', `/api/v1/trips/${tripId}`);
    cacheBackendTrip(data.trip, data.itinerary_items || []);
    return data;
  } catch (err) {
    if (err?.code === 'NETWORK_ERROR' && (!tripId || tripId === 'demo' || String(tripId).startsWith('demo'))) {
      return getLocalTripData(tripId || 'demo');
    }
    throw err;
  }
}

async function saveBackendItems(tripId, items) {
  if (!isBackendEnabled()) {
    const entry = record(tripId);
    const summary = summarize(entry.trip, items);
    return cacheBackendItems(tripId, items, {
      total_estimated: summary.total_estimated,
      place_count: items.length,
    });
  }
  const trip = await request('PUT', `/api/v1/trips/${tripId}`, { itinerary_items: items });
  return cacheBackendItems(tripId, items, trip);
}

async function updateBackendItem(tripId, dayNumber, orderIndex, updates) {
  if (!isBackendEnabled()) {
    const entry = record(tripId);
    const items = (entry.items || []).map((item) => {
      if (item.day_number !== Number(dayNumber) || item.order_index !== Number(orderIndex)) {
        return item;
      }
      const next = { ...item };
      if ('visited' in updates) next.visited = Boolean(updates.visited);
      if ('is_accepted' in updates) next.is_accepted = Boolean(updates.is_accepted);
      if ('photo_url' in updates) {
        if (updates.photo_url) next.checkin_photo = updates.photo_url;
        else delete next.checkin_photo;
      }
      if ('note' in updates) {
        if (updates.note) next.checkin_note = updates.note;
        else delete next.checkin_note;
      }
      return next;
    });
    return cacheBackendItems(tripId, items);
  }
  const result = await request(
    'PATCH',
    `/api/v1/trips/${tripId}/items/${dayNumber}/${orderIndex}`,
    updates
  );
  return cacheBackendItems(tripId, result.items || []);
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
  // =====================================================================
  // AUTH — FastAPI Backend (Khang) when VITE_USE_BACKEND=true, Mock Data when false
  // =====================================================================
  register: async ({ username, password } = {}) => {
    if (!isBackendEnabled()) {
      const cleanName = String(username || '').trim();
      if (cleanName.length < 3) {
        throw new ApiError('Tên đăng nhập cần tối thiểu 3 ký tự.', 'INVALID_USERNAME', 400);
      }
      const state = readState();
      const user = { id: `mock-user-${cleanName}`, username: cleanName, display_name: cleanName };
      state.user = user;
      save(state);
      return { token: `mock-jwt-${cleanName}`, user };
    }
    return request('POST', '/api/v1/auth/register', { username, password });
  },
  login: async ({ username, password } = {}) => {
    if (!isBackendEnabled()) {
      const cleanName = String(username || '').trim() || 'demo';
      const state = readState();
      const user = { id: `mock-user-${cleanName}`, username: cleanName, display_name: cleanName };
      state.user = user;
      save(state);
      return { token: `mock-jwt-${cleanName}`, user };
    }
    return request('POST', '/api/v1/auth/login', { username, password });
  },
  loginWithGoogle: async () => {
    throw new ApiError('Google Sign-In is not available', 'GOOGLE_NOT_CONFIGURED', 0);
  },
  getMe: async () => {
    if (!isBackendEnabled()) {
      const state = readState();
      const user = state.user || { id: 'mock-user-demo', username: 'demo', display_name: 'Demo Traveler' };
      return { user };
    }
    return request('GET', '/api/v1/auth/me');
  },
  changePassword: async () => ({ success: true }),
  deleteAccount: async (payload) => {
    if (!isBackendEnabled()) {
      const state = readState();
      state.user = null;
      save(state);
      return { deleted: true };
    }
    return request('DELETE', '/api/v1/auth/me', payload);
  },

  // =====================================================================
  // SETTINGS — local only (no backend endpoint needed)
  // =====================================================================
  getSettings: async () => ({ settings: readState().settings }),
  updateSettings: async (settings) => {
    const state = readState();
    state.settings = { ...state.settings, ...settings };
    save(state);
    return { settings: state.settings };
  },

  // =====================================================================
  // AI — FastAPI Gemini AI (Lam) when VITE_USE_BACKEND=true, Mock Data when false
  // =====================================================================
  suggestTripConcept: async (payload = {}) => {
    if (!isBackendEnabled()) {
      const days = Math.min(14, Math.max(1, Number(payload.days) || 2));
      const budget = Number(payload.budget) || 3000000;
      const districts = Array.isArray(payload.districts) && payload.districts.length
        ? payload.districts.slice(0, 3)
        : ['Quận 1', 'Quận 3'];
      const highlights = PLACES
        .filter((p) => districts.some((d) => p.district.toLowerCase().includes(d.replace(/^tp\.\s*/i, '').toLowerCase())))
        .slice(0, 3)
        .map((p) => p.place_name);
      return {
        summary: `Gợi ý lịch trình ${days} ngày tại TP.HCM khám phá ${districts.join(', ')} với ngân sách ${budget.toLocaleString('vi-VN')} VND.`,
        highlights: highlights.length ? highlights : PLACES.slice(0, 3).map((p) => p.place_name),
        recommended_districts: districts,
        route_overview: districts.join(' → '),
        confirmation_question: 'Bạn có đồng ý với concept lịch trình này không?',
      };
    }
    return postAiRequest('/ai/concept', payload);
  },
  generateAiItinerary: async (payload = {}) => {
    if (!isBackendEnabled()) {
      const days = Math.min(14, Math.max(1, Number(payload.days) || 2));
      const placesPerDay = Math.min(6, Math.max(3, Number(payload.places_per_day) || 4));
      const items = makeItinerary(
        days,
        placesPerDay,
        0,
        payload.start_location || 'Quận 1, TP. Hồ Chí Minh',
        payload.transport_mode || 'grab_bike'
      );
      return { itinerary_items: items };
    }
    return postAiRequest('/ai/generate', payload);
  },
  suggestPlaceSwaps: async (payload = {}) => {
    if (!isBackendEnabled()) {
      const current = payload.current_item || {};
      const alternatives = PLACES
        .filter((p) => p.place_name !== current.place_name)
        .sort((a, b) => Number(b.district === current.district) - Number(a.district === current.district))
        .slice(0, 3)
        .map((p) => ({
          ...p,
          opening_hours: ['08:00 - 21:00'],
          suggested_duration: 60,
          replacement_reason: `Cùng khu vực ${p.district}; chi phí dự kiến ${(p.estimated_cost || 0).toLocaleString('vi-VN')} VND.`,
        }));
      return { alternatives };
    }
    return postAiRequest('/ai/swap', payload);
  },

  // =====================================================================
  // PLACES — FastAPI Places (Đạt) when VITE_USE_BACKEND=true, Mock Data when false
  // =====================================================================
  searchPlaces: async ({ q = '', district = '', category = '', limit = 20 } = {}) => {
    if (!isBackendEnabled()) {
      const kw = String(q || '').trim().toLowerCase();
      const dist = String(district || '').replace(/^tp\.\s*/i, '').trim().toLowerCase();
      const cat = String(category || '').trim().toLowerCase();
      const results = PLACES.filter((p) => {
        if (kw && !p.place_name.toLowerCase().includes(kw) && !(p.description || '').toLowerCase().includes(kw)) return false;
        if (dist && !p.district.toLowerCase().includes(dist)) return false;
        if (cat && p.category.toLowerCase() !== cat) return false;
        return true;
      }).slice(0, Number(limit) || 20);
      return { total: results.length, results };
    }
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (district) params.set('district', district);
    if (category) params.set('category', category);
    if (limit) params.set('limit', String(limit));
    return request('GET', `/api/v1/places/search?${params.toString()}`);
  },
  getNearbyPlaces: async ({ lat, lng, radius_km = 2, limit = 10 } = {}) => {
    if (!isBackendEnabled()) {
      const results = PLACES.slice(0, Number(limit) || 10);
      return { total: results.length, results };
    }
    const params = new URLSearchParams({
      lat: String(lat ?? 10.7769),
      lng: String(lng ?? 106.7009),
      radius_km: String(radius_km),
      limit: String(limit),
    });
    return request('GET', `/api/v1/places/nearby?${params.toString()}`);
  },
  getPlaceDetail: async (placeId) => {
    if (!isBackendEnabled()) {
      const found = PLACES.find((p) => p.place_id === placeId || p.id === placeId) || PLACES[0];
      return found;
    }
    return request('GET', `/api/v1/places/${placeId}`);
  },

  // =====================================================================
  // TRIPS — FastAPI Trips (Khang) when VITE_USE_BACKEND=true, Mock Data when false
  // =====================================================================
  createTrip: async (payload = {}) => {
    const days = Math.min(14, Math.max(1, Number(payload.days) || 3));
    const placesPerDay = Math.min(6, Math.max(3, Number(payload.places_per_day) || 4));
    const seed = Math.floor(Math.random() * PLACES.length);
    const memberCount = Number(payload.member_count) || ((payload.companion || payload.group_type) === 'solo' ? 1 : 4);
    const companion = payload.companion || payload.group_type || (memberCount === 1 ? 'solo' : 'group');
    const specialNotes = Array.isArray(payload.special_notes)
      ? payload.special_notes.map((s) => String(s ?? '').trim()).filter(Boolean).join(', ') || null
      : typeof payload.special_notes === 'string'
        ? payload.special_notes.trim() || null
        : null;
    const items = Array.isArray(payload.itinerary_items) && payload.itinerary_items.length
      ? payload.itinerary_items
      : makeItinerary(days, placesPerDay, seed, payload.start_location || '', payload.transport_mode || 'grab_bike');

    const body = {
      title: payload.title || `Khám phá Sài Gòn ${days} ngày`,
      days,
      budget: Number(payload.budget) || 5000000,
      places_per_day: placesPerDay,
      companion,
      member_count: memberCount,
      transport_mode: payload.transport_mode || 'grab_bike',
      districts: payload.districts || [],
      pace: payload.pace || 'moderate',
      special_notes: specialNotes,
      start_time: payload.start_time || '08:00',
      end_time: payload.end_time || '21:30',
      start_location: payload.start_location || 'Quận 1, TP. Hồ Chí Minh',
      preferences: payload.preferences || ['food', 'culture'],
      itinerary_items: items,
    };

    if (!isBackendEnabled()) {
      const id = nextId();
      const summary = budgetFor({ budget: body.budget, days }, items);
      const mockTrip = {
        id,
        ...body,
        status: 'completed',
        created_at: new Date().toISOString(),
        cover_photo: items[0]?.photo_url || photo('trip-palace.jpg'),
        cover_place_name: items[0]?.place_name || 'Sài Gòn',
        total_estimated: summary.total_estimated,
        place_count: items.length,
        is_shared: false,
      };
      cacheBackendTrip(mockTrip, items);
      return mockTrip;
    }

    const trip = await request('POST', '/api/v1/trips/', body);
    cacheBackendTrip(trip, items);
    return trip;
  },

  listTrips: async () => {
    if (!isBackendEnabled()) {
      const state = readState();
      const trips = Object.values(state.trips || {}).map((entry) => entry.trip);
      return { trips };
    }
    return request('GET', '/api/v1/trips/me');
  },

  getTrip: getBackendTrip,

  updateTrip: async (id, updates) => {
    if (!isBackendEnabled()) {
      const entry = record(id);
      const updatedTrip = { ...entry.trip, ...updates };
      const nextItems = Array.isArray(updates?.itinerary_items) ? updates.itinerary_items : entry.items;
      cacheBackendTrip(updatedTrip, nextItems);
      return updatedTrip;
    }
    const trip = await request('PUT', `/api/v1/trips/${id}`, updates);
    const state = readState();
    if (state.trips?.[id]) {
      cacheBackendTrip(trip, state.trips[id].items || []);
    }
    return trip;
  },

  deleteTrip: async (id) => {
    if (!isBackendEnabled()) {
      const state = readState();
      if (state.trips?.[id]) {
        delete state.trips[id];
        save(state);
      }
      return { deleted: true };
    }
    return request('DELETE', `/api/v1/trips/${id}`);
  },

  duplicateTrip: async (id) => {
    if (!isBackendEnabled()) {
      const entry = record(id);
      const newId = nextId();
      const clonedTrip = {
        ...entry.trip,
        id: newId,
        title: `${entry.trip.title} (Bản sao)`,
        created_at: new Date().toISOString(),
        is_shared: false,
      };
      const clonedItems = (entry.items || []).map((it) => ({ ...it, visited: false }));
      cacheBackendTrip(clonedTrip, clonedItems);
      return { new_trip_id: newId, trip: clonedTrip };
    }
    return request('POST', `/api/v1/trips/${id}/clone`);
  },

  createShareLink: async (id) => {
    if (!isBackendEnabled()) {
      const state = readState();
      const entry = record(id);
      const token = `share-${id}`;
      entry.trip.is_shared = true;
      entry.trip.share_token = token;
      state.shares = { ...(state.shares || {}), [token]: id };
      save(state);
      return { share_token: token, share_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/${token}` };
    }
    return request('POST', `/api/v1/trips/${id}/share`);
  },

  revokeShareLink: async (id) => {
    if (!isBackendEnabled()) {
      const state = readState();
      const entry = record(id);
      const token = entry.trip.share_token || `share-${id}`;
      entry.trip.is_shared = false;
      delete entry.trip.share_token;
      if (state.shares) delete state.shares[token];
      save(state);
      return { revoked: true };
    }
    return request('DELETE', `/api/v1/trips/${id}/share`);
  },

  getSharedTrip: async (token) => {
    if (!isBackendEnabled()) {
      const state = readState();
      const tripId = state.shares?.[token] || (String(token).startsWith('share-') ? String(token).slice(6) : 'demo');
      return getLocalTripData(tripId);
    }
    return request('GET', `/api/v1/trips/shared/${token}`);
  },

  cloneSharedTrip: async (token) => {
    if (!isBackendEnabled()) {
      const shared = await api.getSharedTrip(token);
      return api.duplicateTrip(shared.trip.id);
    }
    return request('POST', `/api/v1/trips/shared/${token}/clone`);
  },

  // =====================================================================
  // LOCAL-ONLY operations (used by other team members' components)
  // =====================================================================
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
    const data = await getBackendTrip(tripId);
    const items = data.itinerary_items || [];

    const targetIdx = items.findIndex(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (targetIdx === -1) throw new ApiError('Trip item not found', 'TRIP_ITEM_NOT_FOUND', 404);

    const original = items[targetIdx];
    items[targetIdx] = {
      ...replacement,
      day_number: original.day_number,
      order_index: original.order_index,
      time_slot: original.time_slot,
      start_time: original.start_time,
      end_time: original.end_time,
      transit_info: original.transit_info,
      visited: original.visited || false,
      is_accepted: original.is_accepted || false
    };
    return saveBackendItems(tripId, items);
  },

  // Đánh dấu đã ghé thăm (Check-in Companion)
  toggleVisited: async (tripId, dayNumber, orderIndex) => {
    const data = await getBackendTrip(tripId);
    const target = (data.itinerary_items || []).find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (!target) throw new ApiError('Trip item not found', 'TRIP_ITEM_NOT_FOUND', 404);
    return updateBackendItem(tripId, dayNumber, orderIndex, { visited: !target.visited });
  },

  // Chốt / Chấp nhận địa điểm trong lịch trình (Accept stop)
  toggleAcceptPlace: async (tripId, dayNumber, orderIndex) => {
    const data = await getBackendTrip(tripId);
    const target = (data.itinerary_items || []).find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (!target) throw new ApiError('Trip item not found', 'TRIP_ITEM_NOT_FOUND', 404);
    return updateBackendItem(tripId, dayNumber, orderIndex, { is_accepted: !target.is_accepted });
  },

  // Lưu ảnh và ghi chú check-in thực tế
  saveCheckin: async (tripId, dayNumber, orderIndex, { photoUrl, note } = {}) => {
    const data = await getBackendTrip(tripId);
    const target = (data.itinerary_items || []).find(
      (it) => it.day_number === Number(dayNumber) && it.order_index === Number(orderIndex)
    );
    if (!target) throw new ApiError('Trip item not found', 'TRIP_ITEM_NOT_FOUND', 404);
    return updateBackendItem(tripId, dayNumber, orderIndex, {
      visited: true,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      ...(note ? { note } : {})
    });
  },

  // Áp dụng Kịch bản Trời mưa (Rain Mode) cho 1 ngày
  applyRainMode: async (tripId, dayNumber, enableRain) => {
    const data = await getBackendTrip(tripId);
    const trip = data.trip;
    let items = data.itinerary_items || [];

    items = items.map((item) => {
      if (item.day_number !== Number(dayNumber)) return item;

      if (enableRain) {
        let updated = { ...item };
        // Đổi transit sang xe ô tô GrabCar có mái che
        if (updated.transit_info) {
          updated.transit_info = {
            ...updated.transit_info,
            mode: 'grab_car',
            is_rain_mode: true,
            estimated_fare_vnd: Math.max(35000, Math.round((updated.transit_info.estimated_fare_vnd || 18000) * 1.5))
          };
        }
        return updated;
      } else {
        if (item.transit_info && item.transit_info.is_rain_mode) {
          return {
            ...item,
            transit_info: {
              ...item.transit_info,
              mode: trip.transport_mode || 'grab_bike',
              is_rain_mode: false,
              estimated_fare_vnd: Math.round(item.transit_info.estimated_fare_vnd / 1.5)
            }
          };
        }
      }
      return item;
    });

    return saveBackendItems(tripId, items);
  },

  // Áp dụng Kịch bản Giờ cao điểm (Rush-Hour Mode) cho 1 ngày
  applyTrafficMode: async (tripId, dayNumber, enableTraffic) => {
    const data = await getBackendTrip(tripId);
    let items = data.itinerary_items || [];

    items = items.map((item) => {
      if (item.day_number !== Number(dayNumber)) return item;

      if (enableTraffic && item.transit_info && !item.transit_info.is_rush_hour) {
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
      if (!enableTraffic && item.transit_info?.is_rush_hour) {
        return {
          ...item,
          transit_info: {
            ...item.transit_info,
            duration_min: Math.max(0, item.transit_info.duration_min - 20),
            is_rush_hour: false
          }
        };
      }
      return item;
    });

    return saveBackendItems(tripId, items);
  },

  // Tinh chỉnh AI: Tối ưu tiết kiệm ngân sách 20% (Hoán đổi quán đặc sản bình dân thật sự)
  optimizeBudget: async (tripId) => {
    const data = await getBackendTrip(tripId);
    const items = data.itinerary_items || [];

    // Tìm điểm ăn uống có chi phí cao nhất để đổi sang quán đặc sản Michelin bình dân
    const expensiveFood = items.find((it) => it.estimated_cost >= 80000 && it.category === 'food') || items[2];
    if (expensiveFood) {
      expensiveFood.place_id = 'p-com-tam-ba-ghien';
      expensiveFood.place_name = 'Cơm Tấm Ba Ghiền';
      expensiveFood.estimated_cost = 55000;
      expensiveFood.description = 'Quán cơm tấm sườn nướng than hoa trứ danh Sài Gòn đạt chứng nhận Michelin Bib Gourmand giá bình dân.';
      expensiveFood.address = '84 Đặng Văn Ngữ, Phường 10, Phú Nhuận';
      expensiveFood.district = 'Phú Nhuận';
    }

    return saveBackendItems(tripId, items);
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

  listPhotos: async (limit = 20) => {
    const parsed = Number(limit);
    const max = Number.isFinite(parsed) ? Math.max(0, parsed) : 20;
    return {
      photos: selectMarqueePhotos(PLACES).slice(0, max)
    };
  }
};

export function assetUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/v1/')) return `${API_ORIGIN}${value}`;
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
