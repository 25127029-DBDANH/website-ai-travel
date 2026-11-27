import { preferenceOptions } from '../i18n/translations.js';
import {
  addDateDays,
  AI_TRANSPORT_MODE,
  CATALOG_DISTRICTS,
  DEFAULT_STAY_LOCATION,
  defaultTripOptions,
  DISTRICTS,
  ENERGY_FOR_PACE,
  hcmcDate,
  INTEREST_KEYS,
  INTERESTS,
  LEGACY_PREFERENCE_INTERESTS,
  MAX_INTERESTS,
  normalizeCompanion,
  normalizeTransportMode,
  paceFromEnergy,
  PLACES_PER_DAY_BY_PACE,
  TRIP_OPTION_VALUES,
  TRIP_TEMPLATES
} from './tripOptions.js';

export { AI_TRANSPORT_MODE, CATALOG_DISTRICTS, PLACES_PER_DAY_BY_PACE };

export const BUDGET_PER_PERSON_PER_DAY = [500_000, 1_000_000, 2_000_000];
export const DEFAULT_BUDGET_PER_PERSON_PER_DAY = 1_000_000;
export const FORM_DIETARY = ['vegetarian', 'vegan', 'no_seafood', 'no_spicy', 'nut_allergy'];
export const MAX_AVOID_DISTRICTS = 3;
export const MAX_MUST_VISIT = 5;
export const MIN_DAY_HOURS_MINUTES = 240;
export const GROUP_COMPANIONS = ['family', 'friends'];
export const LONG_TRIP_DAYS = 5;

export const DEFAULT_INTERESTS = ['street_food', 'cafe_hopping'];

export function compactVnd(value, lang = 'vi') {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function toggleListValue(list, item) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

// Suy ra vibe_spend (20/50/80) gửi backend theo mức ngân sách mỗi người mỗi ngày.
export function spendFromBudget(budget, days = 1, groupSize = 1) {
  const total = Number(budget);
  if (!Number.isFinite(total) || total <= 0) return 50;
  const safeDays = Math.max(1, Math.round(Number(days) || 1));
  const safeGroup = Math.max(1, Math.round(Number(groupSize) || 1));
  const perPersonPerDay = total / (safeDays * safeGroup);
  if (perPersonPerDay <= 600_000) return 20;
  if (perPersonPerDay <= 1_200_000) return 50;
  return 80;
}

// Nhịp độ tự suy ra khi người dùng chưa chỉnh tay (pace_override = null).
export function autoDerivedPace(form) {
  if (!form || typeof form !== 'object') return 'moderate';
  if (form.has_children || form.has_elderly || form.mobility === 'limited') return 'relaxed';
  if (TRIP_OPTION_VALUES.pace.includes(form.template_pace)) return form.template_pace;
  return 'moderate';
}

// Nhịp độ hiệu lực: ưu tiên pace_override nếu người dùng đã tự chọn.
export function derivePace(form) {
  if (TRIP_OPTION_VALUES.pace.includes(form?.pace_override)) return form.pace_override;
  return autoDerivedPace(form);
}

export function sanitizeInterests(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((key, index) => INTEREST_KEYS.includes(key) && list.indexOf(key) === index)
    .slice(0, MAX_INTERESTS);
}

// Hợp các giá trị `legacy` của mọi interest đã chọn, giữ thứ tự xuất hiện.
export function preferencesFromInterests(interests) {
  const result = [];
  for (const key of sanitizeInterests(interests)) {
    const entry = INTERESTS.find((item) => item.key === key);
    for (const pref of entry?.legacy || []) {
      if (preferenceOptions.includes(pref) && !result.includes(pref)) result.push(pref);
    }
  }
  return result;
}

// Map ngược preferences cũ → interests. Lấy xen kẽ để mỗi preference có ít nhất 1 interest
// trước khi chạm trần MAX_INTERESTS.
export function interestsFromPreferences(preferences) {
  const prefs = (Array.isArray(preferences) ? preferences : []).filter(
    (pref, index, list) => preferenceOptions.includes(pref) && list.indexOf(pref) === index
  );
  const lists = prefs.map((pref) => LEGACY_PREFERENCE_INTERESTS[pref] || []);
  const result = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let round = 0; round < longest; round += 1) {
    for (const list of lists) {
      const key = list[round];
      if (key && !result.includes(key) && result.length < MAX_INTERESTS) result.push(key);
    }
  }
  return result;
}

