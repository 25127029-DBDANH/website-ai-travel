import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTripSentence } from '../src/lib/sentenceParser.js';
import { applyParsedToForm, buildAiRequest, defaultTripForm } from '../src/lib/tripFormLogic.js';
import {
  autoAdjustments,
  DRAFT_VERSION,
  firstIncompleteStep,
  normalizePlaceResult,
  parseDraft,
  serializeDraft,
  stepStatus,
  validateStep,
  WIZARD_STEPS
} from '../src/lib/tripWizardLogic.js';

const NOW = new Date('2026-11-24T02:00:00Z'); // 2026-11-24 (Tue) in Asia/Ho_Chi_Minh

test('WIZARD_STEPS defines the 6 themed steps in order', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => s.id),
    ['trip', 'group', 'budget', 'style', 'constraints', 'review']
  );
});

test('validateStep validates every step including travel_date bounds and >= 4h daily window', () => {
  const base = defaultTripForm();

  // Step 1: trip
  assert.deepEqual(validateStep('trip', base, { now: NOW }), {});
  assert.deepEqual(validateStep('trip', { ...base, travel_date: '2026-11-23' }, { now: NOW }), {});
  assert.deepEqual(validateStep('trip', { ...base, travel_date: '2027-11-24' }, { now: NOW }), {});
  assert.equal(validateStep('trip', { ...base, start_location: '   ' }, { now: NOW }).start_location, 'start');
  assert.equal(validateStep('trip', { ...base, days: 0 }, { now: NOW }).days, 'days');
  assert.equal(validateStep('trip', { ...base, days: 15 }, { now: NOW }).days, 'days');
  assert.equal(validateStep('trip', { ...base, travel_date: '2026-11-22' }, { now: NOW }).travel_date, 'travel_date');
  assert.equal(validateStep('trip', { ...base, travel_date: '2027-11-25' }, { now: NOW }).travel_date, 'travel_date');
  assert.equal(validateStep('trip', { ...base, travel_date: '2026-02-30' }, { now: NOW }).travel_date, 'travel_date');

  // Step 2: group
  assert.deepEqual(validateStep('group', base), {});
  assert.equal(validateStep('group', { ...base, companions: 'invalid' }).companions, 'companions');
  assert.equal(validateStep('group', { ...base, companions: 'family', group_size: 1 }).group_size, 'group_size');
  assert.equal(validateStep('group', { ...base, companions: 'friends', group_size: 21 }).group_size, 'group_size');

  // Step 3: budget
  assert.deepEqual(validateStep('budget', base), {});
  assert.equal(validateStep('budget', { ...base, budget: 0 }).budget, 'budget');
  assert.equal(validateStep('budget', base, { budgetDraft: '' }).budget, 'budget');
  assert.equal(validateStep('budget', base, { budgetDraft: '-50000' }).budget, 'budget');

  // Step 4: style (preferences + day_start/day_end >= 4h)
  assert.deepEqual(validateStep('style', base), {});
  assert.equal(validateStep('style', { ...base, preferences: [] }).preferences, 'preferences');
  assert.equal(validateStep('style', { ...base, day_start: '09:00', day_end: '' }).day_end, 'day_hours_incomplete');
  assert.equal(validateStep('style', { ...base, day_start: '', day_end: '18:00' }).day_start, 'day_hours_incomplete');
  assert.equal(validateStep('style', { ...base, day_start: '09:00', day_end: '12:00' }).day_end, 'day_hours_min');
  assert.equal(validateStep('style', { ...base, day_start: '09:00', day_end: '12:59' }).day_end, 'day_hours_min');
  assert.equal(validateStep('style', { ...base, day_start: '18:00', day_end: '09:00' }).day_end, 'day_hours_min');
  assert.deepEqual(validateStep('style', { ...base, day_start: '09:00', day_end: '13:00' }), {});
  assert.equal(validateStep('style', { ...base, day_start: '25:00', day_end: '29:00' }).day_start, 'day_hours');

  // Step 5: constraints (optional, validates bounds)
  assert.deepEqual(validateStep('constraints', base), {});
  const sixPlaces = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, district: 'Quận 1' }));
  assert.equal(validateStep('constraints', { ...base, must_visit: sixPlaces }).must_visit, 'must_visit');
  assert.equal(
    validateStep('constraints', { ...base, custom_notes: 'a'.repeat(501) }).special_notes,
    'special_notes'
  );

  // Step 6: review
  assert.deepEqual(validateStep('review', base), {});
});

