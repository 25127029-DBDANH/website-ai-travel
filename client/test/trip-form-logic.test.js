import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { translations } from '../src/i18n/translations.js';
import { parseTripSentence } from '../src/lib/sentenceParser.js';
import {
  applyParsedToForm,
  BUDGET_PER_PERSON_PER_DAY,
  budgetPresetPatch,
  budgetPresetTotal,
  buildAiRequest,
  clampGroupSize,
  companionsPatch,
  customBudgetPatch,
  daysPatch,
  defaultTripForm,
  groupSizePatch,
  nextBudget,
  validateTripForm
} from '../src/lib/tripFormLogic.js';
import { hasParsedTripContent } from '../src/lib/tripOptions.js';

const NOW = new Date('2026-11-24T02:00:00Z');

test('parseTripSentence: handles 7 Vietnamese sample sentences including triệu/tr/k and missing info', () => {
  // 1. Director's canonical example
  const s1 = parseTripSentence(
    '2 ngày ở Quận 1 với gia đình 4 người, 3 triệu, thích ăn uống và cà phê',
    NOW
  );
  assert.equal(s1.days, 2);
  assert.equal(s1.district, 'Quận 1');
  assert.equal(s1.start_location, 'Quận 1, TP. Hồ Chí Minh');
  assert.equal(s1.companions, 'family');
  assert.equal(s1.group_size, 4);
  assert.equal(s1.budget, 3_000_000);
  assert.deepEqual(s1.preferences, ['food', 'cafe']);

  // 2. Solo + decimal "tr" + bus + culture & nature
  const s2 = parseTripSentence(
    'Đi một mình 3 ngày 2 đêm ở Quận 3, ngân sách 1.5tr, thích bảo tàng và công viên, đi xe buýt',
    NOW
  );
  assert.equal(s2.days, 3);
  assert.equal(s2.companions, 'solo');
  assert.equal(s2.district, 'Quận 3');
  assert.equal(s2.budget, 1_500_000);
  assert.equal(s2.transportation, 'public');
  assert.deepEqual(s2.preferences, ['culture', 'nature']);

  // 3. Weekend couple + "k" budget + Thảo Điền + grab car + nightlife
  const s3 = parseTripSentence(
    'Cuối tuần cặp đôi ở Thảo Điền 800k, thích cà phê và nightlife, đi grab car',
    NOW
  );
  assert.equal(s3.days, 2);
  assert.equal(s3.companions, 'couple');
  assert.equal(s3.district, 'Thủ Đức');
  assert.equal(s3.budget, 800_000);
  assert.equal(s3.transportation, 'grab_car');
  assert.deepEqual(s3.preferences, ['cafe', 'nightlife']);

  // 4. Colleagues -> friends + shorthand "2tr5" + dietary + avoid district
  const s4 = parseTripSentence(
    '5 đồng nghiệp đi chơi 1 ngày ở Quận 5, ăn chay, tránh Quận 7, ngân sách 2tr5',
    NOW
  );
  assert.equal(s4.days, 1);
  assert.equal(s4.companions, 'friends');
  assert.equal(s4.group_size, 5);
  assert.equal(s4.district, 'Quận 5');
  assert.equal(s4.budget, 2_500_000);
  assert.deepEqual(s4.dietary, ['vegetarian']);
  assert.deepEqual(s4.avoid_districts, ['Quận 7']);

  // 5. Partial sentence (missing days, budget, group)
  const s5 = parseTripSentence('Muốn đi ăn vặt và mua sắm ở Sài Gòn', NOW);
  assert.equal(s5.days, null);
  assert.equal(s5.budget, null);
  assert.equal(s5.companions, null);
  assert.deepEqual(s5.preferences, ['food', 'shopping']);
  assert.equal(hasParsedTripContent(s5), true);

  // 6. Relaxed pace + walking + grouped VND + dietary no_seafood/no_spicy
  const s6 = parseTripSentence(
    '4 ngày thong thả ở Phú Nhuận, không ăn hải sản, không ăn cay, đi bộ, 4.000.000',
    NOW
  );
  assert.equal(s6.days, 4);
  assert.equal(s6.pace, 'relaxed');
  assert.equal(s6.district, 'Phú Nhuận');
  assert.equal(s6.transportation, 'walk');
  assert.equal(s6.budget, 4_000_000);
  assert.deepEqual(s6.dietary.sort(), ['no_seafood', 'no_spicy']);

  // 7. Avoid false positives on Vietnamese homographs ("cho" vs "chợ", "chưa" vs "chùa", "phố" vs "phở")
  const s7 = parseTripSentence('Lịch trình 2 ngày cho nhóm 3 người dạo phố, chưa biết ăn gì', NOW);
  assert.equal(s7.days, 2);
  assert.equal(s7.group_size, 3);
  assert.deepEqual(s7.preferences, []);
});

