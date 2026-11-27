// T-044: form lịch trình mới (mẫu chuyến, 4 bước, sở thích có ảnh, thanh vibe, tóm tắt sống).
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { translations } from '../src/i18n/translations.js';
import {
  applyTripTemplate,
  buildAiRequest,
  defaultTripForm,
  derivePace,
  interestsFromPreferences,
  migrateLegacyForm,
  preferencesFromInterests,
  spendFromBudget,
  validateTripForm
} from '../src/lib/tripFormLogic.js';
import {
  INTEREST_KEYS,
  paceFromEnergy,
  STAY_AREAS,
  TRIP_OPTION_VALUES,
  TRIP_TEMPLATES
} from '../src/lib/tripOptions.js';
import { DRAFT_VERSION, isImeComposing, parseDraft } from '../src/lib/tripWizardLogic.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
const { api, setUseBackend, resetMatchCountSupport, normalizeMatchCount } = await import('../src/lib/api.js');

test('interests → preferences: union of legacy values, deduped, in first-seen order', () => {
  assert.equal(INTEREST_KEYS.length, 18);
  assert.deepEqual(preferencesFromInterests(['street_food', 'local_classics']), ['food']);
  assert.deepEqual(preferencesFromInterests(['seafood_nhau']), ['food', 'nightlife']);
  assert.deepEqual(preferencesFromInterests(['chinatown', 'history']), ['culture', 'food']);
  assert.deepEqual(preferencesFromInterests(['cafe_hopping', 'coffee_retro', 'rooftop_night']), ['cafe', 'nightlife']);
  assert.deepEqual(preferencesFromInterests(['markets', 'riverside', 'parks', 'family_fun']), ['shopping', 'nature']);
  assert.deepEqual(preferencesFromInterests(['photo_spots', 'local_life', 'french_architecture']), ['culture']);
  // Key lạ bị bỏ, không văng lỗi
  assert.deepEqual(preferencesFromInterests(['food', 'unknown']), []);
  assert.deepEqual(preferencesFromInterests(null), []);
});

test('preferences → interests (reverse map for sentence parser) follows the contract and caps at 5', () => {
  assert.deepEqual(interestsFromPreferences(['food']), ['street_food', 'local_classics']);
  assert.deepEqual(interestsFromPreferences(['culture']), ['history', 'french_architecture']);
  assert.deepEqual(interestsFromPreferences(['cafe']), ['cafe_hopping']);
  assert.deepEqual(interestsFromPreferences(['shopping']), ['markets']);
  assert.deepEqual(interestsFromPreferences(['nature']), ['riverside', 'parks']);
  assert.deepEqual(interestsFromPreferences(['nightlife']), ['nightlife_street']);
  // Lấy xen kẽ: mỗi preference có ít nhất 1 interest trước khi chạm trần 5
  assert.deepEqual(interestsFromPreferences(['food', 'culture', 'nature']), [
    'street_food',
    'history',
    'riverside',
    'local_classics',
    'french_architecture'
  ]);
  const all = interestsFromPreferences(['food', 'culture', 'cafe', 'shopping', 'nature']);
  assert.equal(all.length, 5);
  assert.deepEqual(preferencesFromInterests(all), ['food', 'culture', 'cafe', 'shopping', 'nature']);
  assert.deepEqual(interestsFromPreferences(['bogus']), []);
});

test('paceFromEnergy boundaries (v2 migration) and pace_override → pace, places_per_day, vibe_energy', () => {
  assert.equal(paceFromEnergy(0), 'relaxed');
  assert.equal(paceFromEnergy(33), 'relaxed');
  assert.equal(paceFromEnergy(34), 'moderate');
  assert.equal(paceFromEnergy(66), 'moderate');
  assert.equal(paceFromEnergy(67), 'packed');
  assert.equal(paceFromEnergy(100), 'packed');

  const withOverride = (pace_override) => buildAiRequest({ ...defaultTripForm(), pace_override });
  assert.deepEqual([withOverride('relaxed').pace, withOverride('relaxed').places_per_day, withOverride('relaxed').vibe_energy], ['relaxed', 3, 25]);
  assert.deepEqual([withOverride('moderate').pace, withOverride('moderate').places_per_day, withOverride('moderate').vibe_energy], ['moderate', 4, 50]);
  assert.deepEqual([withOverride('packed').pace, withOverride('packed').places_per_day, withOverride('packed').vibe_energy], ['packed', 6, 80]);
});

