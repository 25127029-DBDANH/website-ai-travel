import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTripSentence } from '../src/lib/sentenceParser.js';
import { applyParsedToForm, buildAiRequest, defaultTripForm, derivePace } from '../src/lib/tripFormLogic.js';
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
import { suggestTransport } from '../src/lib/tripOptions.js';

const NOW = new Date('2026-11-24T02:00:00Z'); // 2026-11-24 (Tue) in Asia/Ho_Chi_Minh

test('WIZARD_STEPS defines the 4 steps in order, last one optional', () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => s.id),
    ['when_where', 'who', 'vibe', 'finetune']
  );
  assert.equal(WIZARD_STEPS.at(-1).optional, true);
  // Phương tiện chuyển sang bước "Ai đi cùng".
  assert.ok(WIZARD_STEPS.find((s) => s.id === 'who').fields.includes('transport_mode'));
});

test('validateStep validates every step including travel_date bounds and >= 4h daily window', () => {
  const base = defaultTripForm();

  // Step 1: when_where
  assert.deepEqual(validateStep('when_where', base, { now: NOW }), {});
  assert.deepEqual(validateStep('when_where', { ...base, travel_date: '2026-11-23' }, { now: NOW }), {});
  assert.deepEqual(validateStep('when_where', { ...base, travel_date: '2027-11-24' }, { now: NOW }), {});
  assert.equal(validateStep('when_where', { ...base, start_location: '   ' }, { now: NOW }).start_location, 'start');
  assert.equal(validateStep('when_where', { ...base, days: 0 }, { now: NOW }).days, 'days');
  assert.equal(validateStep('when_where', { ...base, days: 15 }, { now: NOW }).days, 'days');
  assert.equal(validateStep('when_where', { ...base, travel_date: '2026-11-22' }, { now: NOW }).travel_date, 'travel_date');
  assert.equal(validateStep('when_where', { ...base, travel_date: '2027-11-25' }, { now: NOW }).travel_date, 'travel_date');
  assert.equal(validateStep('when_where', { ...base, travel_date: '2026-02-30' }, { now: NOW }).travel_date, 'travel_date');

  // Step 2: who
  assert.deepEqual(validateStep('who', base), {});
  assert.equal(validateStep('who', { ...base, companions: 'invalid' }).companions, 'companions');
  assert.equal(validateStep('who', { ...base, companions: 'family', group_size: 1 }).group_size, 'group_size');
  assert.equal(validateStep('who', { ...base, companions: 'friends', group_size: 21 }).group_size, 'group_size');

  // Step 3: vibe (interests 1–5 + budget)
  assert.deepEqual(validateStep('vibe', base), {});
  assert.equal(validateStep('vibe', { ...base, interests: [] }).interests, 'interests');
  assert.equal(validateStep('vibe', { ...base, budget: 0 }).budget, 'budget');
  assert.equal(validateStep('vibe', base, { budgetDraft: '' }).budget, 'budget');
  assert.equal(validateStep('vibe', base, { budgetDraft: '-50000' }).budget, 'budget');

  // Step 4: finetune (optional, validates bounds + day hours >= 4h)
  assert.deepEqual(validateStep('finetune', base), {});
  assert.equal(validateStep('finetune', { ...base, day_start: '09:00', day_end: '' }).day_end, 'day_hours_incomplete');
  assert.equal(validateStep('finetune', { ...base, day_start: '', day_end: '18:00' }).day_start, 'day_hours_incomplete');
  assert.equal(validateStep('finetune', { ...base, day_start: '09:00', day_end: '12:59' }).day_end, 'day_hours_min');
  assert.equal(validateStep('finetune', { ...base, day_start: '18:00', day_end: '09:00' }).day_end, 'day_hours_min');
  assert.deepEqual(validateStep('finetune', { ...base, day_start: '09:00', day_end: '13:00' }), {});
  assert.equal(validateStep('finetune', { ...base, day_start: '25:00', day_end: '29:00' }).day_start, 'day_hours');
  const sixPlaces = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, district: 'Quận 1' }));
  assert.equal(validateStep('finetune', { ...base, must_visit: sixPlaces }).must_visit, 'must_visit');
  assert.equal(validateStep('finetune', { ...base, custom_notes: 'a'.repeat(501) }).special_notes, 'special_notes');
  assert.equal(
    validateStep('finetune', { ...base, avoid_districts: ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7'] }).avoid_districts,
    'avoid_districts'
  );
});

test('stepStatus and firstIncompleteStep jump to vibe when complete or first missing step after quick fill', () => {
  const base = defaultTripForm();
  assert.deepEqual(stepStatus(base, { now: NOW }), {
    when_where: 'complete',
    who: 'complete',
    vibe: 'complete',
    finetune: 'complete'
  });

  assert.equal(firstIncompleteStep({ ...base, budget: 0 }), 'vibe');
  assert.equal(firstIncompleteStep({ ...base, start_location: '' }), 'when_where');
  assert.equal(firstIncompleteStep({ ...base, day_start: '09:00' }), 'finetune');
  assert.equal(firstIncompleteStep(base), 'vibe');

  // Full quick-fill sentence -> step with "Build now" + live summary
  const fullParsed = parseTripSentence('2 ngày ở Quận 1 với gia đình 4 người, 3 triệu, thích ăn uống và cà phê', NOW);
  assert.equal(firstIncompleteStep(applyParsedToForm(base, fullParsed).form, fullParsed), 'vibe');

  // Missing group info -> who
  const noGroupParsed = parseTripSentence('2 ngày ở Quận 1, 2 triệu, thích cà phê', NOW);
  assert.equal(firstIncompleteStep(applyParsedToForm(base, noGroupParsed).form, noGroupParsed), 'who');

  // Missing days -> stays on when_where
  const missingDaysParsed = parseTripSentence('Muốn đi ăn vặt và cà phê ở Quận 1', NOW);
  assert.equal(firstIncompleteStep(applyParsedToForm(base, missingDaysParsed).form, missingDaysParsed), 'when_where');
});