test('clampGroupSize & companionsPatch enforce solo=1, couple=2, groups 2..20, colleagues->friends', () => {
  assert.equal(clampGroupSize('solo', 5), 1);
  assert.equal(clampGroupSize('couple', 8), 2);
  assert.equal(clampGroupSize('friends', 1), 2);
  assert.equal(clampGroupSize('family', 25), 20);
  assert.equal(clampGroupSize('colleagues', 6), 6);

  const soloForm = defaultTripForm();
  assert.deepEqual(companionsPatch(soloForm, 'couple'), {
    companions: 'couple',
    group_size: 2,
    budget: 6_000_000
  });
  assert.deepEqual(companionsPatch({ ...soloForm, budget_preset: null }, 'family'), {
    companions: 'family',
    group_size: 4
  });
  assert.deepEqual(
    companionsPatch({ companions: 'family', group_size: 7, days: 2, budget_preset: null }, 'colleagues'),
    { companions: 'friends', group_size: 7 }
  );
});

test('budget presets calculate per-person-per-day and auto-recalculate unless user entered custom budget', () => {
  assert.deepEqual(BUDGET_PER_PERSON_PER_DAY, [500_000, 1_000_000, 2_000_000]);
  assert.equal(budgetPresetTotal(500_000, 3, 1), 1_500_000);
  assert.equal(budgetPresetTotal(1_000_000, 2, 4), 8_000_000);
  assert.equal(budgetPresetTotal(2_000_000, 14, 20), 560_000_000);

  // Default form starts on 1tr/person/day preset -> changing days or group size recalculates budget
  let form = defaultTripForm();
  assert.equal(form.budget, 3_000_000);

  form = { ...form, ...daysPatch(form, 2) };
  assert.equal(form.budget, 2_000_000);

  form = { ...form, ...companionsPatch(form, 'family') };
  assert.equal(form.group_size, 4);
  assert.equal(form.budget, 8_000_000);

  form = { ...form, ...groupSizePatch(form, 5) };
  assert.equal(form.budget, 10_000_000);

  form = { ...form, ...budgetPresetPatch(form, 500_000) };
  assert.equal(form.budget, 5_000_000);

  // Once user manually inputs budget, changing days or group size must keep custom budget
  form = { ...form, ...customBudgetPatch(form, '3500000') };
  assert.equal(form.budget_preset, null);
  assert.equal(form.budget, 3_500_000);

  form = { ...form, ...daysPatch(form, 4) };
  assert.equal(form.budget, 3_500_000);

  form = { ...form, ...groupSizePatch(form, 6) };
  assert.equal(form.budget, 3_500_000);

  // nextBudget keeps previous value on empty/invalid input
  assert.equal(nextBudget('', 3_500_000), 3_500_000);
  assert.equal(nextBudget('0', 3_500_000), 3_500_000);
  assert.equal(nextBudget('-500', 3_500_000), 3_500_000);
});

