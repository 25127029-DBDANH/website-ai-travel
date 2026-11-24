import { preferenceOptions } from '../i18n/translations.js';
import {
  BUDGET_PER_PERSON_PER_DAY,
  defaultTripForm,
  FORM_DIETARY,
  isValidTravelDate,
  MAX_AVOID_DISTRICTS,
  MAX_MUST_VISIT,
  rawSpecialNotes,
  validateDayHours
} from './tripFormLogic.js';
import { DISTRICTS, TRIP_OPTION_VALUES } from './tripOptions.js';

export const DRAFT_STORAGE_KEY = 'saigon_guide_trip_draft_v1';
export const DRAFT_VERSION = 1;

export const ERROR_ELEMENT_IDS = [
  ['start_location', 'trip-start'],
  ['days', 'trip-days'],
  ['travel_date', 'trip-travel-date'],
  ['companions', 'trip-companions'],
  ['group_size', 'trip-group-size'],
  ['budget', 'trip-budget'],
  ['preferences', 'trip-preferences'],
  ['day_start', 'trip-day-start'],
  ['day_end', 'trip-day-end'],
  ['must_visit', 'trip-must-visit'],
  ['special_notes', 'trip-special-notes']
];

export const WIZARD_STEPS = [
  { id: 'trip', fields: ['travel_date', 'days', 'start_location'] },
  { id: 'group', fields: ['companions', 'group_size', 'has_children', 'has_elderly', 'mobility'] },
  { id: 'budget', fields: ['budget', 'budget_preset'] },
  { id: 'style', fields: ['preferences', 'pace', 'day_start', 'day_end', 'prefer_indoor'] },
  {
    id: 'constraints',
    fields: ['transport_mode', 'dietary', 'avoid_districts', 'must_visit', 'custom_notes', 'quick_notes']
  },
  { id: 'review', fields: [] }
];

export const WIZARD_STEP_IDS = WIZARD_STEPS.map((step) => step.id);

export function stepIndexOf(stepId) {
  const index = WIZARD_STEP_IDS.indexOf(stepId);
  return index === -1 ? 0 : index;
}

export function normalizePlaceResult(place) {
  if (!place || typeof place !== 'object') return null;
  const id = place.id ?? place.place_id;
  const name = place.name_vi || place.place_name || place.name;
  if (!id || !name) return null;
  return {
    id: String(id),
    name: String(name),
    district: String(place.district || '')
  };
}

export function validateStep(stepId, form, { budgetDraft = null, now = new Date() } = {}) {
  const errors = {};
  if (!form || typeof form !== 'object') return errors;

  switch (stepId) {
    case 'trip': {
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
      break;
    }

    case 'group': {
      if (!TRIP_OPTION_VALUES.companions.includes(form.companions)) {
        errors.companions = 'companions';
      }
      const isGroupType = form.companions === 'friends' || form.companions === 'family';
      if (
        !Number.isInteger(form.group_size) ||
        form.group_size < 1 ||
        form.group_size > 20 ||
        (isGroupType && form.group_size < 2)
      ) {
        errors.group_size = 'group_size';
      }
      break;
    }

    case 'budget': {
      const budgetValue = budgetDraft !== null ? Number(String(budgetDraft).trim()) : form.budget;
      if (
        (budgetDraft !== null && !String(budgetDraft).trim()) ||
        !Number.isFinite(budgetValue) ||
        budgetValue <= 0 ||
        budgetValue > 1_000_000_000
      ) {
        errors.budget = 'budget';
      }
      break;
    }

    case 'style': {
      if (!Array.isArray(form.preferences) || form.preferences.length === 0) {
        errors.preferences = 'preferences';
      }
      Object.assign(errors, validateDayHours(form.day_start, form.day_end));
      break;
    }

    case 'constraints': {
      if (Array.isArray(form.must_visit) && form.must_visit.length > MAX_MUST_VISIT) {
        errors.must_visit = 'must_visit';
      }
      if (Array.isArray(form.avoid_districts) && form.avoid_districts.length > MAX_AVOID_DISTRICTS) {
        errors.avoid_districts = 'avoid_districts';
      }
      if (rawSpecialNotes(form.quick_notes, form.custom_notes).length > 500) {
        errors.special_notes = 'special_notes';
      }
      break;
    }

    case 'review':
    default:
      break;
  }

  return errors;
}

export function stepStatus(form, options = {}) {
  const status = {};
  let allPriorComplete = true;

  for (const step of WIZARD_STEPS) {
    if (step.id === 'review') {
      status.review = allPriorComplete ? 'complete' : 'incomplete';
      continue;
    }
    const valid = Object.keys(validateStep(step.id, form, options)).length === 0;
    status[step.id] = valid ? 'complete' : 'incomplete';
    if (!valid) allPriorComplete = false;
  }

  return status;
}

export function firstIncompleteStep(form, parsed = null, options = {}) {
  const status = stepStatus(form, options);
  const dataSteps = WIZARD_STEPS.filter((step) => step.id !== 'review');

  for (const step of dataSteps) {
    if (status[step.id] === 'incomplete') return step.id;
  }

  if (parsed && typeof parsed === 'object') {
    if (!parsed.days) return 'trip';
    if (!parsed.companions && !parsed.group_size && !parsed.has_children && !parsed.has_elderly) {
      return 'group';
    }
    if (!parsed.budget) return 'budget';
    if (!Array.isArray(parsed.preferences) || parsed.preferences.length === 0) return 'style';
  }

  return 'review';
}

