const EARTH_RADIUS_KM = 6371;
const HCMC_ROAD_FACTOR = 1.3; // Hệ số đường bộ nội đô TP.HCM

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Tính khoảng cách mặt cầu Haversine và ước tính cước di chuyển Grab tại TP.HCM
 */
export function calculateTransit(fromLat, fromLng, toLat, toLng) {
  if (typeof fromLat !== 'number' || typeof fromLng !== 'number' ||
      typeof toLat !== 'number' || typeof toLng !== 'number') {
    return null;
  }

  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;

  const straightDistanceKm = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadDistanceKm = Number((straightDistanceKm * HCMC_ROAD_FACTOR).toFixed(2));

  // Chặng ngắn <= 800m: Gợi ý đi bộ
  if (roadDistanceKm <= 0.8) {
    const walkMinutes = Math.max(2, Math.round((roadDistanceKm / 5) * 60));
    return {
      mode: 'walk',
      distance_km: roadDistanceKm,
      duration_min: walkMinutes,
      estimated_fare_vnd: 0,
      label: `🚶 ${walkMinutes} phút đi bộ (${Math.round(roadDistanceKm * 1000)}m)`
    };
  }

  // Chặng > 800m: Ước tính cước Grab
  const rideMinutes = Math.max(5, Math.round((roadDistanceKm / 20) * 60));
  const rawFare = 18000 + Math.max(0, roadDistanceKm - 2) * 5500;
  const roundedFare = Math.ceil(rawFare / 5000) * 5000;

  return {
    mode: 'grab',
    distance_km: roadDistanceKm,
    duration_min: rideMinutes,
    estimated_fare_vnd: roundedFare,
    label: `🚕 ${rideMinutes} phút Grab (~₫${roundedFare.toLocaleString('vi-VN')})`
  };
}
