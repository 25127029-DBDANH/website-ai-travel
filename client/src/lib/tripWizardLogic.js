import {
  BUDGET_PER_PERSON_PER_DAY,
  defaultTripForm,
  derivePace,
  FORM_DIETARY,
  isValidInterestList,
  isValidTravelDate,
  MAX_AVOID_DISTRICTS,
  MAX_MUST_VISIT,
  migrateLegacyForm,
  normalizeDaySchedules,
  rawSpecialNotes,
  sanitizeInterests,
  validateDayHours,
  validateDaySchedules
} from './tripFormLogic.js';
import {
  DISTRICTS,
  suggestTransport,
  TRIP_OPTION_VALUES
} from './tripOptions.js';

export const DRAFT_STORAGE_KEY = 'saigon_guide_trip_draft_v1';
// v3 (T-054): bỏ 2 thanh trượt vibe_energy/vibe_spend, dùng pace_override (null = tự động) + template_pace.
export const DRAFT_VERSION = 3;
const LEGACY_DRAFT_VERSIONS = [1, 2];

// Màn mở đầu (mẫu chuyến + 1 câu) đứng trước 4 bước, không tính vào thanh tiến độ.
export const INTRO_STEP = 'start';

// Thứ tự = thứ tự hiển thị, để focus đúng ô lỗi đầu tiên.
export const ERROR_ELEMENT_IDS = [
  ['days', 'trip-days'],
  ['travel_date', 'trip-travel-date'],
  ['start_location', 'trip-start'],
  ['companions', 'trip-companions'],
  ['group_size', 'trip-group-size'],
  ['interests', 'trip-interests'],
  ['budget', 'trip-budget'],
  ['must_visit', 'trip-must-visit'],
  ['avoid_districts', 'trip-avoid-districts'],
  ['day_start', 'trip-day-start'],
  ['day_end', 'trip-day-end'],
  ['special_notes', 'trip-special-notes']
];

export const WIZARD_STEPS = [
  { id: 'when_where', fields: ['days', 'travel_date', 'start_location'] },
  {
    id: 'who',
    fields: ['companions', 'group_size', 'has_children', 'has_elderly', 'mobility', 'transport_mode']
  },
  { id: 'vibe', fields: ['interests', 'budget', 'budget_preset'] },
  {
    id: 'finetune',
    optional: true,
    fields: [
      'pace_override',
      'must_visit',
      'avoid_districts',
      'dietary',
      'day_start',
      'day_end',
      'day_schedules',
      'prefer_indoor',
      'custom_notes',
      'special_notes'
    ]
  }
];

export const WIZARD_STEP_IDS = WIZARD_STEPS.map((step) => step.id);

// Bước có nút "Tạo lịch trình ngay".
export const SUBMIT_STEP_IDS = ['vibe', 'finetune'];

const LEGACY_STEP_MAP = {
  trip: 'when_where',
  group: 'who',
  budget: 'vibe',
  style: 'vibe',
  constraints: 'finetune',
  review: 'vibe'
};

export function stepIndexOf(stepId) {
  const index = WIZARD_STEP_IDS.indexOf(stepId);
  return index === -1 ? 0 : index;
}

