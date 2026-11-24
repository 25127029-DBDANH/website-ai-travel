import {
  AlertTriangle, ArrowRight, Check, ChevronDown, Heart, Loader2, MapPin, Minus,
  Plus, Sparkles, User, Users, Wallet, Wand2, X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO } from '../demo.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { preferenceOptions } from '../i18n/translations.js';
import { api } from '../lib/api.js';
import { getCategoryMeta } from '../lib/categories.jsx';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';
import { parseTripSentence } from '../lib/sentenceParser.js';
import {
  ADVANCED_KEYS, applyParsedToForm, BUDGET_PER_PERSON_PER_DAY, budgetPresetPatch,
  budgetPresetTotal, buildAiRequest, buildTripCreatePayload, canUseLocalItineraryFallback,
  CATALOG_DISTRICTS, compactVnd, companionsPatch, countCustomizedAdvanced, customBudgetPatch,
  daysPatch, defaultTripForm, describeFilledFields, FORM_DIETARY, groupSizePatch,
  LONG_TRIP_DAYS, makeFallbackConcept, MAX_AVOID_DISTRICTS, missingParsedLabels,
  PREFERENCE_CATEGORY, toggleListValue, validateTripForm
} from '../lib/tripFormLogic.js';
import { hasParsedTripContent, START_LOCATION_SUGGESTIONS, TRIP_OPTION_VALUES } from '../lib/tripOptions.js';

const COMPANION_ICONS = { solo: User, couple: Heart, friends: Users, family: Users };
const HIGHLIGHT_RING = 'rounded-2xl ring-2 ring-emerald-300 ring-offset-2 ring-offset-white transition-shadow';