test('every trip template produces a valid form and keeps identical pace & places_per_day as before', () => {
  assert.equal(TRIP_TEMPLATES.length, 6);
  const expectedPace = {
    first_time: ['moderate', 4, 50, 50],
    food_tour: ['packed', 6, 80, 20],
    couple: ['moderate', 4, 50, 50],
    family: ['relaxed', 3, 25, 50],
    night: ['packed', 6, 80, 50],
    culture: ['moderate', 4, 50, 50]
  };
  for (const template of TRIP_TEMPLATES) {
    const form = applyTripTemplate(defaultTripForm(), template.key);
    const result = validateTripForm(form, null, new Date('2026-11-24T02:00:00Z'));
    assert.equal(result.valid, true, `${template.key}: ${JSON.stringify(result.errors)}`);
    assert.equal(form.days, template.days);
    assert.equal(form.start_location, `${template.district}, TP. Hồ Chí Minh`);
    assert.deepEqual(form.interests, template.interests);
    assert.equal(form.template_pace, template.pace);
    assert.equal(form.pace_override, null);
    assert.equal(form.budget_preset, template.budget_preset);
    const req = buildAiRequest(form);
    assert.deepEqual(req.districts, [template.district]);
    assert.ok(req.preferences.length >= 1);
    assert.deepEqual(
      [req.pace, req.places_per_day, req.vibe_energy, req.vibe_spend],
      expectedPace[template.key],
      template.key
    );
  }

  const family = applyTripTemplate(defaultTripForm(), 'family');
  assert.equal(family.companions, 'family');
  assert.equal(family.group_size, 4);
  assert.equal(family.has_children, true);
  assert.equal(family.budget, 1_000_000 * 2 * 4);

  const night = applyTripTemplate(defaultTripForm(), 'night');
  assert.deepEqual([night.day_start, night.day_end], ['16:00', '23:30']);
  assert.equal(night.companions, 'friends');

  const food = applyTripTemplate(defaultTripForm(), 'food_tour');
  assert.equal(food.budget_preset, 500_000);
  assert.equal(food.companions, 'solo'); // không khai báo → giữ nhóm hiện tại

  // Đổi mẫu: giờ trong ngày, template_pace và cờ gia đình không bị "dính" từ mẫu trước
  const afterNight = applyTripTemplate(night, 'couple');
  assert.deepEqual([afterNight.day_start, afterNight.day_end], ['', '']);
  assert.equal(afterNight.template_pace, 'moderate');
  const afterFamily = applyTripTemplate(family, 'couple');
  assert.equal(afterFamily.has_children, false);
  assert.equal(afterFamily.group_size, 2);
});