// Enter trong lúc gõ tiếng Việt (Telex/VNI qua IME) chỉ là xác nhận ký tự, không phải submit.
export function isImeComposing(event) {
  if (!event) return false;
  return Boolean(
    event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.which === 229
  );
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

function budgetError(form, budgetDraft) {
  const budgetValue = budgetDraft !== null ? Number(String(budgetDraft).trim()) : form.budget;
  return (
    (budgetDraft !== null && !String(budgetDraft).trim()) ||
    !Number.isFinite(budgetValue) ||
    budgetValue <= 0 ||
    budgetValue > 1_000_000_000
  );
}

export function validateStep(stepId, form, { budgetDraft = null, now = new Date() } = {}) {
  const errors = {};
  if (!form || typeof form !== 'object') return errors;

  switch (stepId) {
    case 'when_where': {
      if (!Number.isInteger(form.days) || form.days < 1 || form.days > 14) {
        errors.days = 'days';
      }
      if (!isValidTravelDate(form.travel_date, now)) {
        errors.travel_date = 'travel_date';
      }
      const start = String(form.start_location || '').trim();
      if (!start || start.length > 200) {
        errors.start_location = 'start';
      }
      break;
    }

    case 'who': {
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

    case 'vibe': {
      if (!isValidInterestList(form.interests)) {
        errors.interests = 'interests';
      }
      if (budgetError(form, budgetDraft)) {
        errors.budget = 'budget';
      }
      break;
    }

    case 'finetune': {
      if (Array.isArray(form.must_visit) && form.must_visit.length > MAX_MUST_VISIT) {
        errors.must_visit = 'must_visit';
      }
      if (Array.isArray(form.avoid_districts) && form.avoid_districts.length > MAX_AVOID_DISTRICTS) {
        errors.avoid_districts = 'avoid_districts';
      }
      Object.assign(errors, validateDayHours(form.day_start, form.day_end));
      Object.assign(errors, validateDaySchedules(form.day_schedules, form.days));
      if (rawSpecialNotes(form.custom_notes).length > 500) {
        errors.special_notes = 'special_notes';
      }
      break;
    }

    default:
      break;
  }

  return errors;
}

export function stepStatus(form, options = {}) {
  const status = {};
  for (const step of WIZARD_STEPS) {
    const valid = Object.keys(validateStep(step.id, form, options)).length === 0;
    status[step.id] = valid ? 'complete' : 'incomplete';
  }
  return status;
}

// Bước nên mở sau khi điền nhanh / áp mẫu. Đủ thông tin thì về bước "vibe" — nơi có nút tạo ngay
// và thẻ tóm tắt bên cạnh đóng vai trò "xem lại".
export function firstIncompleteStep(form, parsed = null, options = {}) {
  const status = stepStatus(form, options);
  for (const step of WIZARD_STEPS) {
    if (status[step.id] === 'incomplete') return step.id;
  }

  if (parsed && typeof parsed === 'object') {
    if (!parsed.days) return 'when_where';
    if (!parsed.companions && !parsed.group_size && !parsed.has_children && !parsed.has_elderly) {
      return 'who';
    }
  }

  return 'vibe';
}

export function findStepForErrors(errors) {
  if (!errors || typeof errors !== 'object') return null;
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  for (const step of WIZARD_STEPS) {
    if (step.fields.some((field) => errorKeys.includes(field))) return step.id;
  }
  return WIZARD_STEPS[0].id;
}

export function autoAdjustments(prev, next) {
  const adjusted = { ...next };
  const notices = [];

  const careFlagTurnedOn =
    (!prev?.has_children && Boolean(adjusted.has_children)) ||
    (!prev?.has_elderly && Boolean(adjusted.has_elderly)) ||
    (prev?.mobility !== 'limited' && adjusted.mobility === 'limited');

  // Có trẻ nhỏ / người lớn tuổi / hạn chế đi bộ mà đang nhịp khám phá nhiều thì trả về tự động (thong thả).
  if (careFlagTurnedOn && derivePace(prev) === 'packed') {
    if (adjusted.pace_override === 'packed') adjusted.pace_override = null;
    notices.push('form.notice.paceRelaxed');
  }

  if (adjusted.mobility === 'limited' && adjusted.transport_mode === 'walk') {
    adjusted.transport_mode = 'grab_car';
    notices.push('form.notice.transportGrabCar');
  } else if (!adjusted.transport_manual) {
    const groupChanged =
      prev?.mobility !== adjusted.mobility ||
      Boolean(prev?.has_elderly) !== Boolean(adjusted.has_elderly) ||
      prev?.companions !== adjusted.companions;
    const suggested = suggestTransport(adjusted);
    if (groupChanged && suggested && suggested !== adjusted.transport_mode) {
      adjusted.transport_mode = suggested;
      notices.push('form.notice.transportSuggested');
    }
  }

  return { form: adjusted, notices };
}

export function serializeDraft({ form, step, sentence = '' }) {
  return JSON.stringify({
    version: DRAFT_VERSION,
    form,
    step: WIZARD_STEP_IDS.includes(step) || step === INTRO_STEP ? step : INTRO_STEP,
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

  if (!data || typeof data !== 'object') return null;
  if (data.version !== DRAFT_VERSION && !LEGACY_DRAFT_VERSIONS.includes(data.version)) return null;
  if (!data.form || typeof data.form !== 'object' || Array.isArray(data.form)) return null;

  const base = defaultTripForm(fallbackStartLocation);
  // Draft v1 (preferences/pace/quick_notes) và v2 (vibe_energy/vibe_spend) → chuyển sang v3 trước khi kiểm.
  const f = LEGACY_DRAFT_VERSIONS.includes(data.version) ? migrateLegacyForm(data.form) : data.form;
  const rawStep = data.version === 1 ? LEGACY_STEP_MAP[data.step] : data.step;
  const step = WIZARD_STEP_IDS.includes(rawStep) || rawStep === INTRO_STEP ? rawStep : INTRO_STEP;

  const mustVisit = Array.isArray(f.must_visit)
    ? f.must_visit
        .map(normalizePlaceResult)
        .filter(Boolean)
        .filter((item, idx, list) => list.findIndex((other) => other.id === item.id) === idx)
        .slice(0, MAX_MUST_VISIT)
    : [];

  const interests = sanitizeInterests(f.interests);

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
    interests: Array.isArray(f.interests) ? interests : base.interests,
    pace_override: TRIP_OPTION_VALUES.pace.includes(f.pace_override) ? f.pace_override : null,
    template_pace: TRIP_OPTION_VALUES.pace.includes(f.template_pace) ? f.template_pace : null,
    day_start: typeof f.day_start === 'string' ? f.day_start : '',
    day_end: typeof f.day_end === 'string' ? f.day_end : '',
    day_schedules: normalizeDaySchedules(f.day_schedules, Number.isInteger(f.days) ? f.days : base.days),
    prefer_indoor: Boolean(f.prefer_indoor),
    transport_mode: TRIP_OPTION_VALUES.transport_mode.includes(f.transport_mode)
      ? f.transport_mode
      : base.transport_mode,
    transport_manual: Boolean(f.transport_manual),
    dietary: Array.isArray(f.dietary)
      ? f.dietary.filter((item) => FORM_DIETARY.includes(item))
      : [],
    avoid_districts: Array.isArray(f.avoid_districts)
      ? f.avoid_districts.filter((d) => DISTRICTS.includes(d)).slice(0, MAX_AVOID_DISTRICTS)
      : [],
    must_visit: mustVisit,
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
