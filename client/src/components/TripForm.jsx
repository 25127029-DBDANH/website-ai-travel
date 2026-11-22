import {
  ArrowRight,
  Bike,
  Car,
  Check,
  Clock,
  Compass,
  Heart,
  Loader2,
  MapPin,
  Minus,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Train,
  User,
  Users,
  Wallet,
  Wand2,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO } from '../demo.jsx';
import { preferenceOptions } from '../i18n/translations.js';
import { api } from '../lib/api.js';
import { getCategoryMeta } from '../lib/categories.jsx';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';
import { parseTripSentence } from '../lib/sentenceParser.js';

const PREFERENCE_CATEGORY = {
  food: 'food',
  culture: 'sightseeing',
  cafe: 'cafe',
  shopping: 'shopping',
  nature: 'nature',
  nightlife: 'entertainment'
};

const BUDGET_PRESETS = [1_500_000, 3_000_000, 5_000_000, 10_000_000];

const DISTRICT_SUGGESTIONS = [
  'Quận 1, TP. Hồ Chí Minh',
  'Quận 3, TP. Hồ Chí Minh',
  'Quận 5 (Khu Chợ Lớn), TP. Hồ Chí Minh',
  'Thảo Điền, TP. Thủ Đức',
  'Bình Thạnh, TP. Hồ Chí Minh',
  'Phú Nhuận, TP. Hồ Chí Minh'
];

const GROUP_OPTIONS = [
  { id: 'solo', label: 'Đi 1 mình', desc: 'Tự do khám phá', icon: User },
  { id: 'couple', label: 'Cặp đôi', desc: 'Lãng mạn & chill', icon: Heart },
  { id: 'friends', label: 'Nhóm bạn', desc: 'Năng động, check-in', icon: Users },
  { id: 'family', label: 'Gia đình', desc: 'Có trẻ / người lớn', icon: Users }
];

const TRANSPORT_OPTIONS = [
  { id: 'motorbike', label: 'Xe máy / GrabBike', desc: 'Len lỏi mọi ngóc ngách', icon: Bike },
  { id: 'grab_car', label: 'Ô tô / GrabCar', desc: 'Mát mẻ & tránh mưa nắng', icon: Car },
  { id: 'metro_walking', label: 'Metro & Đi bộ', desc: 'Trải nghiệm Metro số 1', icon: Train }
];

const PACE_OPTIONS = [
  { id: 'relaxed', label: 'Thong thả', desc: '2 - 3 điểm/ngày, nhiều thời gian cafe nghỉ ngơi' },
  { id: 'moderate', label: 'Cân bằng', desc: '3 - 4 điểm/ngày, lịch trình tiêu chuẩn' },
  { id: 'packed', label: 'Khám phá tối đa', desc: '5 - 6 điểm/ngày, trải nghiệm dày đặc' }
];

const SPECIAL_NOTES = [
  { id: 'ac_preferred', label: 'Ưu tiên máy lạnh/trong nhà', emoji: '❄️' },
  { id: 'vegetarian', label: 'Ăn chay / Thanh tịnh', emoji: '🥗' },
  { id: 'no_spicy', label: 'Không ăn cay', emoji: '🌶️' },
  { id: 'limited_walking', label: 'Hạn chế đi bộ xa', emoji: '🚶' }
];

const PLACES_PER_DAY_BY_PACE = { relaxed: 3, moderate: 4, packed: 6 };
const AI_TRANSPORT_MODE = {
  motorbike: 'grab_bike',
  grab_car: 'grab_car',
  metro_walking: 'public'
};

function districtFromStartLocation(startLocation) {
  const value = startLocation.toLocaleLowerCase('vi-VN');
  const matches = [
    [/thủ\s*đức|thảo\s*điền/, 'Thủ Đức'],
    [/bình\s*thạnh/, 'Bình Thạnh'],
    [/phú\s*nhuận/, 'Phú Nhuận'],
    [/quận\s*7|q\.?\s*7\b/, 'Quận 7'],
    [/quận\s*5|q\.?\s*5\b/, 'Quận 5'],
    [/quận\s*4|q\.?\s*4\b/, 'Quận 4'],
    [/quận\s*3|q\.?\s*3\b/, 'Quận 3'],
    [/quận\s*1|q\.?\s*1\b/, 'Quận 1']
  ];
  return matches.find(([pattern]) => pattern.test(value))?.[1] || 'Quận 1';
}

