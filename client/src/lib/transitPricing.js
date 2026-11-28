// Haversine + urban road-distance estimation, 3-brand fare matrix (Grab / Xanh SM / Be),
// and atomic per-day transit recalculation on place swap or adaptive updates.

export const EARTH_RADIUS_KM = 6371;
export const ROAD_DISTANCE_FACTOR = 1.3;
export const MIN_FARE_KM = 2.0;
export const WALK_THRESHOLD_KM = 0.5;
export const RUSH_HOUR_BUFFER_MIN = 20;
export const RAIN_SURGE_MULTIPLIER = 1.5;
export const MIN_RAIN_CAR_FARE_VND = 35000;

export const MODE_SPEED_KMH = {
  walk: 5.0,
  grab_bike: 20.0,
  grab_car: 25.0,
  public: 15.0
};

// Synchronized with server/app/utils/transit_calculator.py FARE_RULES
export const BRAND_FARE_RULES = [
  {
    id: 'grab',
    brand: 'Grab',
    tagKey: 'popularBadge',
    bikeType: 'GrabBike',
    carType: 'GrabCar',
    bike: { baseFareVnd: 13800, baseKm: 2.0, perKmVnd: 4800, minFareVnd: 13800 },
    car: { baseFareVnd: 32000, baseKm: 2.0, perKmVnd: 12000, minFareVnd: 32000 }
  },
  {
    id: 'xanhsm',
    brand: 'Xanh SM',
    tagKey: 'electricBadge',
    bikeType: 'Bike điện',
    carType: 'Taxi điện',
    bike: { baseFareVnd: 14500, baseKm: 2.0, perKmVnd: 4800, minFareVnd: 14500 },
    car: { baseFareVnd: 27000, baseKm: 2.0, perKmVnd: 13000, minFareVnd: 27000 }
  },
  {
    id: 'be',
    brand: 'Be',
    tagKey: 'cheapestBadge',
    bikeType: 'BeBike',
    carType: 'BeCar',
    bike: { baseFareVnd: 12500, baseKm: 2.0, perKmVnd: 4500, minFareVnd: 12500 },
    car: { baseFareVnd: 29000, baseKm: 2.0, perKmVnd: 11000, minFareVnd: 29000 }
  }
];

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function resolvePointCoords(point) {
  if (!point || typeof point !== 'object') return null;
  const rawLat = point.latitude ?? point.lat;
  const rawLng = point.longitude ?? point.lng;
  if (
    rawLat === null ||
    rawLat === undefined ||
    rawLat === '' ||
    typeof rawLat === 'boolean' ||
    rawLng === null ||
    rawLng === undefined ||
    rawLng === '' ||
    typeof rawLng === 'boolean'
  ) {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lng2 - lng1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const clamped = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
  return EARTH_RADIUS_KM * c;
}

export function estimateRoadDistanceKm(lat1, lng1, lat2, lng2, factor = ROAD_DISTANCE_FACTOR) {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * factor * 100) / 100;
}

export function carsNeededForGroup(memberCount = 1) {
  const safeCount = Math.max(1, Math.round(Number(memberCount) || 1));
  return Math.max(1, Math.ceil(safeCount / 4));
}

export function calculateRuleFare(rule, distanceKm) {
  const dist = Math.max(0, Number(distanceKm) || 0);
  if (dist <= rule.baseKm) return rule.baseFareVnd;
  const extraKm = dist - rule.baseKm;
  return Math.max(rule.minFareVnd, Math.round(rule.baseFareVnd + extraKm * rule.perKmVnd));
}

export function applyRainFare(baseFare) {
  return Math.max(MIN_RAIN_CAR_FARE_VND, Math.round(baseFare * RAIN_SURGE_MULTIPLIER));
}

