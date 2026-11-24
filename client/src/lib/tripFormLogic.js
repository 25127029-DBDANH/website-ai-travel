import { preferenceOptions } from '../i18n/translations.js';
import {
  AI_TRANSPORT_MODE,
  CATALOG_DISTRICTS,
  defaultTripOptions,
  DISTRICTS,
  normalizeCompanion,
  normalizeTransportMode,
  PLACES_PER_DAY_BY_PACE,
  TRIP_OPTION_VALUES
} from './tripOptions.js';

export { AI_TRANSPORT_MODE, CATALOG_DISTRICTS, PLACES_PER_DAY_BY_PACE };

export const BUDGET_PER_PERSON_PER_DAY = [500_000, 1_000_000, 2_000_000];
export const DEFAULT_BUDGET_PER_PERSON_PER_DAY = 1_000_000;
export const FORM_DIETARY = ['vegetarian', 'vegan', 'no_seafood', 'no_spicy', 'nut_allergy'];
export const MAX_AVOID_DISTRICTS = 3;
export const GROUP_COMPANIONS = ['family', 'friends'];
export const LONG_TRIP_DAYS = 5;

export const QUICK_NOTE_LABELS = {
  ac_preferred: 'Ưu tiên máy lạnh/trong nhà',
  limited_walking: 'Hạn chế đi bộ xa'
};

export const PREFERENCE_CATEGORY = {
  food: 'food',
  culture: 'sightseeing',
  cafe: 'cafe',
  shopping: 'shopping',
  nature: 'nature',
  nightlife: 'entertainment'
};

export const ADVANCED_KEYS = ['transport_mode', 'pace', 'dietary', 'avoid_districts'];

export function compactVnd(value, lang = 'vi') {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function toggleListValue(list, item) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export function countCustomizedAdvanced(form) {
  return (
    (form.pace !== 'moderate' ? 1 : 0) +
    (form.transport_mode !== 'grab_bike' ? 1 : 0) +
    (form.dietary.length > 0 ? 1 : 0) +
    (form.avoid_districts.length > 0 ? 1 : 0) +
    (form.quick_notes.length > 0 || form.custom_notes.trim() ? 1 : 0)
  );
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
        case 'preferences':
          return t('form.field.preferences', {
            value: form.preferences.map((pref) => t(`preference.${pref}`)).join(', ')
          });
        case 'transport_mode':
          return t('form.field.transport_mode', {
            value: t(`form.option.transport_mode.${form.transport_mode}`)
          });
        case 'pace':
          return t('form.field.pace', { value: t(`form.option.pace.${form.pace}`) });
        case 'dietary':
          return t('form.field.dietary', {
            value: form.dietary.map((item) => t(`form.option.dietary.${item}`)).join(', ')
          });
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

export function defaultTripForm(startLocation = 'Quận 1, TP. Hồ Chí Minh') {
  const days = 3;
  const group_size = 1;
  const budget_preset = DEFAULT_BUDGET_PER_PERSON_PER_DAY;
  return {
    ...defaultTripOptions(),
    start_location: startLocation,
    days,
    group_size,
    budget_preset,
    budget: budgetPresetTotal(budget_preset, days, group_size),
    preferences: ['food', 'cafe']
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

export function buildSpecialNotes(quickNotes = [], customNotes = '') {
  const parts = (quickNotes || [])
    .map((id) => QUICK_NOTE_LABELS[id])
    .filter(Boolean);
  const trimmed = String(customNotes || '').trim();
  if (trimmed) parts.push(trimmed);
  return parts.join(', ').slice(0, 500);
}

function parsedPatch(parsed) {
  const patch = {};
  if (parsed.start_location) patch.start_location = parsed.start_location;
  if (parsed.days) patch.days = parsed.days;
  if (parsed.budget) {
    patch.budget = parsed.budget;
    patch.budget_preset = null;
  }
  if (parsed.preferences?.length) {
    const validPrefs = parsed.preferences.filter((pref) => preferenceOptions.includes(pref));
    if (validPrefs.length) patch.preferences = validPrefs;
  }
  if (parsed.transportation) {
    patch.transport_mode = normalizeTransportMode(parsed.transportation);
  }
  if (parsed.pace && TRIP_OPTION_VALUES.pace.includes(parsed.pace)) {
    patch.pace = parsed.pace;
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
  const displayKeys = Object.keys(patch).filter((key) => key !== 'budget_preset');
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

export function validateTripForm(form, budgetDraft = null) {
  const errors = {};
  const start = String(form.start_location || '').trim();
  if (!start || start.length > 200) {
    errors.start_location = 'start';
  }
  if (!Number.isInteger(form.days) || form.days < 1 || form.days > 14) {
    errors.days = 'days';
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

  if (!Array.isArray(form.preferences) || form.preferences.length === 0) {
    errors.preferences = 'preferences';
  }

  const notes = buildSpecialNotes(form.quick_notes, form.custom_notes);
  if (notes.length > 500) {
    errors.special_notes = 'special_notes';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function buildAiRequest(form) {
  const start_location = String(form.start_location || '').trim();
  const companion = normalizeCompanion(form.companions);
  const member_count = clampGroupSize(companion, form.group_size);
  const pace = TRIP_OPTION_VALUES.pace.includes(form.pace) ? form.pace : 'moderate';
  const transport_mode = normalizeTransportMode(form.transport_mode);
  const days = Math.min(14, Math.max(1, Math.round(Number(form.days) || 1)));
  const preferences = (form.preferences || []).filter((pref) => preferenceOptions.includes(pref));
  const dietary = (form.dietary || []).filter((item) => TRIP_OPTION_VALUES.dietary.includes(item));
  const avoid_districts = (form.avoid_districts || [])
    .filter((district) => DISTRICTS.includes(district))
    .slice(0, MAX_AVOID_DISTRICTS);

  return {
    start_location,
    budget: Math.round(Number(form.budget) || 0),
    days,
    districts: [districtFromStartLocation(start_location)],
    places_per_day: PLACES_PER_DAY_BY_PACE[pace] || 4,
    companion,
    member_count,
    transport_mode,
    preferences,
    pace,
    special_notes: buildSpecialNotes(form.quick_notes, form.custom_notes),
    dietary,
    avoid_districts
  };
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
