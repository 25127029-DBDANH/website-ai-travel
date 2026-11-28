import assert from 'node:assert/strict';
import test from 'node:test';
import {
  carsNeededForGroup,
  computeLegTransit,
  estimateBrandFares,
  estimateRoadDistanceKm,
  haversineKm,
  recalculateDayTransits
} from '../src/lib/transitPricing.js';

test('estimateRoadDistanceKm applies 1.3x urban road factor over haversine', () => {
  const straight = haversineKm(10.7769, 106.6953, 10.7798, 106.699);
  const road = estimateRoadDistanceKm(10.7769, 106.6953, 10.7798, 106.699);
  assert.ok(road > straight);
  assert.equal(road, Math.round(straight * 1.3 * 100) / 100);
});

test('carsNeededForGroup scales 1 car per 4 passengers', () => {
  assert.equal(carsNeededForGroup(1), 1);
  assert.equal(carsNeededForGroup(4), 1);
  assert.equal(carsNeededForGroup(5), 2);
  assert.equal(carsNeededForGroup(8), 2);
});

test('estimateBrandFares returns distinct prices across Grab, Xanh SM, and Be', () => {
  const shortFares = estimateBrandFares(1.5, { memberCount: 4 });
  assert.equal(shortFares.length, 3);
  const carPricesShort = new Set(shortFares.map((f) => f.totalCarFareVnd));
  assert.equal(carPricesShort.size, 3, 'All 3 car brands should show distinct estimates');

  // Under 2km opening fare: Xanh SM Car (27k) < BeCar (29k) < GrabCar (32k)
  const xanhShort = shortFares.find((f) => f.id === 'xanhsm');
  assert.equal(xanhShort.isCheapestCar, true);

  // Longer 6km leg: BeCar (29k + 4*11k = 73k) becomes cheapest vs GrabCar (80k) & Xanh SM (79k)
  const longFares = estimateBrandFares(6.0, { memberCount: 5 });
  const beLong = longFares.find((f) => f.id === 'be');
  assert.equal(beLong.carsNeeded, 2);
  assert.equal(beLong.totalCarFareVnd, beLong.carFarePerCarVnd * 2);
  assert.equal(beLong.isCheapestCar, true);
});

test('recalculateDayTransits updates unvisited adjacent legs on swap while keeping visited locked', () => {
  const stop1 = {
    day_number: 1,
    order_index: 1,
    place_id: 'p1',
    place_name: 'Stop 1',
    latitude: 10.7769,
    longitude: 106.6953,
    end_time: '10:00',
    visited: true
  };
  const stop2Old = {
    day_number: 1,
    order_index: 2,
    place_id: 'p2',
    place_name: 'Stop 2 Near',
    latitude: 10.778,
    longitude: 106.697,
    start_time: '10:15',
    end_time: '12:00',
    visited: false,
    transit_info: { mode: 'grab_car', distance_km: 0.3, estimated_fare_vnd: 29000 }
  };
  const stop3Visited = {
    day_number: 1,
    order_index: 3,
    place_id: 'p3',
    place_name: 'Stop 3 Visited',
    latitude: 10.795,
    longitude: 106.715,
    start_time: '12:30',
    end_time: '14:00',
    visited: true,
    transit_info: { mode: 'grab_car', distance_km: 2.5, estimated_fare_vnd: 38000 }
  };
  const stop4Unvisited = {
    day_number: 1,
    order_index: 4,
    place_id: 'p4',
    place_name: 'Stop 4 Open',
    latitude: 10.762,
    longitude: 106.682,
    start_time: '14:30',
    end_time: '16:00',
    visited: false,
    transit_info: { mode: 'grab_car', distance_km: 1.0, estimated_fare_vnd: 32000 }
  };

  // Swap stop2 to somewhere far (Tân Bình) while keeping stop3 visited
  const stop2New = {
    ...stop2Old,
    place_id: 'p2-far',
    place_name: 'Stop 2 Far',
    latitude: 10.8185,
    longitude: 106.6588
  };

  const recalculated = recalculateDayTransits(
    [stop1, stop2New, stop3Visited, stop4Unvisited],
    1,
    { defaultMode: 'grab_car', memberCount: 4 }
  );

  // Leg 1->2 updated significantly (> 5km road distance)
  assert.ok(recalculated[1].transit_info.distance_km > 5.0);
  assert.ok(recalculated[1].transit_info.estimated_fare_vnd > 50000);

  // Stop 3 was already visited -> transit_info MUST remain untouched
  assert.deepEqual(recalculated[2].transit_info, stop3Visited.transit_info);

  // Leg 3->4 updated from stop3Visited to stop4Unvisited
  const expectedLeg4 = computeLegTransit(stop3Visited, stop4Unvisited, {
    defaultMode: 'grab_car',
    memberCount: 4
  });
  assert.equal(recalculated[3].transit_info.distance_km, expectedLeg4.distance_km);
  assert.equal(recalculated[3].transit_info.estimated_fare_vnd, expectedLeg4.estimated_fare_vnd);
});