export function estimateBrandFares(distanceKm, { isRaining = false, memberCount = 1 } = {}) {
  const dist = Math.max(0, Math.round((Number(distanceKm) || 0) * 100) / 100);
  const safeMembers = Math.max(1, Math.round(Number(memberCount) || 1));
  const carsNeeded = carsNeededForGroup(safeMembers);
  const isMinFare = dist <= MIN_FARE_KM;

  const raw = BRAND_FARE_RULES.map((entry) => {
    const baseBike = calculateRuleFare(entry.bike, dist);
    const baseCar = calculateRuleFare(entry.car, dist);
    const bikeFareVnd = isRaining ? Math.round(baseBike * RAIN_SURGE_MULTIPLIER) : baseBike;
    const carFarePerCarVnd = isRaining ? applyRainFare(baseCar) : baseCar;
    return {
      id: entry.id,
      brand: entry.brand,
      tagKey: entry.tagKey,
      bikeType: entry.bikeType,
      carType: entry.carType,
      distanceKm: dist,
      bikeFareVnd,
      totalBikeFareVnd: bikeFareVnd * safeMembers,
      carFarePerCarVnd,
      carsNeeded,
      totalCarFareVnd: carFarePerCarVnd * carsNeeded,
      isMinFare
    };
  });

  const minBike = Math.min(...raw.map((r) => r.bikeFareVnd));
  const minCar = Math.min(...raw.map((r) => r.totalCarFareVnd));

  return raw.map((item) => ({
    ...item,
    isCheapestBike: item.bikeFareVnd === minBike,
    isCheapestCar: item.totalCarFareVnd === minCar
  }));
}

export function computeLegTransit(
  prevStop,
  currStop,
  { defaultMode = 'grab_bike', memberCount = 1 } = {}
) {
  const prevTransit = currStop?.transit_info || {};
  const isRaining = Boolean(prevTransit.is_rain_mode);
  const isRushHour = Boolean(prevTransit.is_rush_hour);

  const prevCoords = resolvePointCoords(prevStop);
  const currCoords = resolvePointCoords(currStop);
  let distKm;
  if (prevCoords && currCoords) {
    distKm = estimateRoadDistanceKm(prevCoords.lat, prevCoords.lng, currCoords.lat, currCoords.lng);
  } else {
    distKm = Math.max(0, Math.round((Number(prevTransit.distance_km) || 0) * 100) / 100);
  }

  const baseMode = isRaining
    ? 'grab_car'
    : prevTransit.mode && MODE_SPEED_KMH[prevTransit.mode]
      ? prevTransit.mode
      : MODE_SPEED_KMH[defaultMode]
        ? defaultMode
        : 'grab_bike';

  const speedKmh = MODE_SPEED_KMH[baseMode] || 20.0;
  const baseDuration = Math.max(2, Math.round((distKm / speedKmh) * 60));
  const durationMin = baseDuration + (isRushHour ? RUSH_HOUR_BUFFER_MIN : 0);

  const carsNeeded = baseMode === 'grab_car' ? carsNeededForGroup(memberCount) : 1;
  let fareVnd = 0;
  if (baseMode !== 'walk') {
    const grabRule = BRAND_FARE_RULES[0];
    if (baseMode === 'grab_car') {
      const baseCar = calculateRuleFare(grabRule.car, distKm);
      const perCarFare = isRaining ? applyRainFare(baseCar) : baseCar;
      fareVnd = perCarFare * carsNeeded;
    } else {
      fareVnd = calculateRuleFare(grabRule.bike, distKm);
    }
  }

  return {
    ...prevTransit,
    distance_km: distKm,
    duration_min: durationMin,
    mode: baseMode,
    estimated_fare_vnd: fareVnd,
    cars_needed: carsNeeded,
    is_min_fare: distKm <= MIN_FARE_KM,
    is_rain_mode: isRaining,
    is_rush_hour: isRushHour,
    start_time: prevStop?.end_time || prevTransit.start_time || '',
    end_time: currStop?.start_time || prevTransit.end_time || ''
  };
}

export function recalculateDayTransits(
  items,
  dayNumber,
  { defaultMode = 'grab_bike', memberCount = 1 } = {}
) {
  const targetDay = Number(dayNumber);
  const dayIndices = [];
  items.forEach((item, idx) => {
    if (Number(item?.day_number) === targetDay) {
      dayIndices.push(idx);
    }
  });
  dayIndices.sort(
    (idxA, idxB) => Number(items[idxA].order_index) - Number(items[idxB].order_index)
  );

  const nextItems = [...items];
  for (let pos = 1; pos < dayIndices.length; pos += 1) {
    const prevIdx = dayIndices[pos - 1];
    const currIdx = dayIndices[pos];
    const currItem = nextItems[currIdx];
    // Tuyệt đối giữ nguyên điểm và chặng đã check-in ("Đã đến")
    if (currItem?.visited) continue;
    nextItems[currIdx] = {
      ...currItem,
      transit_info: computeLegTransit(nextItems[prevIdx], currItem, {
        defaultMode,
        memberCount
      })
    };
  }
  return nextItems;
}
