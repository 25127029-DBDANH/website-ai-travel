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