// Chuyển field cũ (draft v1/v2, form cũ) sang field mới. Không ghi đè field mới đã có.
export function migrateLegacyForm(form) {
  if (!form || typeof form !== 'object') return form;
  const next = { ...form };
  if (!Array.isArray(next.interests)) {
    const fromPrefs = interestsFromPreferences(next.preferences);
    next.interests = fromPrefs.length ? fromPrefs : [...DEFAULT_INTERESTS];
  }
  if (!TRIP_OPTION_VALUES.pace.includes(next.pace_override)) {
    if (TRIP_OPTION_VALUES.pace.includes(next.pace)) {
      next.pace_override = next.pace;
    } else if (
      next.vibe_energy !== undefined &&
      next.vibe_energy !== null &&
      next.vibe_energy !== '' &&
      Number.isFinite(Number(next.vibe_energy))
    ) {
      next.pace_override = paceFromEnergy(Number(next.vibe_energy));
    } else {
      next.pace_override = null;
    }
  }
  if (!TRIP_OPTION_VALUES.pace.includes(next.template_pace)) {
    next.template_pace = null;
  }
  // quick_notes trùng ý đã bỏ: ac_preferred → prefer_indoor, limited_walking → mobility.
  const quickNotes = Array.isArray(next.quick_notes) ? next.quick_notes : [];
  if (quickNotes.includes('ac_preferred')) next.prefer_indoor = true;
  if (quickNotes.includes('limited_walking')) next.mobility = 'limited';
  delete next.quick_notes;
  delete next.preferences;
  delete next.pace;
  delete next.vibe_energy;
  delete next.vibe_spend;
  return next;
}

// Áp mẫu chuyến (mục 3 hợp đồng) lên form hiện tại.
export function applyTripTemplate(form, templateKey) {
  const template = TRIP_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) return form;
  const base = migrateLegacyForm(form);
  const next = {
    ...base,
    days: template.days,
    start_location: `${template.district}, TP. Hồ Chí Minh`,
    interests: [...template.interests],
    template_pace: template.pace || null,
    pace_override: null,
    day_start: template.day_start || '',
    day_end: template.day_end || ''
  };
  if (template.companions) {
    next.companions = template.companions;
    next.group_size = clampGroupSize(template.companions, template.group_size ?? 4);
    next.has_children = Boolean(template.has_children);
    next.has_elderly = Boolean(template.has_elderly);
  }
  const tier = template.budget_preset ?? DEFAULT_BUDGET_PER_PERSON_PER_DAY;
  next.budget_preset = tier;
  next.budget = budgetPresetTotal(tier, next.days, next.group_size || 1);
  return next;
}

export function describeFilledFields(keys, form, t, formatVndFn, lang) {
  return keys
    .map((key) => {
      switch (key) {
        case 'start_location':
          return t('form.field.start_location', { value: form.start_location.split(',')[0] });
        case 'days':
          return t('form.field.days', { value: form.days });
        case 'companions':
          return t('form.field.companions', { value: t(`form.option.companions.${form.companions}`) });
        case 'group_size':
          return t('form.field.group_size', { value: form.group_size });
        case 'budget':
          return t('form.field.budget', { value: formatVndFn(form.budget, lang) });
        case 'interests':
          return t('form.field.preferences', {
            value: (form.interests || []).map((key) => t(`form.interest.${key}`)).join(', ')
          });
        case 'transport_mode':
          return t('form.field.transport_mode', {
            value: t(`form.option.transport_mode.${form.transport_mode}`)
          });
        case 'pace_override':
          return form.pace_override
            ? t('form.field.pace', { value: t(`form.option.pace.${form.pace_override}`) })
            : null;
        case 'dietary':
          return t('form.field.dietary', {
            value: form.dietary.map((item) => t(`form.option.dietary.${item}`)).join(', ')
          });
        case 'travel_date':
          return form.travel_date ? t('form.field.travel_date', { value: form.travel_date }) : null;
        case 'has_children':
          return form.has_children ? t('form.field.has_children') : null;
        case 'has_elderly':
          return form.has_elderly ? t('form.field.has_elderly') : null;
        case 'avoid_districts':
          return t('form.field.avoid_districts', { value: form.avoid_districts.join(', ') });
        default:
          return null;
      }
    })
    .filter(Boolean);
}

