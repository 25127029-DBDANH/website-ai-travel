import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACES_CATALOG,
  getSwapAlternatives,
  filterPlaces,
  optimizeBudget,
  applyRainyPlan
} from '../src/lib/catalogService.js';

test('PLACES_CATALOG has rich metadata for TP.HCM places', () => {
  assert.ok(PLACES_CATALOG.length >= 15);
  const sample = PLACES_CATALOG[0];
  assert.ok(sample.place_name);
  assert.ok(sample.category);
  assert.ok(sample.district);
  assert.equal(typeof sample.is_indoor, 'boolean');
  assert.ok(sample.estimated_cost >= 0);
});

test('getSwapAlternatives returns relevant places in same category not already in itinerary', () => {
  const current = {
    place_name: 'Dinh Độc Lập',
    category: 'sightseeing',
    district: 'Quận 1',
    estimated_cost: 65000,
    is_indoor: true
  };
  const currentItinerary = [current];

  const alternatives = getSwapAlternatives(current, currentItinerary, 3);
  assert.ok(alternatives.length > 0 && alternatives.length <= 3);
  assert.ok(!alternatives.some((p) => p.place_name === current.place_name));
  assert.equal(alternatives[0].category, 'sightseeing');
  assert.ok(alternatives[0].swap_reason);
});

test('applyRainyPlan replaces outdoor stops with indoor alternatives in same district/category', () => {
  const outdoorItem = {
    day_number: 1,
    order_index: 1,
    place_name: 'Phố đi bộ Nguyễn Huệ',
    category: 'entertainment',
    district: 'Quận 1',
    is_indoor: false,
    time_slot: '15:00',
    estimated_cost: 0
  };
  const items = [outdoorItem];
  const { updatedItems, replacedCount } = applyRainyPlan(items);

  assert.equal(replacedCount, 1);
  assert.equal(updatedItems[0].is_indoor, true);
  assert.notEqual(updatedItems[0].place_name, 'Phố đi bộ Nguyễn Huệ');
  assert.equal(updatedItems[0].day_number, 1);
});

test('optimizeBudget reduces costs for high-cost items', () => {
  const items = [
    {
      day_number: 1,
      order_index: 1,
      place_name: 'Bữa tối sang trọng',
      category: 'food',
      district: 'Quận 1',
      estimated_cost: 450000,
      time_slot: '18:30'
    }
  ];
  const { updatedItems, savings } = optimizeBudget(items, 150000);
  assert.ok(savings > 0);
  assert.ok(updatedItems[0].estimated_cost < 450000);
});