test('v1 and v2 drafts are migrated cleanly to v3 without crashing', () => {
  const v1 = JSON.stringify({
    version: 1,
    step: 'style',
    sentence: 'đi 2 ngày',
    form: {
      start_location: 'Quận 3, TP. Hồ Chí Minh',
      days: 2,
      companions: 'couple',
      group_size: 2,
      budget: 4_000_000,
      budget_preset: 1_000_000,
      preferences: ['food', 'nightlife'],
      pace: 'packed',
      transport_mode: 'grab_bike',
      quick_notes: ['ac_preferred', 'limited_walking'],
      custom_notes: 'Thích yên tĩnh'
    }
  });
  const draft = parseDraft(v1);
  assert.ok(draft);
  assert.equal(draft.version, DRAFT_VERSION);
  assert.equal(draft.step, 'vibe');
  assert.deepEqual(draft.form.interests, ['street_food', 'nightlife_street', 'local_classics']);
  assert.equal(draft.form.pace_override, 'packed');
  assert.equal(draft.form.prefer_indoor, true);
  assert.equal(draft.form.mobility, 'limited');
  assert.equal('quick_notes' in draft.form, false);
  assert.equal('preferences' in draft.form, false);
  assert.equal('pace' in draft.form, false);
  assert.equal('vibe_energy' in draft.form, false);
  assert.equal('vibe_spend' in draft.form, false);
  assert.equal(draft.form.custom_notes, 'Thích yên tĩnh');

  // Draft v2 có vibe_energy → chuyển sang pace_override tương ứng, không văng lỗi
  const v2Packed = parseDraft(
    JSON.stringify({
      version: 2,
      step: 'vibe',
      form: { ...defaultTripForm(), vibe_energy: 75, vibe_spend: 20 }
    })
  );
  assert.ok(v2Packed);
  assert.equal(v2Packed.version, 3);
  assert.equal(v2Packed.step, 'vibe');
  assert.equal(v2Packed.form.pace_override, 'packed');
  assert.equal('vibe_energy' in v2Packed.form, false);
  assert.equal('vibe_spend' in v2Packed.form, false);

  const v2Relaxed = parseDraft(
    JSON.stringify({ version: 2, step: 'who', form: { vibe_energy: 20, vibe_spend: 80 } })
  );
  assert.equal(v2Relaxed.form.pace_override, 'relaxed');

  const v2Moderate = parseDraft(
    JSON.stringify({ version: 2, step: 'vibe', form: { vibe_energy: 50 } })
  );
  assert.equal(v2Moderate.form.pace_override, 'moderate');

  const v2Junk = parseDraft(
    JSON.stringify({ version: 2, step: 'vibe', form: { vibe_energy: 'bad', vibe_spend: null } })
  );
  assert.ok(v2Junk);
  assert.equal(v2Junk.form.pace_override, null);

  const stepMap = { trip: 'when_where', group: 'who', budget: 'vibe', constraints: 'finetune', review: 'vibe' };
  for (const [oldStep, newStep] of Object.entries(stepMap)) {
    assert.equal(parseDraft(JSON.stringify({ version: 1, step: oldStep, form: {} })).step, newStep);
  }
  // Rác trong draft cũ không làm văng lỗi
  const junk = parseDraft(JSON.stringify({ version: 1, step: 42, form: { preferences: 'food', quick_notes: 'x' } }));
  assert.equal(junk.step, 'start');
  assert.ok(Array.isArray(junk.form.interests) && junk.form.interests.length > 0);
});

test('buildAiRequest still sends valid pace, places_per_day, vibe_energy, and vibe_spend derived from form', () => {
  const req = buildAiRequest({
    ...defaultTripForm('Quận 5, TP. Hồ Chí Minh'),
    days: 2,
    companions: 'couple',
    group_size: 2,
    budget: 8_000_000, // 2tr/người/ngày → vibe_spend 80
    interests: ['chinatown', 'seafood_nhau', 'nope'],
    pace_override: 'packed'
  });
  assert.deepEqual(req.interests, ['chinatown', 'seafood_nhau']);
  assert.equal(req.vibe_energy, 80);
  assert.equal(req.vibe_spend, 80);
  assert.deepEqual(req.preferences, ['culture', 'food', 'nightlife']);
  assert.equal(req.pace, 'packed');
  assert.equal(req.places_per_day, 6);
  assert.equal(req.start_location, 'Quận 5, TP. Hồ Chí Minh');
  assert.deepEqual(req.districts, ['Quận 5']);

  const defaults = buildAiRequest(defaultTripForm());
  assert.equal(defaults.pace, 'moderate');
  assert.equal(defaults.places_per_day, 4);
  assert.equal(defaults.vibe_energy, 50);
  assert.equal(defaults.vibe_spend, 50);
});