test('stepStatus and firstIncompleteStep jump to review when complete or first missing step after quick fill', () => {
  const base = defaultTripForm();
  assert.deepEqual(stepStatus(base, { now: NOW }), {
    trip: 'complete',
    group: 'complete',
    budget: 'complete',
    style: 'complete',
    constraints: 'complete',
    review: 'complete'
  });

  // Pure form checks
  assert.equal(firstIncompleteStep({ ...base, budget: 0 }), 'budget');
  assert.equal(firstIncompleteStep({ ...base, preferences: [] }), 'style');
  assert.equal(firstIncompleteStep(base), 'review');

  // Full quick-fill sentence -> jumps straight to review
  const fullParsed = parseTripSentence(
    '2 ngày ở Quận 1 với gia đình 4 người, 3 triệu, thích ăn uống và cà phê',
    NOW
  );
  const fullApplied = applyParsedToForm(base, fullParsed);
  assert.equal(firstIncompleteStep(fullApplied.form, fullParsed), 'review');

  // Partial sentence missing budget -> jumps to budget
  const missingBudgetParsed = parseTripSentence(
    '2 ngày ở Quận 1 với gia đình 4 người, thích ăn uống và cà phê',
    NOW
  );
  const missingBudgetApplied = applyParsedToForm(base, missingBudgetParsed);
  assert.equal(firstIncompleteStep(missingBudgetApplied.form, missingBudgetParsed), 'budget');

  // Partial sentence missing preferences -> jumps to style
  const missingPrefsParsed = parseTripSentence('2 ngày ở Quận 1 cặp đôi 2 triệu', NOW);
  const missingPrefsApplied = applyParsedToForm(base, missingPrefsParsed);
  assert.equal(firstIncompleteStep(missingPrefsApplied.form, missingPrefsParsed), 'style');

  // Partial sentence missing days -> stays on trip
  const missingDaysParsed = parseTripSentence('Muốn đi ăn vặt và cà phê ở Quận 1', NOW);
  const missingDaysApplied = applyParsedToForm(base, missingDaysParsed);
  assert.equal(firstIncompleteStep(missingDaysApplied.form, missingDaysParsed), 'trip');
});

test('autoAdjustments softens packed pace for children/elderly and swaps walk to grab_car for limited mobility', () => {
  const packed = { ...defaultTripForm(), pace: 'packed' };

  const withChildren = autoAdjustments(packed, { ...packed, has_children: true });
  assert.equal(withChildren.form.pace, 'relaxed');
  assert.deepEqual(withChildren.notices, ['form.notice.paceRelaxed']);

  const withElderly = autoAdjustments(packed, { ...packed, has_elderly: true });
  assert.equal(withElderly.form.pace, 'relaxed');
  assert.deepEqual(withElderly.notices, ['form.notice.paceRelaxed']);

  // User explicitly selecting packed when has_children was already true is respected
  const explicitPacked = autoAdjustments(
    { ...defaultTripForm(), has_children: true, pace: 'relaxed' },
    { ...defaultTripForm(), has_children: true, pace: 'packed' }
  );
  assert.equal(explicitPacked.form.pace, 'packed');
  assert.deepEqual(explicitPacked.notices, []);

  // Limited mobility disables walk and switches to grab_car
  const walking = { ...defaultTripForm(), transport_mode: 'walk' };
  const limited = autoAdjustments(walking, { ...walking, mobility: 'limited' });
  assert.equal(limited.form.transport_mode, 'grab_car');
  assert.deepEqual(limited.notices, ['form.notice.transportGrabCar']);
});