test('applyParsedToForm fills fields, recalculates preset budget when omitted, and reverts untouched fields on re-parse', () => {
  const start = defaultTripForm();
  const first = applyParsedToForm(
    start,
    parseTripSentence('2 ngày ở Quận 5 với gia đình 4 người, 3 triệu, ăn chay, thích ăn uống và cà phê', NOW)
  );
  assert.equal(first.form.days, 2);
  assert.equal(first.form.companions, 'family');
  assert.equal(first.form.group_size, 4);
  assert.equal(first.form.budget, 3_000_000);
  assert.equal(first.form.budget_preset, null);
  assert.deepEqual(first.form.dietary, ['vegetarian']);
  assert.deepEqual(first.form.preferences, ['food', 'cafe']);

  // Second parse without budget reverts previous untouched parse and recalculates preset budget
  const second = applyParsedToForm(
    first.form,
    parseTripSentence('4 ngày đi một mình thích cà phê', NOW),
    first.parse
  );
  assert.equal(second.form.days, 4);
  assert.equal(second.form.companions, 'solo');
  assert.equal(second.form.group_size, 1);
  assert.equal(second.form.budget_preset, 1_000_000);
  assert.equal(second.form.budget, 4_000_000);
  assert.deepEqual(second.form.dietary, []);
  assert.deepEqual(second.form.preferences, ['cafe']);
});

test('buildAiRequest produces payload conforming to server TripConceptRequest schema', () => {
  const form = {
    ...defaultTripForm('Thảo Điền, TP. Thủ Đức'),
    days: 2,
    companions: 'colleagues',
    group_size: 5,
    budget: 5_000_000.4,
    transport_mode: 'metro_walking',
    pace: 'relaxed',
    preferences: ['food', 'cafe', 'culture'],
    quick_notes: ['ac_preferred'],
    custom_notes: 'Đi cùng người lớn tuổi',
    dietary: ['vegetarian', 'no_seafood'],
    avoid_districts: ['Quận 7']
  };

  const req = buildAiRequest(form);
  assert.equal(req.start_location, 'Thảo Điền, TP. Thủ Đức');
  assert.equal(req.budget, 5_000_000);
  assert.equal(req.days, 2);
  assert.deepEqual(req.districts, ['Thủ Đức']);
  assert.equal(req.places_per_day, 3);
  assert.equal(req.companion, 'friends');
  assert.equal(req.member_count, 5);
  assert.equal(req.transport_mode, 'public');
  assert.deepEqual(req.preferences, ['food', 'cafe', 'culture']);
  assert.equal(req.pace, 'relaxed');
  assert.ok(req.special_notes.includes('Ưu tiên máy lạnh/trong nhà'));
  assert.ok(req.special_notes.includes('Đi cùng người lớn tuổi'));
  assert.ok(req.special_notes.length <= 500);
  assert.deepEqual(req.dietary, ['vegetarian', 'no_seafood']);
  assert.deepEqual(req.avoid_districts, ['Quận 7']);
});

test('validateTripForm requires start_location, positive budget, and at least one preference', () => {
  const valid = validateTripForm(defaultTripForm());
  assert.equal(valid.valid, true);

  const invalid = validateTripForm(
    { ...defaultTripForm('   '), days: 15, preferences: [], budget: 0 },
    '0'
  );
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.start_location, 'start');
  assert.equal(invalid.errors.days, 'days');
  assert.equal(invalid.errors.budget, 'budget');
  assert.equal(invalid.errors.preferences, 'preferences');
});

test('TripForm i18n keys exist in both vi and en and TripForm uses no decorative gradients', () => {
  const source = readFileSync(new URL('../src/components/TripForm.jsx', import.meta.url), 'utf8');
  const keys = [...source.matchAll(/t\('((?:form|common|preference)\.[\w.]+)'/g)].map((m) => m[1]);
  assert.ok(keys.length > 20);
  for (const lang of ['vi', 'en']) {
    for (const key of keys) {
      assert.ok(translations[lang][key], `Missing translation ${lang}.${key}`);
    }
  }
  assert.equal(/bg-gradient-to|linear-gradient/.test(source), false);
});
