// Curated Starter Trips for Ho Chi Minh City
// Handcrafted by local travel experts for instant 1-click zero-token onboarding.

import { api } from './api.js';

const photo = (name) => `/images/${name}`;

export const CURATED_TRIPS = [
  {
    id: 'curated-street-food',
    title: '24h Càn Quét Ẩm Thực Đường Phố Sài Gòn',
    tag: 'Ẩm thực đường phố',
    tagColor: 'bg-orange-50 text-orange-700 border-orange-200',
    days: 1,
    budget: 550000,
    districts: 'Quận 1, 3, 4, Phú Nhuận',
    cover_photo: photo('pho.png'),
    description: 'Trải nghiệm trọn vẹn văn hóa ăn uống vỉa hè Sài Gòn: từ bát phở sáng thơm phức, ly cafe vợt 60 năm, đĩa cơm tấm sườn nướng đến đại tiệc ốc đêm nhộn nhịp.',
    highlights: ['Phở Hòa Pasteur', 'Cà phê Vợt Phan Đình Phùng', 'Cơm tấm Ba Ghiền', 'Bánh mì Huỳnh Hoa', 'Ốc Vĩnh Khánh Q4'],
    items: [
      {
        day_number: 1,
        order_index: 1,
        time_slot: '07:30',
        place_name: 'Cà phê Vợt Phan Đình Phùng',
        category: 'cafe',
        address: '330 Phan Đình Phùng, Phú Nhuận',
        estimated_cost: 25000,
        is_indoor: false,
        photo_url: photo('cafe.jpg'),
        description: 'Bắt đầu ngày mới với ly cà phê vợt nóng hổi mở cửa xuyên suốt 60 năm qua.'
      },
      {
        day_number: 1,
        order_index: 2,
        time_slot: '08:45',
        place_name: 'Phở Hòa Pasteur',
        category: 'food',
        address: '260C Pasteur, Phường 8, Quận 3',
        estimated_cost: 95000,
        is_indoor: true,
        photo_url: photo('pho.png'),
        description: 'Tô phở tái gầu nước trong ngọt thanh đậm chất Sài Gòn xưa.'
      },
      {
        day_number: 1,
        order_index: 3,
        time_slot: '12:30',
        place_name: 'Cơm tấm Ba Ghiền',
        category: 'food',
        address: '84 Đặng Văn Ngữ, Phú Nhuận',
        estimated_cost: 90000,
        is_indoor: true,
        photo_url: photo('pho.png'),
        description: 'Đĩa cơm tấm sườn nướng khổng lồ thơm lừng nức tiếng đạt Michelin Bib Gourmand.'
      },
      {
        day_number: 1,
        order_index: 4,
        time_slot: '16:00',
        place_name: 'Bánh mì Huỳnh Hoa',
        category: 'food',
        address: '26 Lê Thị Riêng, Quận 1',
        estimated_cost: 68000,
        is_indoor: true,
        photo_url: photo('banh-mi.png'),
        description: 'Ổ bánh mì chả lụa pate dày cộp trứ danh để nạp năng lượng buổi chiều.'
      },
      {
        day_number: 1,
        order_index: 5,
        time_slot: '19:00',
        place_name: 'Phố ẩm thực Ốc Vĩnh Khánh',
        category: 'food',
        address: 'Đường Vĩnh Khánh, Quận 4',
        estimated_cost: 180000,
        is_indoor: false,
        photo_url: photo('pho.png'),
        description: 'Ăn tối hải sản và các món ốc móng tay xào rau muống, sò huyết nướng mọi bên phố ẩm thực sầm uất.'
      }
    ]
  },
  {
    id: 'curated-cho-lon',
    title: 'Dấu Ấn Di Sản & Văn Hóa Chợ Lớn (Quận 5)',
    tag: 'Di sản & Văn hóa Hoa',
    tagColor: 'bg-red-50 text-red-700 border-red-200',
    days: 1,
    budget: 650000,
    districts: 'Quận 5, Quận 6',
    cover_photo: photo('trip-temple.jpg'),
    description: 'Lạc bước vào không gian cổ kính của cộng đồng người Hoa Sài Gòn với kiến trúc chùa miếu rực rỡ, hương trầm thơm ngát và hương vị dimsum gia truyền.',
    highlights: ['Dimsum Tiến Phát', 'Chùa Bà Thiên Hậu', 'Chợ Bình Tây (Chợ Lớn)', 'Phố Đông y Hải Thượng Lãn Ông'],
    items: [
      {
        day_number: 1,
        order_index: 1,
        time_slot: '08:00',
        place_name: 'Dimsum Tiến Phát',
        category: 'food',
        address: '18 Ký Hòa, Phường 11, Quận 5',
        estimated_cost: 140000,
        is_indoor: true,
        photo_url: photo('banh-mi.png'),
        description: 'Thưởng thức bữa sáng điểm tâm Hong Kong với há cảo tôm tươi, bánh bao kim sa và trà nóng.'
      },
      {
        day_number: 1,
        order_index: 2,
        time_slot: '09:30',
        place_name: 'Chùa Bà Thiên Hậu',
        category: 'sightseeing',
        address: '710 Nguyễn Trãi, Phường 11, Quận 5',
        estimated_cost: 0,
        is_indoor: true,
        photo_url: photo('trip-temple.jpg'),
        description: 'Viếng ngôi chùa cổ linh thiêng bậc nhất Chợ Lớn, chiêm ngưỡng kiến trúc điêu khắc gốm sứ tinh xảo.'
      },
      {
        day_number: 1,
        order_index: 3,
        time_slot: '11:00',
        place_name: 'Phố Đông y Hải Thượng Lãn Ông',
        category: 'sightseeing',
        address: 'Đường Hải Thượng Lãn Ông, Quận 5',
        estimated_cost: 0,
        is_indoor: false,
        photo_url: photo('trip-temple.jpg'),
        description: 'Tản bộ ngửi mùi thơm thảo dược thuốc Bắc đặc trưng trong những dãy nhà cổ kính thời Pháp thuộc.'
      },
      {
        day_number: 1,
        order_index: 4,
        time_slot: '14:00',
        place_name: 'Chợ Bình Tây (Chợ Lớn)',
        category: 'shopping',
        address: '57A Tháp Mười, Phường 2, Quận 6',
        estimated_cost: 60000,
        is_indoor: true,
        photo_url: photo('ben_thanh.jpeg'),
        description: 'Khu chợ sỉ lịch sử bề thế do thương nhân Quách Đàm xây dựng với tháp chuông trung tâm.'
      }
    ]
  },
  {
    id: 'curated-couple-weekend',
    title: 'Cuối Tuần Lãng Mạn Cho Cặp Đôi Sài Gòn',
    tag: 'Cặp đôi · Chill & Sống ảo',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    days: 2,
    budget: 2400000,
    districts: 'Quận 1, Bình Thạnh',
    cover_photo: photo('saigon-river.jpg'),
    description: 'Lịch trình 2 ngày ngọt ngào dành riêng cho hai người: du ngoạn sông Sài Gòn, ngắm tranh bảo tàng mỹ thuật, ngắm hoàng hôn và dùng bữa trên cao.',
    highlights: ['Saigon Waterbus Bạch Đằng', 'Bảo tàng Mỹ thuật TP.HCM', 'Cà phê Chung cư 42 Nguyễn Huệ', 'Landmark 81'],
    items: [
      {
        day_number: 1,
        order_index: 1,
        time_slot: '09:00',
        place_name: 'Bảo tàng Mỹ thuật TP.HCM',
        category: 'sightseeing',
        address: '97A Phó Đức Chính, Quận 1',
        estimated_cost: 30000,
        is_indoor: true,
        photo_url: photo('trip-palace.jpg'),
        description: 'Không gian biệt thự cổ với hành lang lãng mạn, cầu thang xoắn ốc tuyệt đẹp để chụp ảnh đôi.'
      },
      {
        day_number: 1,
        order_index: 2,
        time_slot: '14:30',
        place_name: 'Cà phê Chung cư 42 Nguyễn Huệ',
        category: 'cafe',
        address: '42 Nguyễn Huệ, Quận 1',
        estimated_cost: 85000,
        is_indoor: true,
        photo_url: photo('cafe.jpg'),
        description: 'Ngồi ban công ngắm nhìn dòng người nhộn nhịp bên dưới phố đi bộ trung tâm.'
      },
      {
        day_number: 1,
        order_index: 3,
        time_slot: '17:00',
        place_name: 'Bến Bạch Đằng & Saigon Waterbus',
        category: 'nature',
        address: 'Tôn Đức Thắng, Quận 1',
        estimated_cost: 30000,
        is_indoor: false,
        photo_url: photo('saigon-river.jpg'),
        description: 'Chuyến tàu thủy ngắm gió sông chiều và hoàng hôn buông xuống cầu Ba Son.'
      },
      {
        day_number: 2,
        order_index: 1,
        time_slot: '10:00',
        place_name: 'Dinh Độc Lập',
        category: 'sightseeing',
        address: '135 Nam Kỳ Khởi Nghĩa, Quận 1',
        estimated_cost: 65000,
        is_indoor: true,
        photo_url: photo('independence-palace.jpg'),
        description: 'Dạo bước dưới rặng cây cổ thụ xanh mát và khám phá kiến trúc dinh thự tráng lệ.'
      },
      {
        day_number: 2,
        order_index: 2,
        time_slot: '17:00',
        place_name: 'Landmark 81 & Công viên ven sông',
        category: 'entertainment',
        address: '720A Điện Biên Phủ, Bình Thạnh',
        estimated_cost: 150000,
        is_indoor: true,
        photo_url: photo('saigon-river.jpg'),
        description: 'Ngắm nhìn toàn cảnh thành phố lung linh ánh đèn và tận hưởng bữa tối ấm cúng.'
      }
    ]
  },
  {
    id: 'curated-family-trip',
    title: 'Khám Phá Sài Gòn Cùng Gia Đình Có Bé Nhỏ',
    tag: 'Gia đình · Tiện nghi & Mát mẻ',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    days: 3,
    budget: 3800000,
    districts: 'Quận 1, Quận 3',
    cover_photo: photo('independence-palace.jpg'),
    description: 'Lịch trình thong thả, an toàn và bổ ích cho cả gia đình: tham quan động thực vật, tìm hiểu lịch sử và dạo chơi các trung tâm thương mại mát mẻ.',
    highlights: ['Thảo Cầm Viên Sài Gòn', 'Bưu điện Trung tâm', 'Dinh Độc Lập', 'Chợ Bến Thành'],
    items: [
      {
        day_number: 1,
        order_index: 1,
        time_slot: '08:30',
        place_name: 'Thảo Cầm Viên Sài Gòn',
        category: 'nature',
        address: '02 Nguyễn Bỉnh Khiêm, Quận 1',
        estimated_cost: 60000,
        is_indoor: false,
        photo_url: photo('saigon-river.jpg'),
        description: 'Bé vui chơi ngắm nhìn hươu cao cổ, voi và tận hưởng bóng mát cây xanh.'
      },
      {
        day_number: 1,
        order_index: 2,
        time_slot: '12:00',
        place_name: 'Phở Hòa Pasteur',
        category: 'food',
        address: '260C Pasteur, Quận 3',
        estimated_cost: 95000,
        is_indoor: true,
        photo_url: photo('pho.png'),
        description: 'Bữa trưa dinh dưỡng dễ ăn cho cả nhà trong không gian phòng lạnh sạch sẽ.'
      },
      {
        day_number: 2,
        order_index: 1,
        time_slot: '09:30',
        place_name: 'Dinh Độc Lập',
        category: 'sightseeing',
        address: '135 Nam Kỳ Khởi Nghĩa, Quận 1',
        estimated_cost: 65000,
        is_indoor: true,
        photo_url: photo('independence-palace.jpg'),
        description: 'Bài học lịch sử trực quan với bãi cỏ rộng rãi và xe tăng biểu tượng.'
      },
      {
        day_number: 2,
        order_index: 2,
        time_slot: '15:00',
        place_name: 'Bưu điện Trung tâm Sài Gòn',
        category: 'sightseeing',
        address: '02 Công xã Paris, Quận 1',
        estimated_cost: 0,
        is_indoor: true,
        photo_url: photo('notre-dame.jpg'),
        description: 'Gia đình cùng viết bưu thiếp gửi làm kỷ niệm chuyến đi Sài Gòn.'
      },
      {
        day_number: 3,
        order_index: 1,
        time_slot: '10:00',
        place_name: 'Chợ Bến Thành',
        category: 'shopping',
        address: 'Lê Lợi, Quận 1',
        estimated_cost: 100000,
        is_indoor: true,
        photo_url: photo('ben_thanh.jpeg'),
        description: 'Mua sắm đặc sản mứt gừng, cà phê hạt và quà lưu niệm thủ công mỹ nghệ.'
      }
    ]
  }
];

export async function useCuratedTrip(curatedId) {
  const curated = CURATED_TRIPS.find((t) => t.id === curatedId);
  if (!curated) return null;

  const trip = await api.createTrip({
    start_location: curated.districts.split(',')[0].trim() + ', TP. Hồ Chí Minh',
    days: curated.days,
    budget: curated.budget,
    preferences: ['food', 'culture'],
    source: 'clone'
  });

  // Gán nội dung các điểm đã biên tập chuẩn
  await api.updateTrip(trip.id, {
    title: curated.title,
    cover_photo: curated.cover_photo,
    cover_place_name: curated.highlights[0]
  });

  // Cập nhật các điểm vào localStorage
  try {
    const raw = localStorage.getItem('saigon-guide-local-data-v1');
    if (raw) {
      const state = JSON.parse(raw);
      if (state.trips[trip.id]) {
        state.trips[trip.id].items = curated.items.map((item, idx) => ({
          ...item,
          place_id: `curated-item-${idx}`
        }));
        localStorage.setItem('saigon-guide-local-data-v1', JSON.stringify(state));
      }
    }
  } catch (err) {
    console.error('Error seeding curated trip items:', err);
  }

  return trip.id;
}