test('buildAiRequest omits default/empty optional keys and maps must_visit to must_visit_ids', () => {
  const defaultReq = buildAiRequest(defaultTripForm());
  for (const key of [
    'travel_date',
    'day_start',
    'day_end',
    'has_children',
    'has_elderly',
    'mobility',
    'prefer_indoor',
    'must_visit_ids',
    'must_visit'
  ]) {
    assert.equal(key in defaultReq, false, `Expected default request to omit "${key}"`);
  }

  const customReq = buildAiRequest({
    ...defaultTripForm(),
    travel_date: '2026-12-25',
    day_start: '08:30',
    day_end: '18:00',
    has_children: true,
    has_elderly: true,
    mobility: 'limited',
    prefer_indoor: true,
    must_visit: [
      { id: 'p-dinh-doc-lap', name: 'Dinh Độc Lập', district: 'Quận 1' },
      { id: 'p-bao-tang-ctct', name: 'Bảo tàng Chứng tích Chiến tranh', district: 'Quận 3' },
      { id: 'p-dinh-doc-lap', name: 'Duplicate', district: 'Quận 1' }
    ]
  });

  assert.equal(customReq.travel_date, '2026-12-25');
  assert.equal(customReq.day_start, '08:30');
  assert.equal(customReq.day_end, '18:00');
  assert.equal(customReq.has_children, true);
  assert.equal(customReq.has_elderly, true);
  assert.equal(customReq.mobility, 'limited');
  assert.equal(customReq.prefer_indoor, true);
  assert.deepEqual(customReq.must_visit_ids, ['p-dinh-doc-lap', 'p-bao-tang-ctct']);
  assert.equal('must_visit' in customReq, false);

  // Invalid short window (< 4h) is omitted from request
  const shortHoursReq = buildAiRequest({
    ...defaultTripForm(),
    day_start: '09:00',
    day_end: '11:00'
  });
  assert.equal('day_start' in shortHoursReq, false);
  assert.equal('day_end' in shortHoursReq, false);
});

test('serializeDraft and parseDraft round-trip valid drafts and return null on corrupt or wrong-version drafts', () => {
  const form = {
    ...defaultTripForm(),
    days: 4,
    travel_date: '2026-12-25',
    has_children: true,
    must_visit: [{ id: 'p-1', name: 'Dinh Độc Lập', district: 'Quận 1' }]
  };
  const serialized = serializeDraft({ form, step: 'style', sentence: '4 ngày 25/12 có con nhỏ' });
  const parsed = parseDraft(serialized);

  assert.ok(parsed);
  assert.equal(parsed.version, DRAFT_VERSION);
  assert.equal(parsed.step, 'style');
  assert.equal(parsed.sentence, '4 ngày 25/12 có con nhỏ');
  assert.equal(parsed.form.days, 4);
  assert.equal(parsed.form.travel_date, '2026-12-25');
  assert.equal(parsed.form.has_children, true);
  assert.deepEqual(parsed.form.must_visit, [{ id: 'p-1', name: 'Dinh Độc Lập', district: 'Quận 1' }]);

  // Corrupt JSON, wrong version, missing form, non-string
  assert.equal(parseDraft('{invalid json'), null);
  assert.equal(parseDraft(''), null);
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft(JSON.stringify({ version: 999, form, step: 'trip' })), null);
  assert.equal(parseDraft(JSON.stringify({ version: DRAFT_VERSION, step: 'trip' })), null);
  assert.equal(parseDraft(JSON.stringify({ version: DRAFT_VERSION, form: [], step: 'trip' })), null);
});

test('normalizePlaceResult handles both backend and local catalog shapes', () => {
  assert.deepEqual(
    normalizePlaceResult({ id: 'plc-1', name: 'Palace', name_vi: 'Dinh Độc Lập', district: 'Quận 1' }),
    { id: 'plc-1', name: 'Dinh Độc Lập', district: 'Quận 1' }
  );
  assert.deepEqual(
    normalizePlaceResult({ place_id: 'p-cho-ben-thanh', place_name: 'Chợ Bến Thành', district: 'Quận 1' }),
    { id: 'p-cho-ben-thanh', name: 'Chợ Bến Thành', district: 'Quận 1' }
  );
  assert.equal(normalizePlaceResult({}), null);
});
