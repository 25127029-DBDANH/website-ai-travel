// Local Catalog & Heuristic Recommendation Engine for Travel AI TP.HCM
// Provides zero-token place recommendations, swap alternatives, rain mode, and budget optimization.

const photo = (name) => `/images/${name}`;

export const PLACES_CATALOG = [
  {
    place_id: 'dinh-doc-lap',
    place_name: 'Dinh Độc Lập',
    category: 'sightseeing',
    sub_category: 'heritage',
    district: 'Quận 1',
    address: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1',
    description: 'Di tích lịch sử quốc gia đặc biệt, biểu tượng kiến trúc giữa trung tâm Sài Gòn.',
    latitude: 10.777,
    longitude: 106.6953,
    estimated_cost: 65000,
    time_slot: '09:00',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.8,
    editorial_score: 4.8,
    photo_url: photo('independence-palace.jpg')
  },
  {
    place_id: 'bao-tang-chung-tich',
    place_name: 'Bảo tàng Chứng tích Chiến tranh',
    category: 'sightseeing',
    sub_category: 'museum',
    district: 'Quận 3',
    address: '28 Võ Văn Tần, Phường 6, Quận 3',
    description: 'Bảo tàng tư liệu lịch sử nổi tiếng thu hút du khách quốc tế hàng đầu tại TP.HCM.',
    latitude: 10.7794,
    longitude: 106.692,
    estimated_cost: 40000,
    time_slot: '10:30',
    is_indoor: true,
    suitable_for: ['solo', 'friends', 'family'],
    rating: 4.7,
    editorial_score: 4.7,
    photo_url: photo('trip-war-remnants.jpg')
  },
  {
    place_id: 'bao-tang-my-thuat',
    place_name: 'Bảo tàng Mỹ thuật TP.HCM',
    category: 'sightseeing',
    sub_category: 'museum',
    district: 'Quận 1',
    address: '97A Phó Đức Chính, Phường Nguyễn Thái Bình, Quận 1',
    description: 'Tòa nhà kiến trúc Pháp - Hoa tuyệt đẹp, không gian triển lãm nghệ thuật và chụp ảnh sống ảo.',
    latitude: 10.7699,
    longitude: 106.6993,
    estimated_cost: 30000,
    time_slot: '14:00',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends'],
    rating: 4.6,
    editorial_score: 4.7,
    photo_url: photo('trip-palace.jpg')
  },
  {
    place_id: 'buu-dien-trung-tam',
    place_name: 'Bưu điện Trung tâm Sài Gòn',
    category: 'sightseeing',
    sub_category: 'heritage',
    district: 'Quận 1',
    address: '02 Công xã Paris, Bến Nghé, Quận 1',
    description: 'Công trình kiến trúc cổ kính hơn 130 năm tuổi với mái vòm tráng lệ và phòng bưu điện xưa.',
    latitude: 10.7799,
    longitude: 106.6999,
    estimated_cost: 0,
    time_slot: '10:00',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.7,
    editorial_score: 4.6,
    photo_url: photo('notre-dame.jpg')
  },
  {
    place_id: 'nha-tho-duc-ba',
    place_name: 'Nhà thờ Đức Bà Sài Gòn',
    category: 'sightseeing',
    sub_category: 'heritage',
    district: 'Quận 1',
    address: '01 Công trường Công xã Paris, Bến Nghé, Quận 1',
    description: 'Biểu tượng văn hóa kiến trúc tôn giáo tại quảng trường trung tâm thành phố.',
    latitude: 10.7798,
    longitude: 106.699,
    estimated_cost: 0,
    time_slot: '11:00',
    is_indoor: false,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.7,
    editorial_score: 4.7,
    photo_url: photo('notre-dame.jpg')
  },
  {
    place_id: 'chua-ba-thien-hau',
    place_name: 'Chùa Bà Thiên Hậu',
    category: 'sightseeing',
    sub_category: 'temple',
    district: 'Quận 5',
    address: '710 Nguyễn Trãi, Phường 11, Quận 5',
    description: 'Ngôi chùa cổ kính linh thiêng của cộng đồng người Hoa tại khu Chợ Lớn với hương vòng độc đáo.',
    latitude: 10.754,
    longitude: 106.666,
    estimated_cost: 0,
    time_slot: '09:30',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('trip-temple.jpg')
  },
  {
    place_id: 'pho-hoa-pasteur',
    place_name: 'Phở Hòa Pasteur',
    category: 'food',
    sub_category: 'traditional',
    district: 'Quận 3',
    address: '260C Pasteur, Phường 8, Quận 3',
    description: 'Quán phở truyền thống danh tiếng hàng chục năm với nước dùng thanh ngọt chuẩn vị Sài Gòn.',
    latitude: 10.776,
    longitude: 106.69,
    estimated_cost: 95000,
    time_slot: '12:00',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('pho.png')
  },
  {
    place_id: 'banh-mi-huynh-hoa',
    place_name: 'Bánh mì Huỳnh Hoa',
    category: 'food',
    sub_category: 'street_food',
    district: 'Quận 1',
    address: '26 Lê Thị Riêng, Phường Phạm Ngũ Lão, Quận 1',
    description: 'Ổ bánh mì "đầy ắp thịt chả" trứ danh nhất Sài Gòn, đậm đà béo ngậy với pate gia truyền.',
    latitude: 10.7712,
    longitude: 106.6923,
    estimated_cost: 68000,
    time_slot: '17:30',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends'],
    rating: 4.5,
    editorial_score: 4.5,
    photo_url: photo('banh-mi.png')
  },
  {
    place_id: 'com-tam-ba-ghien',
    place_name: 'Cơm tấm Ba Ghiền',
    category: 'food',
    sub_category: 'traditional',
    district: 'Phú Nhuận',
    address: '84 Đặng Văn Ngữ, Phường 10, Phú Nhuận',
    description: 'Miếng sườn nướng khổng lồ thơm nức mũi, quán cơm tấm Michelin Bib Gourmand tại Sài Gòn.',
    latitude: 10.7925,
    longitude: 106.6719,
    estimated_cost: 90000,
    time_slot: '12:30',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('pho.png')
  },
  {
    place_id: 'dimsum-tien-phat',
    place_name: 'Dimsum Tiến Phát',
    category: 'food',
    sub_category: 'chinese',
    district: 'Quận 5',
    address: '18 Ký Hòa, Phường 11, Quận 5',
    description: 'Quán ăn sáng điểm tâm Hong Kong chuẩn phong vị người Hoa Chợ Lớn lâu đời.',
    latitude: 10.7533,
    longitude: 106.6612,
    estimated_cost: 140000,
    time_slot: '08:00',
    is_indoor: true,
    suitable_for: ['couple', 'friends', 'family'],
    rating: 4.5,
    editorial_score: 4.5,
    photo_url: photo('banh-mi.png')
  },
  {
    place_id: 'pho-am-thuc-vinh-khanh',
    place_name: 'Phố ẩm thực Ốc Vĩnh Khánh',
    category: 'food',
    sub_category: 'seafood',
    district: 'Quận 4',
    address: 'Đường Vĩnh Khánh, Phường 9, Quận 4',
    description: 'Thủ phủ ốc và hải sản tươi ngon nhộn nhịp về đêm, trải nghiệm ăn nhậu bình dân Sài Gòn.',
    latitude: 10.7602,
    longitude: 106.7025,
    estimated_cost: 180000,
    time_slot: '19:00',
    is_indoor: false,
    suitable_for: ['friends', 'couple'],
    rating: 4.5,
    editorial_score: 4.4,
    photo_url: photo('pho.png')
  },
  {
    place_id: 'cafe-chung-cu-nguyen-hue',
    place_name: 'Cà phê Chung cư 42 Nguyễn Huệ',
    category: 'cafe',
    sub_category: 'specialty',
    district: 'Quận 1',
    address: '42 Nguyễn Huệ, Bến Nghé, Quận 1',
    description: 'Tòa chung cư cũ biến thành thiên đường cà phê độc đáo với view nhìn trọn phố đi bộ.',
    latitude: 10.7745,
    longitude: 106.7038,
    estimated_cost: 85000,
    time_slot: '14:30',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('cafe.jpg')
  },
  {
    place_id: 'cafe-vot-phan-dinh-phung',
    place_name: 'Cà phê Vợt Phan Đình Phùng',
    category: 'cafe',
    sub_category: 'traditional',
    district: 'Phú Nhuận',
    address: '330 Phan Đình Phùng, Phường 1, Phú Nhuận',
    description: 'Quán cà phê vợt hoạt động liên tục hơn 60 năm, nét văn hóa thưởng thức cà phê sớm của người Sài Gòn.',
    latitude: 10.7963,
    longitude: 106.6841,
    estimated_cost: 25000,
    time_slot: '07:00',
    is_indoor: false,
    suitable_for: ['solo', 'friends'],
    rating: 4.7,
    editorial_score: 4.7,
    photo_url: photo('cafe.jpg')
  },
  {
    place_id: 'cho-ben-thanh',
    place_name: 'Chợ Bến Thành',
    category: 'shopping',
    sub_category: 'market',
    district: 'Quận 1',
    address: 'Lê Lợi, Phường Bến Thành, Quận 1',
    description: 'Khu chợ biểu tượng trăm năm với tháp đồng hồ bốn mặt, hội tụ đồ lưu niệm và ẩm thực phong phú.',
    latitude: 10.7725,
    longitude: 106.698,
    estimated_cost: 100000,
    time_slot: '15:30',
    is_indoor: true,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.4,
    editorial_score: 4.4,
    photo_url: photo('ben_thanh.jpeg')
  },
  {
    place_id: 'cho-binh-tay',
    place_name: 'Chợ Bình Tây (Chợ Lớn)',
    category: 'shopping',
    sub_category: 'market',
    district: 'Quận 5',
    address: '57A Tháp Mười, Phường 2, Quận 6 (tiếp giáp Quận 5)',
    description: 'Ngôi chợ đầu mối cổ kính mang kiến trúc Á Đông với mái ngói lưu ly và sân trời thoáng đãng.',
    latitude: 10.7511,
    longitude: 106.6508,
    estimated_cost: 50000,
    time_slot: '14:00',
    is_indoor: true,
    suitable_for: ['solo', 'friends', 'family'],
    rating: 4.5,
    editorial_score: 4.5,
    photo_url: photo('trip-temple.jpg')
  },
  {
    place_id: 'ben-bach-dang-waterbus',
    place_name: 'Bến Bạch Đằng & Saigon Waterbus',
    category: 'nature',
    sub_category: 'river',
    district: 'Quận 1',
    address: 'Tôn Đức Thắng, Phường Bến Nghé, Quận 1',
    description: 'Công viên ven sông thoáng đãng và trải nghiệm đi xe buýt trên sông ngắm hoàng hôn Sài Gòn.',
    latitude: 10.772,
    longitude: 106.706,
    estimated_cost: 30000,
    time_slot: '17:00',
    is_indoor: false,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('saigon-river.jpg')
  },
  {
    place_id: 'pho-di-bo-nguyen-hue',
    place_name: 'Phố đi bộ Nguyễn Huệ',
    category: 'entertainment',
    sub_category: 'street',
    district: 'Quận 1',
    address: 'Đường Nguyễn Huệ, Bến Nghé, Quận 1',
    description: 'Quảng trường đi bộ trung tâm sầm uất với các hoạt động âm nhạc đường phố và ngắm cảnh đêm.',
    latitude: 10.774,
    longitude: 106.703,
    estimated_cost: 50000,
    time_slot: '20:00',
    is_indoor: false,
    suitable_for: ['solo', 'couple', 'friends', 'family'],
    rating: 4.5,
    editorial_score: 4.5,
    photo_url: photo('nguyen_hue_walking_street.jpeg')
  },
  {
    place_id: 'landmark-81-park',
    place_name: 'Landmark 81 & Công viên ven sông',
    category: 'entertainment',
    sub_category: 'modern',
    district: 'Bình Thạnh',
    address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh',
    description: 'Tòa nhà cao nhất Việt Nam cùng công viên sinh thái 14ha với hồ nước và không gian hiện đại.',
    latitude: 10.795,
    longitude: 106.7218,
    estimated_cost: 150000,
    time_slot: '16:30',
    is_indoor: true,
    suitable_for: ['couple', 'friends', 'family'],
    rating: 4.7,
    editorial_score: 4.7,
    photo_url: photo('saigon-river.jpg')
  },
  {
    place_id: 'thao-cam-vien',
    place_name: 'Thảo Cầm Viên Sài Gòn',
    category: 'nature',
    sub_category: 'park',
    district: 'Quận 1',
    address: '02 Nguyễn Bỉnh Khiêm, Bến Nghé, Quận 1',
    description: 'Khu bảo tồn động thực vật cổ xưa và rợp bóng cây xanh nhất giữa lòng thành phố.',
    latitude: 10.7876,
    longitude: 106.7051,
    estimated_cost: 60000,
    time_slot: '08:30',
    is_indoor: false,
    suitable_for: ['family', 'couple', 'solo'],
    rating: 4.6,
    editorial_score: 4.6,
    photo_url: photo('saigon-river.jpg')
  }
];

