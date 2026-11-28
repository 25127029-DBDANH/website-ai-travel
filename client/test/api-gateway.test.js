import test from 'node:test';
import assert from 'node:assert/strict';

// Provide a simple in-memory localStorage for Node test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { api, USE_BACKEND, isBackendEnabled, setUseBackend } = await import('../src/lib/api.js');

test('API Gateway defaults to VITE_USE_BACKEND = true and can toggle to Mock Data mode', async () => {
  assert.equal(USE_BACKEND, true);
  assert.equal(isBackendEnabled(), true);

  setUseBackend(false);
  assert.equal(isBackendEnabled(), false);

  // 1. Auth in Mock mode
  const reg = await api.register({ username: 'danh_lead', password: 'Password123!' });
  assert.equal(reg.user.username, 'danh_lead');
  assert.ok(reg.token.startsWith('mock-jwt-'));
  const me = await api.getMe();
  assert.equal(me.user.username, 'danh_lead');

  // 2. AI Concept, Generate & Smart Swap in Mock mode
  const concept = await api.suggestTripConcept({
    days: 2,
    budget: 3000000,
    districts: ['Quận 1', 'Quận 3'],
    preferences: ['food', 'culture'],
  });
  assert.ok(concept.summary);
  assert.ok(Array.isArray(concept.highlights) && concept.highlights.length > 0);

  const generated = await api.generateAiItinerary({
    days: 2,
    places_per_day: 4,
    start_location: 'Quận 1',
  });
  assert.equal(generated.itinerary_items.length, 8);

  const swaps = await api.suggestPlaceSwaps({
    current_item: generated.itinerary_items[0],
    reason: 'Đổi điểm khác',
  });
  assert.equal(swaps.alternatives.length, 3);

  // 3. Places search in Mock mode
  const placesRes = await api.searchPlaces({ district: 'Quận 1', limit: 5 });
  assert.ok(placesRes.results.length > 0);

  // 4. Trips CRUD & interactive actions in Mock mode
  const created = await api.createTrip({
    title: 'Chuyến đi Mock Test',
    days: 2,
    budget: 4000000,
    member_count: 4,
    companion: 'group',
    itinerary_items: generated.itinerary_items,
  });
  assert.ok(created.id);
  assert.equal(created.member_count, 4);

  const loaded = await api.getTrip(created.id);
  assert.equal(loaded.trip.title, 'Chuyến đi Mock Test');
  assert.equal(loaded.itinerary_items.length, 8);

  const afterAccept = await api.toggleAcceptPlace(created.id, 1, 1);
  const firstItem = afterAccept.items.find((it) => it.day_number === 1 && it.order_index === 1);
  assert.equal(firstItem.is_accepted, true);

  const afterCheckin = await api.saveCheckin(created.id, 1, 1, { note: 'Đã tới nơi!' });
  const checkedItem = afterCheckin.items.find((it) => it.day_number === 1 && it.order_index === 1);
  assert.equal(checkedItem.visited, true);
  assert.equal(checkedItem.checkin_note, 'Đã tới nơi!');

  const share = await api.createShareLink(created.id);
  assert.ok(share.share_token);
  const sharedData = await api.getSharedTrip(share.share_token);
  assert.equal(sharedData.trip.id, created.id);

  // Reset back to default
  setUseBackend(null);
  assert.equal(isBackendEnabled(), true);
});

test('api swapPlace, applyRainMode, and visited lock behave atomically in mock mode', async () => {
  setUseBackend(false);
  try {
    const customItems = [
      {
        day_number: 1,
        order_index: 1,
        place_id: 'p-1',
        place_name: 'Dinh Độc Lập',
        district: 'Quận 1',
        category: 'sightseeing',
        latitude: 10.777,
        longitude: 106.6953,
        estimated_cost: 65000,
        end_time: '10:00',
        is_indoor: false,
        visited: false
      },
      {
        day_number: 1,
        order_index: 2,
        place_id: 'p-2',
        place_name: 'Phố đi bộ Nguyễn Huệ',
        district: 'Quận 1',
        category: 'sightseeing',
        latitude: 10.774,
        longitude: 106.7035,
        estimated_cost: 0,
        start_time: '10:15',
        end_time: '12:00',
        is_indoor: false,
        visited: false,
        transit_info: { mode: 'grab_car', distance_km: 1.0, estimated_fare_vnd: 32000 }
      },
      {
        day_number: 1,
        order_index: 3,
        place_id: 'p-3',
        place_name: 'Phở Hòa Pasteur',
        district: 'Quận 3',
        category: 'food',
        latitude: 10.788,
        longitude: 106.691,
        estimated_cost: 95000,
        start_time: '12:15',
        end_time: '13:30',
        is_indoor: true,
        visited: false,
        transit_info: { mode: 'grab_car', distance_km: 1.5, estimated_fare_vnd: 32000 }
      }
    ];

    const created = await api.createTrip({
      title: 'Atomic Lock Test',
      days: 1,
      budget: 2000000,
      member_count: 4,
      transport_mode: 'grab_car',
      itinerary_items: customItems
    });

    // Lock stop 1 via check-in
    await api.toggleVisited(created.id, 1, 1);

    // Locked stop cannot be unchecked, accepted, or swapped
    await assert.rejects(() => api.toggleVisited(created.id, 1, 1), (err) => err.code === 'ITEM_VISITED_LOCKED');
    await assert.rejects(() => api.toggleAcceptPlace(created.id, 1, 1), (err) => err.code === 'ITEM_VISITED_LOCKED');
    await assert.rejects(
      () => api.swapPlace(created.id, 1, 1, { place_id: 'x', place_name: 'Other', latitude: 10.8, longitude: 106.7 }),
      (err) => err.code === 'ITEM_VISITED_LOCKED'
    );

    // Swapping stop 2 to Tan Son Nhat recalculates distance & fare cleanly
    const afterSwap = await api.swapPlace(created.id, 1, 2, {
      place_id: 'p-tsn',
      place_name: 'Công viên Hoàng Văn Thụ',
      district: 'Tân Bình',
      latitude: 10.8005,
      longitude: 106.663,
      estimated_cost: 0,
      is_indoor: false
    });
    const swappedStop2 = afterSwap.items.find((it) => it.order_index === 2);
    assert.ok(swappedStop2.transit_info.distance_km > 4.0);
    assert.ok(swappedStop2.transit_info.estimated_fare_vnd > 45000);

    // Atomic rain swap + enable sets replacement AND rain mode in one save
    const afterRain = await api.applyRainMode(created.id, 1, true, {
      target: swappedStop2,
      replacement: {
        place_id: 'p-bao-tang',
        place_name: 'Bảo tàng Mỹ thuật TP.HCM',
        district: 'Quận 1',
        latitude: 10.7698,
        longitude: 106.6995,
        estimated_cost: 30000,
        is_indoor: true
      }
    });
    const rainStop2 = afterRain.items.find((it) => it.order_index === 2);
    const rainStop3 = afterRain.items.find((it) => it.order_index === 3);
    assert.equal(rainStop2.place_name, 'Bảo tàng Mỹ thuật TP.HCM');
    assert.equal(rainStop2.transit_info.is_rain_mode, true);
    assert.equal(rainStop3.transit_info.is_rain_mode, true);
  } finally {
    setUseBackend(null);
  }
});