test('spendFromBudget derives 20 / 50 / 80 across the 600k and 1.2M per-person-per-day boundaries', () => {
  assert.equal(spendFromBudget(500_000, 1, 1), 20);
  assert.equal(spendFromBudget(600_000, 1, 1), 20);
  assert.equal(spendFromBudget(600_001, 1, 1), 50);
  assert.equal(spendFromBudget(1_000_000, 1, 1), 50);
  assert.equal(spendFromBudget(1_200_000, 1, 1), 50);
  assert.equal(spendFromBudget(1_200_001, 1, 1), 80);
  assert.equal(spendFromBudget(2_000_000, 1, 1), 80);

  // Chia đều theo số ngày × số người
  assert.equal(spendFromBudget(2_400_000, 2, 2), 20); // 600k/người/ngày
  assert.equal(spendFromBudget(4_800_000, 2, 2), 50); // 1,2tr/người/ngày
  assert.equal(spendFromBudget(5_000_000, 2, 2), 80); // 1,25tr/người/ngày
  assert.equal(spendFromBudget(0, 2, 2), 50);
});

test('derivePace infers from children/elderly/mobility/template and lets pace_override win', () => {
  assert.equal(derivePace(defaultTripForm()), 'moderate');
  assert.equal(derivePace({ ...defaultTripForm(), has_children: true }), 'relaxed');
  assert.equal(derivePace({ ...defaultTripForm(), has_elderly: true }), 'relaxed');
  assert.equal(derivePace({ ...defaultTripForm(), mobility: 'limited' }), 'relaxed');
  assert.equal(derivePace({ ...defaultTripForm(), template_pace: 'packed' }), 'packed');
  assert.equal(derivePace({ ...defaultTripForm(), template_pace: 'packed', has_children: true }), 'relaxed');

  // pace_override luôn thắng giá trị tự động
  assert.equal(derivePace({ ...defaultTripForm(), has_children: true, pace_override: 'packed' }), 'packed');
  assert.equal(derivePace({ ...defaultTripForm(), has_elderly: true, pace_override: 'moderate' }), 'moderate');
  assert.equal(derivePace({ ...defaultTripForm(), mobility: 'limited', pace_override: 'packed' }), 'packed');
  assert.equal(derivePace({ ...defaultTripForm(), pace_override: 'relaxed' }), 'relaxed');
});

test('duplicate quick_notes are gone: ac_preferred → prefer_indoor, limited_walking → mobility', () => {
  assert.equal('quick_notes' in defaultTripForm(), false);
  assert.equal('quick_notes' in TRIP_OPTION_VALUES, false);
  for (const lang of ['vi', 'en']) {
    assert.equal(
      Object.keys(translations[lang]).some((key) => key.startsWith('form.option.quick_notes')),
      false
    );
  }

  const legacy = { ...defaultTripForm(), quick_notes: ['ac_preferred', 'limited_walking'], custom_notes: '' };
  const req = buildAiRequest(legacy);
  assert.equal(req.prefer_indoor, true);
  assert.equal(req.mobility, 'limited');
  assert.equal(req.special_notes, '');
  assert.equal('quick_notes' in migrateLegacyForm(legacy), false);

  const formDir = new URL('../src/components/tripForm/', import.meta.url);
  const sources = [
    readFileSync(new URL('../src/components/TripForm.jsx', import.meta.url), 'utf8'),
    ...readdirSync(formDir).filter((n) => n.endsWith('.jsx')).map((n) => readFileSync(new URL(n, formDir), 'utf8'))
  ].join('\n');
  assert.equal(/quick_notes|ac_preferred|limited_walking/.test(sources), false);
});

test('StepVibe has no vibe_energy/vibe_spend sliders and removed slider i18n keys stay deleted', () => {
  const stepVibeSource = readFileSync(new URL('../src/components/tripForm/StepVibe.jsx', import.meta.url), 'utf8');
  assert.equal(/vibe_energy|vibe_spend/.test(stepVibeSource), false);
  for (const lang of ['vi', 'en']) {
    assert.equal(Object.keys(translations[lang]).some((key) => key.startsWith('form.vibe.')), false);
    assert.equal('form.budgetTier.suggested' in translations[lang], false);
    assert.equal('form.summary.vibe' in translations[lang], false);
  }
});