export function missingParsedLabels(parsed, t) {
  return [
    !parsed.days ? t('form.sentence.missingDays') : null,
    !parsed.budget ? t('form.sentence.missingBudget') : null,
    parsed.preferences.length === 0 ? t('form.sentence.missingPreferences') : null
  ].filter(Boolean);
}

export function budgetPresetTotal(perPersonPerDay, days, groupSize) {
  return perPersonPerDay * Math.max(1, Math.round(days)) * Math.max(1, Math.round(groupSize));
}

export function defaultTripForm(startLocation = DEFAULT_STAY_LOCATION) {
  const days = 3;
  const group_size = 1;
  const budget_preset = DEFAULT_BUDGET_PER_PERSON_PER_DAY;
  return {
    ...defaultTripOptions(),
    start_location: startLocation,
    days,
    travel_date: '',
    day_start: '',
    day_end: '',
    has_children: false,
    has_elderly: false,
    mobility: 'normal',
    prefer_indoor: false,
    transport_manual: false,
    must_visit: [],
    group_size,
    budget_preset,
    budget: budgetPresetTotal(budget_preset, days, group_size),
    interests: [...DEFAULT_INTERESTS],
    pace_override: null,
    template_pace: null
  };
}

export function nextBudget(raw, previous) {
  const text = String(raw ?? '').trim();
  if (!text) return previous;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return previous;
  return Math.round(value);
}

export function clampGroupSize(companions, size) {
  const normalized = normalizeCompanion(companions);
  if (normalized === 'solo') return 1;
  if (normalized === 'couple') return 2;
  const value = Number.isFinite(size) ? Math.round(size) : 4;
  return Math.min(20, Math.max(2, value));
}

export function companionsPatch(current, nextCompanions) {
  const companions = normalizeCompanion(nextCompanions);
  const currentCompanion = normalizeCompanion(current.companions);
  const keepSize = GROUP_COMPANIONS.includes(currentCompanion) && GROUP_COMPANIONS.includes(companions);
  const group_size = keepSize ? clampGroupSize(companions, current.group_size) : clampGroupSize(companions, 4);
  const patch = { companions, group_size };
  if (current.budget_preset != null) {
    patch.budget = budgetPresetTotal(current.budget_preset, current.days || 1, group_size);
  }
  return patch;
}

export function daysPatch(current, nextDays) {
  const days = Math.min(14, Math.max(1, Math.round(Number(nextDays) || 1)));
  const patch = { days };
  if (current.budget_preset != null) {
    patch.budget = budgetPresetTotal(current.budget_preset, days, current.group_size || 1);
  }
  return patch;
}

export function groupSizePatch(current, nextSize) {
  const group_size = clampGroupSize(current.companions, nextSize);
  const patch = { group_size };
  if (current.budget_preset != null) {
    patch.budget = budgetPresetTotal(current.budget_preset, current.days || 1, group_size);
  }
  return patch;
}

export function budgetPresetPatch(current, perPersonPerDay) {
  return {
    budget_preset: perPersonPerDay,
    budget: budgetPresetTotal(perPersonPerDay, current.days || 1, current.group_size || 1)
  };
}