function Stepper({ id, labelledBy, value, label, min, max, onChange, decreaseLabel, increaseLabel, describedBy, invalid }) {
  return (
    <div id={id} role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid || undefined} tabIndex={-1}
      className={cn('flex items-center justify-between rounded-xl border bg-white p-1', invalid ? 'border-rose-400' : 'border-slate-200')}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={decreaseLabel}
        className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-slate-200 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40">
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="font-display text-base font-extrabold text-slate-900">{label}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={increaseLabel}
        className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white shadow-sm transition-[transform,background-color] duration-150 ease-out-strong hover:bg-brand-700 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40">
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function OptionChips({ name, values, value, onChange, multiple = false, highlighted = false }) {
  const { t } = useI18n();
  return (
    <fieldset className={cn('min-w-0', highlighted && HIGHLIGHT_RING)}>
      <legend className="label">{t(`form.options.${name}`)}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((option) => {
          const selected = multiple ? value.includes(option) : value === option;
          return (
            <button key={option} type="button" aria-pressed={selected}
              onClick={() => onChange(multiple ? toggleListValue(value, option) : option)}
              className={cn('min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors',
                selected ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-slate-900')}>
              {t(`form.option.${name}.${option}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FieldError({ id, message }) {
  return message ? <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">{message}</p> : null;
}

function ConceptDialog({ concept, submitting, submissionStage, error, lang, t, onClose, onApprove }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const vi = lang === 'vi';

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocusRef.current?.focus?.();
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="trip-concept-title" ref={dialogRef} tabIndex={-1}
      onKeyDown={(event) => event.key === 'Escape' && !submitting && onClose()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm outline-none">
      <section className="modal-panel w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-brand-50/70 p-5 sm:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {concept.source === 'fallback'
                ? (vi ? 'Gợi ý dự phòng' : 'Fallback suggestion')
                : (vi ? 'Đề xuất từ Gemini' : 'Gemini suggestion')}
            </span>
            <h2 id="trip-concept-title" className="mt-2 font-display text-xl font-extrabold text-slate-900">
              {vi ? 'Concept chuyến đi của bạn' : 'Your trip concept'}
            </h2>
          </div>
          <button type="button" disabled={submitting} onClick={onClose}
            aria-label={vi ? 'Đóng concept' : 'Close concept'}
            className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 sm:p-6">
          {concept.source === 'fallback' && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              {concept.fallback_reason
                ? (vi ? 'Không kết nối được Gemini. Khi bạn đồng ý, hệ thống sẽ tạo lịch trình dự phòng và báo rõ nguồn kết quả.'
                  : 'Could not reach Gemini. If you approve, the app will create a fallback itinerary and label its source.')
                : (vi ? 'Gemini chưa trả lời được. Đây là concept dự phòng được tạo từ danh sách địa điểm có sẵn.'
                  : 'Gemini did not respond. This fallback concept was created from the available place catalog.')}
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-700">{concept.summary}</p>
          {concept.highlights?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{vi ? 'Điểm nổi bật' : 'Highlights'}</h3>
              <ul className="mt-2 space-y-1.5">
                {concept.highlights.map((highlight, index) => (
                  <li key={`${highlight}-${index}`} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-brand-600" aria-hidden="true">•</span><span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {concept.recommended_districts?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{vi ? 'Các quận dự kiến' : 'Recommended districts'}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {concept.recommended_districts.map((district) => (
                  <span key={district} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{district}</span>
                ))}
              </div>
            </section>
          )}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{vi ? 'Lộ trình gợi ý' : 'Suggested route'}</h3>
            <p className="mt-1 text-sm text-slate-700">{concept.route_overview}</p>
          </section>
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{concept.confirmation_question}</p>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
          {submitting && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-700">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
              {submissionStage === 'generate' ? t('form.stage.generate') : t('form.stage.save')}
            </p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" disabled={submitting} onClick={onClose} className="btn-secondary min-h-11">
            {vi ? 'Để sau' : 'Not now'}
          </button>
          <button type="button" disabled={submitting} onClick={onApprove} className="btn-primary min-h-11">
            {submitting ? (vi ? 'Đang xử lý...' : 'Working...') : (vi ? 'Đồng ý, tạo lịch trình' : 'Approve and create itinerary')}
            {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function TripForm() {
  const { lang, t } = useI18n();
  const { user, loading, openAuth } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => defaultTripForm(t('form.startDefault')));
  const [budgetDraft, setBudgetDraft] = useState(null);
  const [sentence, setSentence] = useState('');
  const [quickFillError, setQuickFillError] = useState('');
  const [lastParse, setLastParse] = useState(null);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [parseSummary, setParseSummary] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState('');
  const [concept, setConcept] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);

  const defaultStartRef = useRef(t('form.startDefault'));
  const sentenceRef = useRef(null);
  const startRef = useRef(null);
  const budgetRef = useRef(null);
  const preferencesRef = useRef(null);
  const notesRef = useRef(null);

  useEffect(() => {
    const previousDefault = defaultStartRef.current;
    const nextDefault = t('form.startDefault');
    setForm((current) => (current.start_location === previousDefault ? { ...current, start_location: nextDefault } : current));
    defaultStartRef.current = nextDefault;
  }, [t]);

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    const keys = Object.keys(patch);
    setHighlighted((current) => {
      if (!keys.some((key) => current.has(key))) return current;
      const next = new Set(current);
      keys.forEach((key) => next.delete(key));
      return next;
    });
    setFieldErrors((current) => {
      if (!keys.some((key) => key in current || key === 'custom_notes' || key === 'quick_notes')) return current;
      const next = { ...current };
      keys.forEach((key) => {
        delete next[key];
        if (key === 'custom_notes' || key === 'quick_notes') delete next.special_notes;
      });
      return next;
    });
    if (formError) setFormError('');
  };

  const handleQuickFill = (inputSentence = sentence) => {
    setQuickFillError('');
    setFormError('');
    const text = String(inputSentence || '').trim();
    if (text.length < 6) {
      setQuickFillError(t('form.sentence.tooShort'));
      requestAnimationFrame(() => sentenceRef.current?.focus());
      return;
    }
    const parsed = parseTripSentence(text);
    if (!hasParsedTripContent(parsed)) {
      setQuickFillError(t('form.sentence.parsedNone'));
      requestAnimationFrame(() => sentenceRef.current?.focus());
      return;
    }

    const result = applyParsedToForm(form, parsed, lastParse);
    setForm(result.form);
    setLastParse(result.parse);
    setBudgetDraft(null);
    setFieldErrors({});
    setHighlighted(new Set(result.parse.keys));
    if (result.parse.keys.some((key) => ADVANCED_KEYS.includes(key))) setAdvancedOpen(true);

    setParseSummary({
      count: result.parse.keys.length,
      badges: describeFilledFields(result.parse.keys, result.form, t, formatVnd, lang),
      missing: missingParsedLabels(parsed, t)
    });
  };

  const focusFirstError = (errors) => {
    const focusMap = [
      ['start_location', () => startRef.current?.focus()],
      ['days', () => document.getElementById('trip-days')?.focus()],
      ['group_size', () => document.getElementById('trip-group-size')?.focus()],
      ['budget', () => budgetRef.current?.focus()],
      ['preferences', () => preferencesRef.current?.focus()],
      ['special_notes', () => { setAdvancedOpen(true); requestAnimationFrame(() => notesRef.current?.focus()); }]
    ];
    const match = focusMap.find(([key]) => errors[key]);
    if (match) requestAnimationFrame(match[1]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    setQuickFillError('');

    const validation = validateTripForm(form, budgetDraft);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      focusFirstError(validation.errors);
      return;
    }
    setFieldErrors({});

    if (loading) return;
    if (!user) {
      setFormError(t('form.validation.auth'));
      openAuth('login');
      return;
    }

    setSubmitting(true);
    if (DEMO) {
      navigate('/trip/demo');
      return;
    }

    const tripRequest = buildAiRequest(form);
    try {
      setPendingTrip(tripRequest);
      setSubmissionStage('concept');
      const suggestedConcept = await api.suggestTripConcept(tripRequest);
      setConcept(suggestedConcept);
    } catch (requestError) {
      if (canUseLocalItineraryFallback(requestError)) {
        setPendingTrip(tripRequest);
        setConcept(makeFallbackConcept(tripRequest, requestError, formatVnd, lang));
      } else {
        setFormError(requestError?.message || translateApiError(t, requestError));
      }
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const handleApproveConcept = async () => {
    if (!pendingTrip || !concept || submitting) return;
    if (loading) return;
    if (!user) {
      setFormError(t('form.validation.authExpired'));
      openAuth('login');
      return;
    }

    setFormError('');
    setSubmitting(true);
    setSubmissionStage('generate');
    try {
      let generated;
      if (concept.fallback_reason) {
        generated = { source: 'fallback', itinerary_items: null };
      } else {
        try {
          generated = await api.generateAiItinerary({ ...pendingTrip, approved_concept: concept });
        } catch (requestError) {
          if (!canUseLocalItineraryFallback(requestError)) throw requestError;
          generated = { source: 'fallback', itinerary_items: null };
        }
      }

      setSubmissionStage('save');
      const trip = await api.createTrip(buildTripCreatePayload(pendingTrip, generated, lastParse ? 'sentence' : 'form'));
      navigate(`/trip/${trip.id}`, {
        state: {
          aiConceptSource: concept.source || 'gemini',
          aiGenerationSource: generated.source || 'gemini'
        }
      });
    } catch (requestError) {
      setFormError(requestError?.message || translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const hl = (key) => (highlighted.has(key) ? HIGHLIGHT_RING : '');
  const advancedCustomCount = countCustomizedAdvanced(form);
  const errorText = (field) => (fieldErrors[field] ? t(`form.validation.${fieldErrors[field]}`) : '');

  return (
    <>
      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}
        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <fieldset disabled={submitting} className="min-w-0 space-y-5 p-4 sm:p-6">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5">
            <label htmlFor="trip-quickfill" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Wand2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {t('form.quickFill.label')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input ref={sentenceRef} id="trip-quickfill" type="text" maxLength={500} value={sentence}
                onChange={(event) => { setSentence(event.target.value); if (quickFillError) setQuickFillError(''); }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleQuickFill(); } }}
                placeholder={t('form.quickFill.placeholder')}
                aria-invalid={Boolean(quickFillError) || undefined}
                aria-describedby={quickFillError ? 'trip-quickfill-error' : 'trip-quickfill-hint'}
                className={cn('input min-w-0 flex-1 bg-white py-2.5 text-sm',
                  quickFillError && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')} />
              <button type="button" onClick={() => handleQuickFill()}
                className="btn-secondary min-h-11 shrink-0 border-brand-200 px-4 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
                {t('form.quickFill.apply')}
              </button>
            </div>
            <FieldError id="trip-quickfill-error" message={quickFillError} />
            {!quickFillError && <p id="trip-quickfill-hint" className="mt-1.5 text-xs text-slate-600">{t('form.quickFill.hint')}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[t('form.sentence.sample1'), t('form.sentence.sample2')].map((sample) => (
                <button key={sample} type="button" onClick={() => { setSentence(sample); handleQuickFill(sample); }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700">
                  “{sample}”
                </button>
              ))}
            </div>
            {parseSummary && (
              <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
                <p className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t('form.sentence.parsed', { count: parseSummary.count })}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parseSummary.badges.map((badge) => (
                    <span key={badge} className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 font-semibold text-emerald-800">{badge}</span>
                  ))}
                </div>
                {parseSummary.missing.length > 0 && (
                  <p className="mt-1.5 text-emerald-800">{t('form.sentence.missing', { list: parseSummary.missing.join(', ') })}</p>
                )}
              </div>
            )}
          </div>

          <div className={cn('min-w-0', hl('start_location'))}>
            <label className="label" htmlFor="trip-start">{t('form.startLabel')}</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden="true" />
              <input ref={startRef} id="trip-start" type="text" maxLength={200} value={form.start_location}
                onChange={(event) => update({ start_location: event.target.value })}
                placeholder={t('form.startPlaceholder')} aria-required="true"
                aria-invalid={Boolean(fieldErrors.start_location) || undefined}
                aria-describedby={fieldErrors.start_location ? 'trip-start-error' : undefined}
                className={cn('input pl-10', fieldErrors.start_location && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')} />
            </div>
            <FieldError id="trip-start-error" message={errorText('start_location')} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {START_LOCATION_SUGGESTIONS.map((item) => (
                <button key={item.value} type="button" onClick={() => update({ start_location: item.value })}
                  className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                    form.start_location === item.value ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700')}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={cn('min-w-0', hl('days'))}>
              <span id="trip-days-label" className="label">{t('form.daysLabel')}</span>
              <Stepper id="trip-days" labelledBy="trip-days-label" value={form.days} min={1} max={14}
                label={t('common.days', { count: form.days })} decreaseLabel={t('form.daysDecrease')} increaseLabel={t('form.daysIncrease')}
                invalid={Boolean(fieldErrors.days)}
                describedBy={fieldErrors.days ? 'trip-days-error' : form.days > LONG_TRIP_DAYS ? 'trip-days-hint' : undefined}
                onChange={(nextDays) => update(daysPatch(form, nextDays))} />
              <FieldError id="trip-days-error" message={errorText('days')} />
              {!fieldErrors.days && form.days > LONG_TRIP_DAYS && (
                <p id="trip-days-hint" className="mt-1.5 text-xs text-amber-700">{t('form.daysLongHint')}</p>
              )}
            </div>

            <div className={cn('min-w-0', hl('group_size'))}>
              <span id="trip-group-size-label" className="label">{t('form.options.group_size')}</span>
              {form.companions === 'solo' || form.companions === 'couple' ? (
                <div id="trip-group-size" aria-labelledby="trip-group-size-label"
                  className="flex min-h-[3.125rem] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5">
                  <span className="font-display text-base font-extrabold text-slate-900">{t('form.options.groupCount', { count: form.group_size })}</span>
                  <span className="text-xs font-medium text-slate-500">{t('form.options.groupFixed')}</span>
                </div>
              ) : (
                <Stepper id="trip-group-size" labelledBy="trip-group-size-label" value={form.group_size} min={2} max={20}
                  label={t('form.options.groupCount', { count: form.group_size })}
                  decreaseLabel={t('form.options.groupDecrease')} increaseLabel={t('form.options.groupIncrease')}
                  invalid={Boolean(fieldErrors.group_size)} describedBy={fieldErrors.group_size ? 'trip-group-size-error' : undefined}
                  onChange={(size) => update(groupSizePatch(form, size))} />
              )}
              <FieldError id="trip-group-size-error" message={errorText('group_size')} />
            </div>
          </div>

          <fieldset className={cn('min-w-0', hl('companions'))}>
            <legend className="label">{t('form.options.companions')}</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {TRIP_OPTION_VALUES.companions.map((option) => {
                const Icon = COMPANION_ICONS[option];
                const selected = form.companions === option;
                return (
                  <button key={option} type="button" aria-pressed={selected} onClick={() => update(companionsPatch(form, option))}
                    className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors',
                      selected ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-slate-900')}>
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t(`form.option.companions.${option}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className={cn('min-w-0', hl('budget'))}>
            <div className="flex items-baseline justify-between gap-2">
              <label className="label" htmlFor="trip-budget">{t('form.budgetLabel')}</label>
              {form.budget_preset === null && <span className="text-xs font-semibold text-slate-500">{t('form.budgetCustomTag')}</span>}
            </div>
            <div className="relative">
              <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-500" aria-hidden="true" />
              <input ref={budgetRef} id="trip-budget" type="number" inputMode="numeric" min="0" max="1000000000" step="50000"
                value={budgetDraft ?? String(form.budget)}
                onChange={(event) => { setBudgetDraft(event.target.value); update(customBudgetPatch(form, event.target.value)); }}
                onBlur={() => { if (budgetDraft !== null && Number(budgetDraft) > 0) setBudgetDraft(null); }} aria-required="true"
                aria-invalid={Boolean(fieldErrors.budget) || undefined}
                aria-describedby={fieldErrors.budget ? 'trip-budget-error' : 'trip-budget-hint'}
                className={cn('input pl-10 pr-14 font-semibold', fieldErrors.budget && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold tracking-wider text-slate-500">VND</span>
            </div>
            <FieldError id="trip-budget-error" message={errorText('budget')} />
            <p id="trip-budget-hint" className="mt-1.5 text-xs text-slate-600">{t('form.budgetHint', { count: form.group_size, days: form.days })}</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('form.budgetPresets')}>
              {BUDGET_PER_PERSON_PER_DAY.map((perPerson) => {
                const total = budgetPresetTotal(perPerson, form.days, form.group_size);
                const active = form.budget_preset === perPerson && form.budget === total;
                return (
                  <button key={perPerson} type="button" aria-pressed={active}
                    aria-label={t('form.budgetPresetLabel', { amount: compactVnd(perPerson, lang), total: compactVnd(total, lang) })}
                    onClick={() => { setBudgetDraft(null); update(budgetPresetPatch(form, perPerson)); }}
                    className={cn('min-h-10 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      active ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-accent-300 hover:text-accent-700')}>
                    {t('form.budgetPreset', { amount: compactVnd(perPerson, lang) })}
                    <span className="ml-1 font-normal text-slate-500">= {compactVnd(total, lang)} ₫</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cn('min-w-0', hl('preferences'))}>
            <div className="flex items-baseline justify-between gap-2">
              <span id="trip-preferences-label" className="label">{t('form.preferencesLabel')}</span>
              <span className="text-xs font-medium text-slate-500">{t('form.preferencesHint')}</span>
            </div>
            <div ref={preferencesRef} tabIndex={-1} role="group" aria-labelledby="trip-preferences-label"
              aria-invalid={Boolean(fieldErrors.preferences) || undefined}
              aria-describedby={fieldErrors.preferences ? 'trip-preferences-error' : undefined}
              className="grid grid-cols-2 gap-1.5 outline-none sm:grid-cols-3">
              {preferenceOptions.map((preference) => {
                const meta = getCategoryMeta(PREFERENCE_CATEGORY[preference]);
                const Icon = meta.icon;
                const selected = form.preferences.includes(preference);
                return (
                  <button key={preference} type="button" role="checkbox" aria-checked={selected}
                    onClick={() => update({ preferences: toggleListValue(form.preferences, preference) })}
                    className={cn('flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                      selected ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-slate-900')}>
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                      selected ? 'border-brand-200 bg-white text-brand-600' : meta.tile)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">{t(`preference.${preference}`)}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <FieldError id="trip-preferences-error" message={errorText('preferences')} />
          </div>

          <div className="rounded-2xl border border-slate-200">
            <button type="button" aria-expanded={advancedOpen} aria-controls="trip-advanced-panel"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-slate-50">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  {t('form.advanced')}
                  {advancedCustomCount > 0 && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                      {t('form.advancedActive', { count: advancedCustomCount })}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">{t('form.advancedHint')}</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', advancedOpen && 'rotate-180')} aria-hidden="true" />
            </button>

            <div id="trip-advanced-panel" hidden={!advancedOpen} className="space-y-4 border-t border-slate-200 p-4">
              <OptionChips name="pace" values={TRIP_OPTION_VALUES.pace} value={form.pace}
                highlighted={highlighted.has('pace')} onChange={(pace) => update({ pace })} />
              <OptionChips name="transport_mode" values={TRIP_OPTION_VALUES.transport_mode} value={form.transport_mode}
                highlighted={highlighted.has('transport_mode')} onChange={(transport_mode) => update({ transport_mode })} />
              <OptionChips name="dietary" values={FORM_DIETARY} value={form.dietary} multiple
                highlighted={highlighted.has('dietary')} onChange={(dietary) => update({ dietary })} />

              <fieldset className={cn('min-w-0', hl('avoid_districts'))}>
                <legend className="label">{t('form.options.avoid_districts')}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {CATALOG_DISTRICTS.map(({ name }) => {
                    const selected = form.avoid_districts.includes(name);
                    const disabled = !selected && form.avoid_districts.length >= MAX_AVOID_DISTRICTS;
                    return (
                      <button key={name} type="button" aria-pressed={selected} disabled={disabled}
                        onClick={() => update({ avoid_districts: toggleListValue(form.avoid_districts, name) })}
                        className={cn('min-h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                          selected ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                        {name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{t('form.options.avoidHint', { max: MAX_AVOID_DISTRICTS })}</p>
                {form.avoid_districts.includes('Quận 1') && (
                  <p role="status" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('form.options.avoidDistrict1')}</span>
                  </p>
                )}
              </fieldset>

              <div className="min-w-0 space-y-2">
                <label className="label" htmlFor="trip-special-notes">{t('form.options.special_notes')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {TRIP_OPTION_VALUES.quick_notes.map((noteId) => {
                    const selected = form.quick_notes.includes(noteId);
                    return (
                      <button key={noteId} type="button" aria-pressed={selected}
                        onClick={() => update({ quick_notes: toggleListValue(form.quick_notes, noteId) })}
                        className={cn('min-h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                          selected ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                        {t(`form.option.quick_notes.${noteId}`)}
                      </button>
                    );
                  })}
                </div>
                <input ref={notesRef} id="trip-special-notes" type="text" maxLength={400} value={form.custom_notes}
                  onChange={(event) => update({ custom_notes: event.target.value })}
                  placeholder={t('form.options.specialNotesPlaceholder')}
                  aria-invalid={Boolean(fieldErrors.special_notes) || undefined}
                  aria-describedby={fieldErrors.special_notes ? 'trip-special-notes-error' : undefined}
                  className="input py-2.5 text-sm" />
                <FieldError id="trip-special-notes-error" message={errorText('special_notes')} />
              </div>
            </div>
          </div>

          {formError && (
            <p id="trip-form-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary min-h-12 w-full text-sm font-bold">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {submissionStage === 'concept' ? t('form.stage.concept')
                  : submissionStage === 'generate' ? t('form.stage.generate') : t('form.stage.save')}
              </>
            ) : (
              <>
                {t('form.submit')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </fieldset>
      </form>

      {concept && (
        <ConceptDialog concept={concept} submitting={submitting} submissionStage={submissionStage}
          error={formError} lang={lang} t={t}
          onClose={() => { setConcept(null); setPendingTrip(null); setFormError(''); }}
          onApprove={handleApproveConcept} />
      )}
    </>
  );
}