function specialNotesForAi(noteIds) {
  return noteIds
    .map((id) => SPECIAL_NOTES.find((note) => note.id === id)?.label)
    .filter(Boolean)
    .join(', ');
}

function canUseLocalItineraryFallback(error) {
  return error?.code === 'AI_UNAVAILABLE' || error?.status === 0 ||
    [408, 429, 500, 502, 503, 504].includes(error?.status);
}

function makeFallbackConcept(tripRequest, error, lang) {
  const district = tripRequest.districts.join(', ');
  return {
    source: 'fallback',
    summary: lang === 'vi'
      ? `Chuyến đi ${tripRequest.days} ngày, ưu tiên ${tripRequest.preferences.join(', ')} tại ${district}, trong ngân sách ${formatVnd(tripRequest.budget, lang)}.`
      : `A ${tripRequest.days}-day trip focused on ${tripRequest.preferences.join(', ')} in ${district}, within a ${formatVnd(tripRequest.budget, lang)} budget.`,
    highlights: [],
    recommended_districts: tripRequest.districts,
    route_overview: district,
    confirmation_question: lang === 'vi'
      ? 'Gemini hiện không khả dụng. Bạn muốn tiếp tục với lịch trình dự phòng không?'
      : 'Gemini is unavailable. Would you like to continue with a fallback itinerary?',
    fallback_reason: error?.message || ''
  };
}