function extractDistrict(place) {
  if (place.district) return place.district;
  const address = place.address || '';
  const match = address.match(/(Quận\s*\d+|TP\.\s*Thủ Đức|Bình Thạnh|Phú Nhuận|Tân Bình)/i);
  return match ? match[0] : 'Quận 1';
}

// Tính điểm tương đồng giữa điểm hiện tại và điểm ứng viên
function calculateMatchScore(candidate, current, currentDistrict) {
  let score = 0;
  // 1. Cùng danh mục là quan trọng nhất (+25)
  if (candidate.category === current.category) score += 25;

  // 2. Cùng quận (+20), quận lân cận (+10)
  const candidateDistrict = extractDistrict(candidate);
  if (candidateDistrict.toLowerCase() === currentDistrict.toLowerCase()) {
    score += 20;
  } else if (
    (currentDistrict.includes('1') && candidateDistrict.includes('3')) ||
    (currentDistrict.includes('3') && candidateDistrict.includes('1')) ||
    (currentDistrict.includes('5') && candidateDistrict.includes('6'))
  ) {
    score += 10;
  }

  // 3. Tương đồng mức giá (+15)
  const currentCost = Number(current.estimated_cost || 0);
  const candCost = Number(candidate.estimated_cost || 0);
  const costDiff = Math.abs(currentCost - candCost);
  if (costDiff <= 25000) score += 15;
  else if (costDiff <= 60000) score += 8;

  // 4. Ưu tiên điểm có rating cao (+10)
  if (candidate.editorial_score >= 4.6) score += 10;

  // 5. Cùng tính chất trong nhà/ngoài trời (+5)
  if (candidate.is_indoor === current.is_indoor) score += 5;

  return score;
}