test('IME guard: Enter while composing Vietnamese (Telex/VNI) is ignored', () => {
  assert.equal(isImeComposing({ key: 'Enter', isComposing: true }), true);
  assert.equal(isImeComposing({ key: 'Enter', nativeEvent: { isComposing: true } }), true);
  assert.equal(isImeComposing({ key: 'Enter', keyCode: 229 }), true);
  assert.equal(isImeComposing({ key: 'Enter', keyCode: 13, nativeEvent: { isComposing: false } }), false);
  assert.equal(isImeComposing(null), false);

  // Mọi handler Enter trong form phải đi qua guard
  const formDir = new URL('../src/components/tripForm/', import.meta.url);
  const files = [
    new URL('../src/components/TripForm.jsx', import.meta.url),
    ...readdirSync(formDir).filter((n) => n.endsWith('.jsx')).map((n) => new URL(n, formDir))
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (/key\s*[!=]==\s*'Enter'/.test(source)) {
      assert.ok(source.includes('isImeComposing(event)'), `${file.pathname} handles Enter without IME guard`);
    }
  }
});

test('api.matchCount hides the counter (null) when backend is off, on 404 or on errors', async () => {
  const realFetch = globalThis.fetch;
  try {
    setUseBackend(false);
    assert.equal(await api.matchCount({ interests: ['street_food'] }), null);

    setUseBackend(true);
    resetMatchCountSupport();
    let calls = 0;
    let lastUrl = '';
    globalThis.fetch = async (url) => {
      calls += 1;
      lastUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ count: 42, samples: [{ id: 1, name_vi: 'Chợ Bến Thành', photo_url: '/images/a.jpg' }] })
      };
    };
    const ok = await api.matchCount({ interests: ['street_food', 'history'], districts: ['Quận 1'] });
    assert.deepEqual(ok, { count: 42, samples: [{ id: '1', name_vi: 'Chợ Bến Thành', photo_url: '/images/a.jpg' }] });
    assert.ok(lastUrl.includes('/api/v1/places/match-count?'));
    assert.equal(new URL(lastUrl).searchParams.get('interests'), 'street_food,history');
    assert.equal(new URL(lastUrl).searchParams.get('districts'), 'Quận 1');

    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    assert.equal(await api.matchCount({ interests: ['street_food'] }), null);

    globalThis.fetch = async () => {
      throw new TypeError('network');
    };
    assert.equal(await api.matchCount({ interests: ['street_food'] }), null);

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return { ok: false, status: 404, json: async () => ({}) };
    };
    assert.equal(await api.matchCount({ interests: ['street_food'] }), null);
    assert.equal(await api.matchCount({ interests: ['history'] }), null);
    assert.equal(calls, 1, '404 = endpoint chưa có → không gọi lại');

    assert.equal(normalizeMatchCount({ count: 'x' }), null);
    assert.equal(normalizeMatchCount({ count: 3, samples: Array(9).fill({ id: 1 }) }).samples.length, 6);
  } finally {
    globalThis.fetch = realFetch;
    resetMatchCountSupport();
    setUseBackend(null);
  }
});

test('every interest, template and stay area has vi/en copy and a local image', () => {
  const keys = [
    ...INTEREST_KEYS.map((k) => `form.interest.${k}`),
    ...TRIP_TEMPLATES.flatMap((tpl) => [`form.template.${tpl.key}.title`, `form.template.${tpl.key}.desc`]),
    ...STAY_AREAS.flatMap((area) => [`form.stay.${area.key}.label`, `form.stay.${area.key}.desc`]),
    'form.stay.custom.label',
    ...['when_where', 'who', 'vibe', 'finetune'].flatMap((id) => [`form.step.${id}.title`, `form.step.${id}.hint`])
  ];
  for (const lang of ['vi', 'en']) {
    for (const key of keys) assert.ok(translations[lang][key], `Missing ${lang}.${key}`);
  }
  assert.equal(translations.vi['form.interest.street_food'], 'Ăn vặt đường phố');
  assert.equal(translations.vi['form.submit'], 'Tạo lịch trình ngay');

  for (const key of INTEREST_KEYS) {
    assert.ok(existsSync(new URL(`../public/images/form/interest-${key}.webp`, import.meta.url)), key);
  }
  for (const { key } of TRIP_TEMPLATES) {
    assert.ok(existsSync(new URL(`../public/images/form/template-${key}.webp`, import.meta.url)), key);
  }
});