export function customBudgetPatch(current, raw) {
  return {
    budget_preset: null,
    budget: nextBudget(raw, current.budget)
  };
}

export function districtFromStartLocation(startLocation) {
  const value = String(startLocation || '').toLocaleLowerCase('vi-VN');
  const matches = [
    [/thủ\s*đức|thảo\s*điền|quận\s*2|q\.?\s*2\b|quận\s*9|q\.?\s*9\b/, 'Thủ Đức'],
    [/bình\s*thạnh/, 'Bình Thạnh'],
    [/phú\s*nhuận/, 'Phú Nhuận'],
    [/quận\s*7|q\.?\s*7\b|district\s*7/, 'Quận 7'],
    [/quận\s*5|q\.?\s*5\b|district\s*5|chợ\s*lớn/, 'Quận 5'],
    [/quận\s*4|q\.?\s*4\b|district\s*4/, 'Quận 4'],
    [/quận\s*3|q\.?\s*3\b|district\s*3/, 'Quận 3'],
    [/quận\s*1|q\.?\s*1\b|district\s*1/, 'Quận 1']
  ];
  return matches.find(([pattern]) => pattern.test(value))?.[1] || 'Quận 1';
}

export function rawSpecialNotes(customNotes = '') {
  return String(customNotes || '').trim();
}

export function buildSpecialNotes(customNotes = '') {
  return rawSpecialNotes(customNotes).slice(0, 500);
}

function parsedPatch(parsed) {
  const patch = {};
  if (parsed.start_location) patch.start_location = parsed.start_location;
  if (parsed.days) patch.days = parsed.days;
  if (parsed.travel_date) patch.travel_date = parsed.travel_date;
  if (parsed.has_children) patch.has_children = true;
  if (parsed.has_elderly) patch.has_elderly = true;
  if (parsed.budget) {
    patch.budget = parsed.budget;
    patch.budget_preset = null;
  }
  if (parsed.preferences?.length) {
    const interests = interestsFromPreferences(parsed.preferences);
    if (interests.length) patch.interests = interests;
  }
  if (parsed.transportation) {
    patch.transport_mode = normalizeTransportMode(parsed.transportation);
    patch.transport_manual = true;
  }
  if (parsed.pace && TRIP_OPTION_VALUES.pace.includes(parsed.pace)) {
    patch.pace_override = parsed.pace;
  }
  const dietary = (parsed.dietary || []).filter((value) => FORM_DIETARY.includes(value));
  if (dietary.length) patch.dietary = dietary;

  const avoid = (parsed.avoid_districts || [])
    .filter((district) => DISTRICTS.includes(district))
    .slice(0, MAX_AVOID_DISTRICTS);
  if (avoid.length) patch.avoid_districts = avoid;

  let companions = parsed.companions ? normalizeCompanion(parsed.companions) : null;
  const size = parsed.group_size || null;
  if (!companions && size) companions = size > 1 ? 'friends' : 'solo';
  if (companions) {
    patch.companions = companions;
    patch.group_size =
      companions === 'solo' || companions === 'couple'
        ? clampGroupSize(companions)
        : clampGroupSize(companions, size ?? 4);
    if (companions === 'solo' && size > 1) {
      patch.companions = 'friends';
      patch.group_size = clampGroupSize('friends', size);
    }
  }
  return patch;
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Undo the previous parse for fields the user has not touched since, then apply the new one.
export function applyParsedToForm(form, parsed, lastParse = null) {
  const base = { ...form };
  if (lastParse) {
    const revertKeys = lastParse.revertKeys || lastParse.keys;
    for (const key of revertKeys) {
      if (sameValue(base[key], lastParse.after[key])) {
        base[key] = lastParse.before[key];
      }
    }
  }

  const patch = parsedPatch(parsed);
  const displayKeys = Object.keys(patch).filter((key) => key !== 'budget_preset' && key !== 'transport_manual');
  const next = { ...base, ...patch };

  // Keep preset-linked budget in sync if the sentence changed days/group_size without setting a budget.
  if (!('budget' in patch) && next.budget_preset != null) {
    next.budget = budgetPresetTotal(next.budget_preset, next.days, next.group_size);
  }

  const revertKeys = Object.keys(patch);
  if (!('budget' in patch) && next.budget !== base.budget) {
    revertKeys.push('budget');
  }

  return {
    form: next,
    parse: {
      keys: displayKeys,
      revertKeys,
      before: Object.fromEntries(revertKeys.map((key) => [key, base[key]])),
      after: Object.fromEntries(revertKeys.map((key) => [key, next[key]]))
    }
  };
}

export function parseTimeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isValidTravelDate(dateStr, now = new Date()) {
  const value = String(dateStr || '').trim();
  if (!value) return true;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return false;
  }
  const today = hcmcDate(now);
  const minDate = addDateDays(today, -1);
  const maxDate = addDateDays(today, 365);
  return value >= minDate && value <= maxDate;
}