function buildReason(candidate, current, currentDistrict) {
  const candidateDistrict = extractDistrict(candidate);
  const parts = [];
  if (candidateDistrict.toLowerCase() === currentDistrict.toLowerCase()) {
    parts.push(`Cùng ${candidateDistrict}`);
  } else {
    parts.push(`Khu vực lân cận (${candidateDistrict})`);
  }

  const costDiff = Math.abs((candidate.estimated_cost || 0) - (current.estimated_cost || 0));
  if (costDiff <= 20000) {
    parts.push('Mức giá tương đương');
  } else if (candidate.estimated_cost < current.estimated_cost) {
    parts.push('Tiết kiệm hơn');
  }

  if (candidate.is_indoor) {
    parts.push('Không gian máy lạnh');
  }

  return parts.slice(0, 2).join(' · ') || 'Lựa chọn chất lượng cao';
}

export function getSwapAlternatives(currentItem, currentItinerary = [], maxResults = 3) {
  if (!currentItem) return [];
  const currentDistrict = extractDistrict(currentItem);
  const existingNames = new Set(
    currentItinerary.map((item) => (item.place_name || item.name || '').trim().toLowerCase())
  );

  const scored = PLACES_CATALOG
    .filter((candidate) => {
      const candName = candidate.place_name.toLowerCase();
      // Không lấy lại chính điểm hiện tại hoặc điểm đã có trong lịch trình
      return !existingNames.has(candName) && candName !== (currentItem.place_name || '').toLowerCase();
    })
    .map((candidate) => {
      const score = calculateMatchScore(candidate, currentItem, currentDistrict);
      return {
        ...candidate,
        swap_score: score,
        swap_reason: buildReason(candidate, currentItem, currentDistrict)
      };
    })
    .sort((a, b) => b.swap_score - a.swap_score);

  // Nếu cùng danh mục có đủ thì ưu tiên lấy cùng danh mục
  const sameCategory = scored.filter((p) => p.category === currentItem.category);
  const candidates = sameCategory.length >= maxResults ? sameCategory : scored;

  return candidates.slice(0, maxResults);
}