export default function TripForm() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState('form');
  const [startLocation, setStartLocation] = useState(() => t('form.startDefault'));
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(3_000_000);
  const [preferences, setPreferences] = useState(['food', 'cafe']);
  const [groupType, setGroupType] = useState('couple');
  const [transportMode, setTransportMode] = useState('motorbike');
  const [pace, setPace] = useState('moderate');
  const [scheduleProfile, setScheduleProfile] = useState('early_bird');
  const [specialNotes, setSpecialNotes] = useState(['ac_preferred']);

  const [sentence, setSentence] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState('');
  const [concept, setConcept] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);

  const defaultStartRef = useRef(t('form.startDefault'));
  const startRef = useRef(null);
  const budgetRef = useRef(null);
  const sentenceRef = useRef(null);

  useEffect(() => {
    const previousDefault = defaultStartRef.current;
    const nextDefault = t('form.startDefault');
    setStartLocation((current) => (current === previousDefault ? nextDefault : current));
    defaultStartRef.current = nextDefault;
  }, [t]);

  const compactVnd = (value) =>
    new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);

  const clearError = () => {
    setError('');
    setErrorField('');
  };

  const showError = (field, message, ref) => {
    setError(message);
    setErrorField(field);
    requestAnimationFrame(() => ref?.current?.focus());
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    clearError();
  };

  const togglePreference = (preference) => {
    setPreferences((current) => {
      if (current.includes(preference)) return current.filter((value) => value !== preference);
      if (current.length >= 4) return current;
      return [...current, preference];
    });
  };

  const toggleSpecialNote = (noteId) => {
    setSpecialNotes((current) =>
      current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]
    );
  };

  const changeDays = (delta) => {
    setDays((current) => Math.min(14, Math.max(1, current + delta)));
    if (errorField === 'days') clearError();
  };

  const applyParsed = (result) => {
    setParsed(result);
    if (result.days) setDays(result.days);
    if (result.budget) setBudget(result.budget);
    if (result.preferences.length > 0) setPreferences(result.preferences);
  };

  const handleSentenceChange = (event) => {
    setSentence(event.target.value);
    setParsed(null);
    clearError();
  };

  const handleParse = () => {
    clearError();
    if (sentence.trim().length < 12) {
      showError('sentence', t('form.sentence.tooShort'), sentenceRef);
      return;
    }
    applyParsed(parseTripSentence(sentence));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    clearError();

    let payloadDays = days;
    let payloadBudget = budget;
    let payloadPreferences = preferences;

    if (mode === 'sentence') {
      if (sentence.trim().length < 12) {
        showError('sentence', t('form.sentence.tooShort'), sentenceRef);
        return;
      }
      const result = parseTripSentence(sentence);
      applyParsed(result);
      if (!result.days && !result.budget && result.preferences.length === 0) {
        showError('sentence', t('form.sentence.parsedNone'), sentenceRef);
        return;
      }
      payloadDays = result.days ?? days;
      payloadBudget = result.budget ?? budget;
      payloadPreferences = result.preferences.length > 0 ? result.preferences : preferences;
    }

    const start = startLocation.trim();
    if (!start) {
      showError('start', t('form.validation.start'), startRef);
      return;
    }
    if (payloadDays < 1 || payloadDays > 14) {
      showError('days', t('form.validation.days'));
      return;
    }
    if (!payloadBudget || payloadBudget <= 0) {
      showError('budget', t('form.validation.budget'), budgetRef);
      return;
    }
    if (payloadPreferences.length === 0) {
      showError('preferences', lang === 'vi' ? 'Hãy chọn ít nhất một sở thích để AI tạo lịch trình.' : 'Choose at least one preference so AI can plan your trip.');
      return;
    }

    setSubmitting(true);
    if (DEMO) {
      navigate('/trip/demo');
      return;
    }
    let tripRequest;
    try {
      tripRequest = {
        start_location: start,
        budget: Math.round(payloadBudget),
        days: payloadDays,
        districts: [districtFromStartLocation(start)],
        places_per_day: PLACES_PER_DAY_BY_PACE[pace] || 4,
        companion: groupType,
        member_count: groupType === 'solo' ? 1 : groupType === 'couple' ? 2 : 4,
        transport_mode: AI_TRANSPORT_MODE[transportMode] || 'grab_bike',
        preferences: payloadPreferences,
        pace,
        special_notes: specialNotesForAi(specialNotes)
      };
      setPendingTrip(tripRequest);
      setSubmissionStage('concept');
      const suggestedConcept = await api.suggestTripConcept(tripRequest);
      setConcept(suggestedConcept);
      setError('');
    } catch (requestError) {
      if (canUseLocalItineraryFallback(requestError)) {
        setPendingTrip(tripRequest);
        setConcept(makeFallbackConcept(tripRequest, requestError, lang));
      } else {
        setError(requestError?.message || translateApiError(t, requestError));
      }
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const handleApproveConcept = async () => {
    if (!pendingTrip || !concept || submitting) return;
    clearError();
    setSubmitting(true);
    setSubmissionStage('generate');
    try {
      let generated;
      if (concept.fallback_reason) {
        generated = { source: 'fallback', itinerary_items: null };
      } else {
        try {
          generated = await api.generateAiItinerary({
            ...pendingTrip,
            approved_concept: concept
          });
        } catch (requestError) {
          if (!canUseLocalItineraryFallback(requestError)) throw requestError;
          generated = { source: 'fallback', itinerary_items: null };
        }
      }
      setSubmissionStage('save');
      const tripPayload = {
        ...pendingTrip,
        group_type: pendingTrip.companion,
        transport_mode: transportMode,
        schedule_profile: scheduleProfile,
        special_notes: specialNotes,
        source: mode === 'sentence' ? 'sentence' : 'form'
      };
      if (generated.itinerary_items?.length) {
        tripPayload.itinerary_items = generated.itinerary_items;
      }
      const trip = await api.createTrip(tripPayload);
      navigate(`/trip/${trip.id}`, {
        state: {
          aiConceptSource: concept.source || 'gemini',
          aiGenerationSource: generated.source || 'gemini'
        }
      });
    } catch (requestError) {
      setError(requestError?.message || translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const hasParsedContent =
    parsed && (parsed.days || parsed.budget || parsed.preferences.length > 0);
  const missing = parsed
    ? [
        !parsed.days ? t('form.sentence.missingDays') : null,
        !parsed.budget ? t('form.sentence.missingBudget') : null,
        parsed.preferences.length === 0 ? t('form.sentence.missingPreferences') : null
      ].filter(Boolean)
    : [];

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-soft backdrop-blur"
      noValidate
    >
      {/* Header Form: Chuyển đổi giữa Form chi tiết & Điền 1 câu */}
      <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => changeMode('form')}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-strong active:scale-[0.98]',
              mode === 'form'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
            aria-pressed={mode === 'form'}
          >
            📋 Lập kế hoạch theo cụm tiêu chí
          </button>
          <button
            type="button"
            onClick={() => changeMode('sentence')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-strong active:scale-[0.98]',
              mode === 'sentence'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
            aria-pressed={mode === 'sentence'}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('form.tab.sentence')}
          </button>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {mode === 'form' ? (
          <>
            {/* 📍 CỤM 1: THÔNG TIN CƠ BẢN */}
            <section className="space-y-4 pt-1">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                  1
                </span>
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  Thông tin cơ bản & Ngân sách
                </h3>
              </div>

              <div>
                <label className="label" htmlFor="trip-start">
                  Nơi ở / Điểm xuất phát tại TP.HCM
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                  <input
                    ref={startRef}
                    id="trip-start"
                    type="text"
                    value={startLocation}
                    onChange={(event) => {
                      setStartLocation(event.target.value);
                      if (errorField === 'start') clearError();
                    }}
                    placeholder={t('form.startPlaceholder')}
                    maxLength={200}
                    className="input pl-10"
                  />
                </div>
                {/* Suggestions chip */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DISTRICT_SUGGESTIONS.slice(0, 4).map((district) => (
                    <button
                      key={district}
                      type="button"
                      onClick={() => setStartLocation(district)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
                    >
                      {district.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span id="trip-days-label" className="label">
                    {t('form.daysLabel')}
                  </span>
                  <div
                    role="group"
                    aria-labelledby="trip-days-label"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => changeDays(-1)}
                      disabled={days <= 1}
                      aria-label={t('form.daysDecrease')}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.94] disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-lg font-extrabold text-slate-900">
                      {t('common.days', { count: days })}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeDays(1)}
                      disabled={days >= 14}
                      aria-label={t('form.daysIncrease')}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:scale-[0.94] disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-slate-600">{t('form.daysHint')}</p>
                </div>

                <div>
                  <label className="label" htmlFor="trip-budget">
                    Tổng ngân sách dự kiến (VND)
                  </label>
                  <div className="relative">
                    <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-500" />
                    <input
                      ref={budgetRef}
                      id="trip-budget"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="50000"
                      value={budget || ''}
                      onChange={(event) => {
                        setBudget(Number(event.target.value));
                        if (errorField === 'budget') clearError();
                      }}
                      className="input pl-10 pr-14 font-semibold"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold tracking-wider text-slate-500">
                      VND
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-slate-600">
                    ≈ {formatVnd(budget, lang)} · Mức chi tiêu tổng chuyến đi
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBudget(value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
                      budget === value
                        ? 'border-accent-400 bg-accent-50 text-accent-700 ring-1 ring-accent-300'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-accent-300 hover:text-accent-700'
                    )}
                  >
                    {compactVnd(value)} ₫
                  </button>
                ))}
              </div>
            </section>

            {/* 👥 CỤM 2: THÀNH PHẦN ĐOÀN & PHƯƠNG TIỆN */}
            <section className="space-y-4 pt-5 border-t border-slate-200/70">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                  2
                </span>
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  Thành phần đoàn & Phương tiện di chuyển
                </h3>
              </div>

              <div>
                <label className="label">Đối tượng chuyến đi</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GROUP_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = groupType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setGroupType(opt.id)}
                        className={cn(
                          'flex flex-col items-start p-2.5 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={cn('h-4 w-4', isSelected ? 'text-brand-600' : 'text-slate-400')} />
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-600" />}
                        </div>
                        <span className="text-xs font-bold leading-tight">{opt.label}</span>
                        <span className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Phương tiện di chuyển chủ đạo</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TRANSPORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = transportMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTransportMode(opt.id)}
                        className={cn(
                          'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <div
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                            isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-tight">{opt.label}</p>
                          <p className="text-[11px] text-slate-600 truncate">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ⚡ CỤM 3: NHỊP ĐỘ & KHUNG GIỜ SINH HOẠT */}
            <section className="space-y-4 pt-5 border-t border-slate-200/70">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                  3
                </span>
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  Nhịp độ & Khung giờ sinh hoạt
                </h3>
              </div>

              <div>
                <label className="label">Nhịp độ chuyến đi (Pace)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PACE_OPTIONS.map((opt) => {
                    const isSelected = pace === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPace(opt.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <span className="text-xs font-bold block">{opt.label}</span>
                        <span className="text-[11px] text-slate-600 mt-0.5 block leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Thói quen sinh hoạt ưu tiên</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleProfile('early_bird')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                      scheduleProfile === 'early_bird'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold leading-tight">Dậy sớm ngắm phố</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">Khởi hành 6h30 - 7h00 sáng</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleProfile('night_owl')}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                      scheduleProfile === 'night_owl'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Moon className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold leading-tight">Cú đêm & Nightlife</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">Hoạt động trưa đến 24h đêm</p>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* 🍜 CỤM 4: SỞ THÍCH & LƯU Ý ĐẶC BIỆT */}
            <section className="space-y-4 pt-5 border-t border-slate-200/70">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                  4
                </span>
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  Sở thích du lịch & Lưu ý sức khỏe / Thời tiết
                </h3>
              </div>

              <div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <span className="label !mb-0">{t('form.preferencesLabel')}</span>
                  <span className="text-xs font-bold text-slate-500">
                    {preferences.length}/4 · Chọn tối đa 4 sở thích
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {preferenceOptions.map((preference) => {
                    const meta = getCategoryMeta(PREFERENCE_CATEGORY[preference]);
                    const Icon = meta.icon;
                    const selected = preferences.includes(preference);
                    const maxed = preferences.length >= 4 && !selected;
                    return (
                      <button
                        key={preference}
                        type="button"
                        onClick={() => togglePreference(preference)}
                        disabled={maxed}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all',
                          selected
                            ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200',
                          maxed && 'cursor-not-allowed opacity-45'
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                            selected ? 'border-white bg-white' : meta.tile
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          {t(`preference.${preference}`)}
                        </span>
                        {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Lưu ý sức khỏe & Thời tiết</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIAL_NOTES.map((note) => {
                    const selected = specialNotes.includes(note.id);
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => toggleSpecialNote(note.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-semibold transition-all',
                          selected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <span className="text-base">{note.emoji}</span>
                        <span className="flex-1 leading-tight text-[11px] font-bold">{note.label}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Sentence Mode giữ nguyên tính năng điền tự nhiên */
          <>
            <div>
              <div className="flex items-end justify-between gap-2">
                <label className="label !mb-0" htmlFor="trip-sentence">
                  {t('form.sentenceLabel')}
                </label>
                <span className="pb-0.5 text-xs font-bold text-slate-500">
                  {t('form.sentenceHint', { count: sentence.length })}
                </span>
              </div>
              <textarea
                ref={sentenceRef}
                id="trip-sentence"
                rows={4}
                maxLength={500}
                value={sentence}
                onChange={handleSentenceChange}
                placeholder={t('form.sentencePlaceholder')}
                className="input mt-2 resize-none leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[t('form.sentence.sample1'), t('form.sentence.sample2')].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setSentence(sample);
                    setParsed(null);
                    clearError();
                  }}
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all"
                >
                  “{sample}”
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleParse}
              className="btn-secondary w-full !py-2.5 text-xs"
            >
              <Wand2 className="h-4 w-4 text-brand-600" />
              {t('form.sentence.extract')}
            </button>

            {parsed && (
              <div
                className={cn(
                  'rounded-2xl border p-3.5 animate-fade-up',
                  hasParsedContent ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
                )}
              >
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em]',
                    hasParsedContent ? 'text-emerald-700' : 'text-amber-700'
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('form.sentence.parsed')}
                </p>

                {hasParsedContent && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parsed.days && (
                      <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800">
                        {t('form.sentence.parsedDays', { count: parsed.days })}
                      </span>
                    )}
                    {parsed.budget && (
                      <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800">
                        {t('form.sentence.parsedBudget', {
                          budget: formatVnd(parsed.budget, lang)
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <p
            id="trip-form-error"
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full !py-4 shadow-lift text-sm font-extrabold">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {submissionStage === 'concept'
                ? (lang === 'vi' ? 'Đang xin concept từ Gemini (có thể mất 15–30 giây)...' : 'Asking Gemini for a trip concept (this may take 15–30 seconds)...')
                : submissionStage === 'generate'
                  ? (lang === 'vi' ? 'Đang tạo lịch trình theo concept...' : 'Creating the itinerary from the approved concept...')
                  : (lang === 'vi' ? 'Đang lưu lịch trình...' : 'Saving your itinerary...')}
            </>
          ) : (
            <>
              Bắt đầu tạo lịch trình du lịch TP.HCM
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </form>
    {concept && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-concept-title"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      >
        <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-brand-50/70 p-5 sm:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[10px] font-bold text-brand-700">
                <Sparkles className="h-3 w-3" />
                {concept.source === 'fallback'
                  ? (lang === 'vi' ? 'Gợi ý dự phòng' : 'Fallback suggestion')
                  : (lang === 'vi' ? 'Đề xuất từ Gemini' : 'Gemini suggestion')}
              </span>
              <h2 id="trip-concept-title" className="mt-2 font-display text-xl font-extrabold text-slate-900">
                {lang === 'vi' ? 'Concept chuyến đi của bạn' : 'Your trip concept'}
              </h2>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => { setConcept(null); setPendingTrip(null); clearError(); }}
              className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-50"
              aria-label={lang === 'vi' ? 'Đóng concept' : 'Close concept'}
            >
              ×
            </button>
          </header>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 sm:p-6">
            {concept.source === 'fallback' && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                {concept.fallback_reason
                  ? (lang === 'vi'
                      ? 'Không kết nối được Gemini. Khi bạn đồng ý, hệ thống sẽ tạo lịch trình dự phòng và báo rõ nguồn kết quả.'
                      : 'Could not reach Gemini. If you approve, the app will create a fallback itinerary and label its source.')
                  : lang === 'vi'
                  ? 'Gemini chưa trả lời được. Đây là concept dự phòng được tạo từ danh sách địa điểm có sẵn.'
                  : 'Gemini did not respond. This fallback concept was created from the available place catalog.'}
              </p>
            )}
            <p className="text-sm leading-relaxed text-slate-700">{concept.summary}</p>

            {concept.highlights?.length > 0 && (
              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{lang === 'vi' ? 'Điểm nổi bật' : 'Highlights'}</h3>
                <ul className="mt-2 space-y-1.5">
                  {concept.highlights.map((highlight, index) => (
                    <li key={`${highlight}-${index}`} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-brand-600">•</span>{highlight}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {concept.recommended_districts?.length > 0 && (
              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{lang === 'vi' ? 'Các quận dự kiến' : 'Recommended districts'}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {concept.recommended_districts.map((district) => (
                    <span key={district} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                      {district}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{lang === 'vi' ? 'Lộ trình gợi ý' : 'Suggested route'}</h3>
              <p className="mt-1 text-sm text-slate-700">{concept.route_overview}</p>
            </section>

            <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
              {concept.confirmation_question}
            </p>
            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}
            {submitting && (
              <p role="status" className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {submissionStage === 'generate'
                  ? (lang === 'vi' ? 'Gemini đang xếp các điểm tham quan...' : 'Gemini is arranging your stops...')
                  : (lang === 'vi' ? 'Đang lưu lịch trình của bạn...' : 'Saving your itinerary...')}
              </p>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
            <button
              type="button"
              disabled={submitting}
              onClick={() => { setConcept(null); setPendingTrip(null); clearError(); }}
              className="btn-secondary"
            >
              {lang === 'vi' ? 'Để sau' : 'Not now'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleApproveConcept}
              className="btn-primary"
            >
              {submitting
                ? (lang === 'vi' ? 'Đang xử lý...' : 'Working...')
                : (lang === 'vi' ? 'Đồng ý, tạo lịch trình' : 'Approve and create itinerary')}
              {!submitting && <ArrowRight className="ml-1 h-4 w-4" />}
            </button>
          </footer>
        </section>
      </div>
    )}
    </>
  );
}