export function findStepForErrors(errors) {
  if (!errors || typeof errors !== 'object') return null;
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  for (const step of WIZARD_STEPS) {
    if (step.id === 'review') continue;
    if (
      step.fields.some((field) => errorKeys.includes(field)) ||
      (step.id === 'constraints' && errorKeys.includes('special_notes'))
    ) {
      return step.id;
    }
  }
  return 'trip';
}

export function autoAdjustments(prev, next) {
  const adjusted = { ...next };
  const notices = [];

  const familyFlagTurnedOn =
    (!prev?.has_children && Boolean(adjusted.has_children)) ||
    (!prev?.has_elderly && Boolean(adjusted.has_elderly));

  if (familyFlagTurnedOn && adjusted.pace === 'packed') {
    adjusted.pace = 'relaxed';
    notices.push('form.notice.paceRelaxed');
  }

  if (adjusted.mobility === 'limited' && adjusted.transport_mode === 'walk') {
    adjusted.transport_mode = 'grab_car';
    notices.push('form.notice.transportGrabCar');
  }

  return { form: adjusted, notices };
}

export function serializeDraft({ form, step, sentence = '' }) {
  return JSON.stringify({
    version: DRAFT_VERSION,
    form,
    step: WIZARD_STEP_IDS.includes(step) ? step : WIZARD_STEPS[0].id,
    sentence: String(sentence || '')
  });
}

export function parseDraft(raw, fallbackStartLocation) {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object' || data.version !== DRAFT_VERSION) return null;
  if (!data.form || typeof data.form !== 'object' || Array.isArray(data.form)) return null;

  const base = defaultTripForm(fallbackStartLocation);
  const f = data.form;
  const step = WIZARD_STEP_IDS.includes(data.step) ? data.step : WIZARD_STEPS[0].id;

  const mustVisit = Array.isArray(f.must_visit)
    ? f.must_visit
        .map(normalizePlaceResult)
        .filter(Boolean)
        .filter((item, idx, list) => list.findIndex((other) => other.id === item.id) === idx)
        .slice(0, MAX_MUST_VISIT)
    : [];

  const form = {
    ...base,
    start_location: typeof f.start_location === 'string' ? f.start_location : base.start_location,
    days: Number.isInteger(f.days) && f.days >= 1 && f.days <= 14 ? f.days : base.days,
    travel_date: typeof f.travel_date === 'string' ? f.travel_date : '',
    companions: TRIP_OPTION_VALUES.companions.includes(f.companions) ? f.companions : base.companions,
    group_size:
      Number.isInteger(f.group_size) && f.group_size >= 1 && f.group_size <= 20
        ? f.group_size
        : base.group_size,
    has_children: Boolean(f.has_children),
    has_elderly: Boolean(f.has_elderly),
    mobility: f.mobility === 'limited' ? 'limited' : 'normal',
    budget:
      Number.isFinite(Number(f.budget)) && Number(f.budget) >= 0
        ? Math.round(Number(f.budget))
        : base.budget,
    budget_preset:
      f.budget_preset === null || BUDGET_PER_PERSON_PER_DAY.includes(f.budget_preset)
        ? f.budget_preset
        : null,
    preferences: Array.isArray(f.preferences)
      ? f.preferences.filter((pref) => preferenceOptions.includes(pref))
      : base.preferences,
    pace: TRIP_OPTION_VALUES.pace.includes(f.pace) ? f.pace : base.pace,
    day_start: typeof f.day_start === 'string' ? f.day_start : '',
    day_end: typeof f.day_end === 'string' ? f.day_end : '',
    prefer_indoor: Boolean(f.prefer_indoor),
    transport_mode: TRIP_OPTION_VALUES.transport_mode.includes(f.transport_mode)
      ? f.transport_mode
      : base.transport_mode,
    dietary: Array.isArray(f.dietary)
      ? f.dietary.filter((item) => FORM_DIETARY.includes(item))
      : [],
    avoid_districts: Array.isArray(f.avoid_districts)
      ? f.avoid_districts.filter((d) => DISTRICTS.includes(d)).slice(0, MAX_AVOID_DISTRICTS)
      : [],
    must_visit: mustVisit,
    quick_notes: Array.isArray(f.quick_notes)
      ? f.quick_notes.filter((note) => TRIP_OPTION_VALUES.quick_notes.includes(note))
      : [],
    custom_notes: typeof f.custom_notes === 'string' ? f.custom_notes : ''
  };

  return {
    version: DRAFT_VERSION,
    form,
    step,
    sentence: typeof data.sentence === 'string' ? data.sentence : ''
  };
}

export function readSessionDraft(fallbackStartLocation) {
  try {
    return parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY), fallbackStartLocation);
  } catch {
    return null;
  }
}

export function writeSessionDraft(draft) {
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft));
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

export function clearSessionDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors in private browsing.
  }
}

export function focusFirstErrorField(errors) {
  const match = ERROR_ELEMENT_IDS.find(([key]) => errors?.[key]);
  if (match && typeof document !== 'undefined') {
    requestAnimationFrame(() => document.getElementById(match[1])?.focus());
  }
}