export function filterPlaces(criteria = {}) {
  return PLACES_CATALOG.filter((place) => {
    if (criteria.category && place.category !== criteria.category) return false;
    if (criteria.district && !extractDistrict(place).toLowerCase().includes(criteria.district.toLowerCase())) return false;
    if (criteria.is_indoor !== undefined && place.is_indoor !== criteria.is_indoor) return false;
    if (criteria.max_price && place.estimated_cost > criteria.max_price) return false;
    return true;
  });
}

export function applyRainyPlan(items = []) {
  let replacedCount = 0;
  const updatedItems = items.map((item) => {
    // Nếu điểm này ngoài trời, thay bằng điểm trong nhà cùng quận hoặc danh mục
    if (item.is_indoor === false) {
      const alternatives = getSwapAlternatives(item, items, 5).filter((p) => p.is_indoor === true);
      if (alternatives.length > 0) {
        const replacement = alternatives[0];
        replacedCount += 1;
        return {
          ...item,
          place_id: replacement.place_id,
          place_name: replacement.place_name,
          address: replacement.address,
          description: replacement.description,
          latitude: replacement.latitude,
          longitude: replacement.longitude,
          estimated_cost: replacement.estimated_cost,
          photo_url: replacement.photo_url,
          is_indoor: true,
          editorial_score: replacement.editorial_score,
          rain_replacement: true
        };
      }
    }
    return item;
  });

  return { updatedItems, replacedCount };
}