test('autoAdjustments eases pace for children/elderly, swaps walk for limited mobility, suggests transport', () => {
  const packed = { ...defaultTripForm(), pace_override: 'packed' };

  const withChildren = autoAdjustments(packed, { ...packed, has_children: true });
  assert.equal(withChildren.form.pace_override, null);
  assert.equal(derivePace(withChildren.form), 'relaxed');
  assert.deepEqual(withChildren.notices, ['form.notice.paceRelaxed']);

  // Elderly also triggers the grab_car suggestion.
  const withElderly = autoAdjustments(packed, { ...packed, has_elderly: true });
  assert.equal(withElderly.form.pace_override, null);
  assert.equal(derivePace(withElderly.form), 'relaxed');
  assert.equal(withElderly.form.transport_mode, 'grab_car');
  assert.deepEqual(withElderly.notices, ['form.notice.paceRelaxed', 'form.notice.transportSuggested']);

  // User explicitly setting packed pace when has_children was already true is respected
  const explicit = autoAdjustments(
    { ...defaultTripForm(), has_children: true, pace_override: null },
    { ...defaultTripForm(), has_children: true, pace_override: 'packed' }
  );
  assert.equal(explicit.form.pace_override, 'packed');
  assert.equal(derivePace(explicit.form), 'packed');
  assert.deepEqual(explicit.notices, []);

  // Limited mobility disables walk and switches to grab_car (even if chosen manually)
  const walking = { ...defaultTripForm(), transport_mode: 'walk', transport_manual: true };
  const limited = autoAdjustments(walking, { ...walking, mobility: 'limited' });
  assert.equal(limited.form.transport_mode, 'grab_car');
  assert.deepEqual(limited.notices, ['form.notice.transportGrabCar']);

  // Suggestion: limited mobility → grab_car; solo/couple → grab_bike
  const friendsCar = { ...defaultTripForm(), companions: 'friends', group_size: 4, transport_mode: 'grab_car' };
  const toCouple = autoAdjustments(friendsCar, { ...friendsCar, companions: 'couple', group_size: 2 });
  assert.equal(toCouple.form.transport_mode, 'grab_bike');
  const limitedBike = autoAdjustments(defaultTripForm(), { ...defaultTripForm(), mobility: 'limited' });
  assert.equal(limitedBike.form.transport_mode, 'grab_car');
  assert.equal(suggestTransport({ companions: 'family', mobility: 'normal' }), null);

  // A manual pick is never overridden by a suggestion.
  const manualPublic = { ...defaultTripForm(), transport_mode: 'public', transport_manual: true };
  const elderlyManual = autoAdjustments(manualPublic, { ...manualPublic, has_elderly: true });
  assert.equal(elderlyManual.form.transport_mode, 'public');
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
    interests: ['history', 'markets'],
    pace_override: 'packed',
    template_pace: 'moderate',
    must_visit: [{ id: 'p-1', name: 'Dinh Độc Lập', district: 'Quận 1' }]
  };
  const serialized = serializeDraft({ form, step: 'vibe', sentence: '4 ngày 25/12 có con nhỏ' });
  const parsed = parseDraft(serialized);

  assert.ok(parsed);
  assert.equal(DRAFT_VERSION, 3);
  assert.equal(parsed.version, DRAFT_VERSION);
  assert.equal(parsed.step, 'vibe');
  assert.equal(parsed.sentence, '4 ngày 25/12 có con nhỏ');
  assert.equal(parsed.form.days, 4);
  assert.equal(parsed.form.travel_date, '2026-12-25');
  assert.equal(parsed.form.has_children, true);
  assert.deepEqual(parsed.form.interests, ['history', 'markets']);
  assert.equal(parsed.form.pace_override, 'packed');
  assert.equal(parsed.form.template_pace, 'moderate');
  assert.equal('vibe_energy' in parsed.form, false);
  assert.equal('vibe_spend' in parsed.form, false);
  assert.deepEqual(parsed.form.must_visit, [{ id: 'p-1', name: 'Dinh Độc Lập', district: 'Quận 1' }]);

  // Intro screen is a valid draft step; unknown steps fall back to it.
  assert.equal(parseDraft(serializeDraft({ form, step: 'start' })).step, 'start');
  assert.equal(parseDraft(JSON.stringify({ version: DRAFT_VERSION, form, step: 'nope' })).step, 'start');

  // Corrupt JSON, wrong version, missing form, non-string
  assert.equal(parseDraft('{invalid json'), null);
  assert.equal(parseDraft(''), null);
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft(JSON.stringify({ version: 999, form, step: 'when_where' })), null);
  assert.equal(parseDraft(JSON.stringify({ version: DRAFT_VERSION, step: 'when_where' })), null);
  assert.equal(parseDraft(JSON.stringify({ version: DRAFT_VERSION, form: [], step: 'when_where' })), null);
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