export function validateDayHours(dayStart, dayEnd) {
  const start = String(dayStart || '').trim();
  const end = String(dayEnd || '').trim();
  if (!start && !end) return {};
  if (start && !end) return { day_end: 'day_hours_incomplete' };
  if (!start && end) return { day_start: 'day_hours_incomplete' };

  const startMins = parseTimeToMinutes(start);
  const endMins = parseTimeToMinutes(end);
  const errors = {};
  if (startMins === null) errors.day_start = 'day_hours';
  if (endMins === null) errors.day_end = 'day_hours';
  if (Object.keys(errors).length > 0) return errors;
  if (endMins - startMins < MIN_DAY_HOURS_MINUTES) {
    return { day_end: 'day_hours_min' };
  }
  return {};
}

export function isValidInterestList(interests) {
  return (
    Array.isArray(interests) &&
    interests.length >= 1 &&
    interests.length <= MAX_INTERESTS &&
    sanitizeInterests(interests).length === interests.length
  );
}

export function validateTripForm(form, budgetDraft = null, now = new Date()) {
  const errors = {};
  const start = String(form.start_location || '').trim();
  if (!start || start.length > 200) {
    errors.start_location = 'start';
  }
  if (!Number.isInteger(form.days) || form.days < 1 || form.days > 14) {
    errors.days = 'days';
  }
  if (!isValidTravelDate(form.travel_date, now)) {
    errors.travel_date = 'travel_date';
  }
  if (!Number.isInteger(form.group_size) || form.group_size < 1 || form.group_size > 20) {
    errors.group_size = 'group_size';
  }

  const budgetValue = budgetDraft !== null ? Number(String(budgetDraft).trim()) : form.budget;
  if (
    (budgetDraft !== null && !String(budgetDraft).trim()) ||
    !Number.isFinite(budgetValue) ||
    budgetValue <= 0 ||
    budgetValue > 1_000_000_000
  ) {
    errors.budget = 'budget';
  }

  if (!isValidInterestList(form.interests)) {
    errors.interests = 'interests';
  }

  Object.assign(errors, validateDayHours(form.day_start, form.day_end));

  if (Array.isArray(form.must_visit) && form.must_visit.length > MAX_MUST_VISIT) {
    errors.must_visit = 'must_visit';
  }

  if (Array.isArray(form.avoid_districts) && form.avoid_districts.length > MAX_AVOID_DISTRICTS) {
    errors.avoid_districts = 'avoid_districts';
  }

  if (rawSpecialNotes(form.custom_notes).length > 500) {
    errors.special_notes = 'special_notes';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function buildAiRequest(rawForm) {
  const legacyPreferences = Array.isArray(rawForm?.preferences) ? rawForm.preferences : [];
  const form = migrateLegacyForm(rawForm);
  const start_location = String(form.start_location || '').trim();
  const companion = normalizeCompanion(form.companions);
  const member_count = clampGroupSize(companion, form.group_size);
  const interests = sanitizeInterests(form.interests);
  const pace = derivePace(form);
  const vibe_energy = ENERGY_FOR_PACE[pace] ?? 50;
  const transport_mode = normalizeTransportMode(form.transport_mode);
  const days = Math.min(14, Math.max(1, Math.round(Number(form.days) || 1)));
  const budget = Math.round(Number(form.budget) || 0);
  const vibe_spend = spendFromBudget(budget, days, member_count);
  let preferences = preferencesFromInterests(interests);
  if (preferences.length === 0) {
    preferences = legacyPreferences.filter((pref) => preferenceOptions.includes(pref));
  }
  const dietary = (form.dietary || []).filter((item) => TRIP_OPTION_VALUES.dietary.includes(item));
  const avoid_districts = (form.avoid_districts || [])
    .filter((district) => DISTRICTS.includes(district))
    .slice(0, MAX_AVOID_DISTRICTS);

  const req = {
    start_location,
    budget,
    days,
    districts: [districtFromStartLocation(start_location)],
    places_per_day: PLACES_PER_DAY_BY_PACE[pace] || 4,
    companion,
    member_count,
    transport_mode,
    preferences,
    pace,
    interests,
    vibe_energy,
    vibe_spend,
    special_notes: buildSpecialNotes(form.custom_notes),
    dietary,
    avoid_districts
  };

  const travelDate = String(form.travel_date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    req.travel_date = travelDate;
  }

  const dayStart = String(form.day_start || '').trim();
  const dayEnd = String(form.day_end || '').trim();
  if (
    dayStart &&
    dayEnd &&
    Object.keys(validateDayHours(dayStart, dayEnd)).length === 0
  ) {
    req.day_start = dayStart;
    req.day_end = dayEnd;
  }

  if (form.has_children === true) req.has_children = true;
  if (form.has_elderly === true) req.has_elderly = true;
  if (form.mobility === 'limited') req.mobility = 'limited';
  if (form.prefer_indoor === true) req.prefer_indoor = true;

  const mustVisitIds = [];
  for (const item of form.must_visit || []) {
    const id = typeof item === 'string' ? item.trim() : String(item?.id ?? item?.place_id ?? '').trim();
    if (id && !mustVisitIds.includes(id)) mustVisitIds.push(id);
    if (mustVisitIds.length >= MAX_MUST_VISIT) break;
  }
  if (mustVisitIds.length > 0) {
    req.must_visit_ids = mustVisitIds;
  }

  return req;
}

export function buildTripCreatePayload(aiRequest, generated, source = 'form') {
  const tripPayload = {
    ...aiRequest,
    group_type: aiRequest.companion,
    source
  };
  if (generated?.itinerary_items?.length) {
    tripPayload.itinerary_items = generated.itinerary_items;
  }
  return tripPayload;
}

export function canUseLocalItineraryFallback(error) {
  return (
    error?.code === 'AI_UNAVAILABLE' ||
    error?.status === 0 ||
    [408, 429, 500, 502, 503, 504].includes(error?.status)
  );
}

export function makeFallbackConcept(tripRequest, error, formatVndFn, lang) {
  const district = tripRequest.districts.join(', ');
  return {
    source: 'fallback',
    summary:
      lang === 'vi'
        ? `Chuyến đi ${tripRequest.days} ngày, ưu tiên ${tripRequest.preferences.join(', ')} tại ${district}, trong ngân sách ${formatVndFn(tripRequest.budget, lang)}.`
        : `A ${tripRequest.days}-day trip focused on ${tripRequest.preferences.join(', ')} in ${district}, within a ${formatVndFn(tripRequest.budget, lang)} budget.`,
    highlights: [],
    recommended_districts: tripRequest.districts,
    route_overview: district,
    confirmation_question:
      lang === 'vi'
        ? 'Gemini hiện không khả dụng. Bạn muốn tiếp tục với lịch trình dự phòng không?'
        : 'Gemini is unavailable. Would you like to continue with a fallback itinerary?',
    fallback_reason: error?.message || ''
  };
}