export function optimizeBudget(items = [], targetBudget = 0) {
  let totalSavings = 0;
  const updatedItems = items.map((item) => {
    // Nếu là quán ăn/cafe có giá cao, đổi sang món hoặc quán tương đương giá rẻ hơn
    if ((item.category === 'food' || item.category === 'cafe') && item.estimated_cost > 80000) {
      const cheaperAlternatives = getSwapAlternatives(item, items, 5)
        .filter((p) => p.category === item.category && p.estimated_cost < item.estimated_cost);
      if (cheaperAlternatives.length > 0) {
        const cheaper = cheaperAlternatives[0];
        const saving = item.estimated_cost - cheaper.estimated_cost;
        totalSavings += saving;
        return {
          ...item,
          place_id: cheaper.place_id,
          place_name: cheaper.place_name,
          address: cheaper.address,
          description: cheaper.description,
          latitude: cheaper.latitude,
          longitude: cheaper.longitude,
          estimated_cost: cheaper.estimated_cost,
          photo_url: cheaper.photo_url,
          editorial_score: cheaper.editorial_score,
          budget_optimized: true
        };
      } else {
        // Hoặc giảm 20% chi phí ước tính
        const oldCost = item.estimated_cost;
        const newCost = Math.round(oldCost * 0.75);
        totalSavings += (oldCost - newCost);
        return { ...item, estimated_cost: newCost };
      }
    }
    return item;
  });

  return { updatedItems, savings: totalSavings };
}
