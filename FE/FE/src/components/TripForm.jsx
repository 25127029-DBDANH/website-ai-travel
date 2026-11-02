import {
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Wallet,
  Wand2
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

const BUDGET_PRESETS = [2_000_000, 3_000_000, 5_000_000, 10_000_000];

export default function TripForm() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState('form');
  const [startLocation, setStartLocation] = useState(() => t('form.startDefault'));
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(5_000_000);
  const [preferences, setPreferences] = useState([]);
  const [sentence, setSentence] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

    setSubmitting(true);
    if (DEMO) {
      navigate('/trip/demo');
      return;
    }
    try {
      const trip = await api.createTrip({
        start_location: start,
        budget: Math.round(payloadBudget),
        days: payloadDays,
        preferences: payloadPreferences,
        source: mode === 'sentence' ? 'sentence' : 'form'
      });
      navigate(`/trip/${trip.id}`);
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
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
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-soft backdrop-blur"
      noValidate
    >
      <div className="border-b border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => changeMode('form')}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-[11.5px] font-bold transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
              mode === 'form'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
            aria-pressed={mode === 'form'}
          >
            {t('form.tab.form')}
          </button>
          <button
            type="button"
            onClick={() => changeMode('sentence')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-bold transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
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

      <div className="space-y-5 p-4 sm:p-5">
        {mode === 'form' ? (
          <>
            <div>
              <label className="label" htmlFor="trip-start">
                {t('form.startLabel')}
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
                  aria-invalid={errorField === 'start' || undefined}
                  aria-describedby={errorField === 'start' ? 'trip-form-error' : undefined}
                  placeholder={t('form.startPlaceholder')}
                  maxLength={200}
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span id="trip-days-label" className="label">{t('form.daysLabel')}</span>
                <div
                  role="group"
                  aria-labelledby="trip-days-label"
                  aria-describedby={errorField === 'days' ? 'trip-form-error' : undefined}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5"
                >
                  <button
                    type="button"
                    onClick={() => changeDays(-1)}
                    disabled={days <= 1}
                    aria-label={t('form.daysDecrease')}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 transition-[transform,background-color] duration-200 ease-out-strong hover:bg-slate-200 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-[10.5px] font-medium text-slate-500">{t('form.daysHint')}</p>
              </div>

              <div>
                <label className="label" htmlFor="trip-budget">
                  {t('form.budgetLabel')}
                </label>
                <div className="relative">
                  <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-500" />
                  <input
                    ref={budgetRef}
                    id="trip-budget"
                    type="number"
                    inputMode="numeric"
                    aria-invalid={errorField === 'budget' || undefined}
                    aria-describedby={errorField === 'budget' ? 'trip-form-error' : undefined}
                    min="0"
                    max="1000000000"
                    step="50000"
                    value={budget || ''}
                    onChange={(event) => {
                      setBudget(Number(event.target.value));
                      if (errorField === 'budget') clearError();
                    }}
                    className="input pl-10 pr-14 font-semibold"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold tracking-wider text-slate-500">
                    VND
                  </span>
                </div>
                <p className="mt-1.5 text-[10.5px] font-medium text-slate-500">
                  ≈ {formatVnd(budget, lang)} · {t('form.budgetHint')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BUDGET_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBudget(value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1.5 text-[10.5px] font-bold transition-[transform,color,border-color,background-color] duration-200 ease-out-strong active:scale-[0.97]',
                    budget === value
                      ? 'border-accent-400 bg-accent-50 text-accent-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-accent-300 hover:text-accent-700'
                  )}
                >
                  {compactVnd(value)} ₫
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-end justify-between gap-2">
                <span className="label !mb-0">{t('form.preferencesLabel')}</span>
                <span className="pb-0.5 text-[10px] font-bold text-slate-500">
                  {preferences.length}/4 · {t('form.preferencesHint')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
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
                        'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition-[transform,color,border-color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-slate-800',
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
          </>
        ) : (
          <>
            <div>
              <div className="flex items-end justify-between gap-2">
                <label className="label !mb-0" htmlFor="trip-sentence">
                  {t('form.sentenceLabel')}
                </label>
                <span className="pb-0.5 text-[10px] font-bold text-slate-500">
                  {t('form.sentenceHint', { count: sentence.length })}
                </span>
              </div>
              <textarea
                ref={sentenceRef}
                id="trip-sentence"
                rows={4}
                aria-invalid={errorField === 'sentence' || undefined}
                aria-describedby={errorField === 'sentence' ? 'trip-form-error' : undefined}
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
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left text-[10.5px] font-medium text-slate-500 transition-[transform,border-color,background-color,color] duration-200 ease-out-strong hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98]"
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
                  hasParsedContent
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-amber-200 bg-amber-50/70'
                )}
              >
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]',
                    hasParsedContent ? 'text-emerald-700' : 'text-amber-700'
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('form.sentence.parsed')}
                </p>

                {hasParsedContent ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.days && (
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10.5px] font-bold text-emerald-800">
                          {t('form.sentence.parsedDays', { count: parsed.days })}
                        </span>
                      )}
                      {parsed.budget && (
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10.5px] font-bold text-emerald-800">
                          {t('form.sentence.parsedBudget', {
                            budget: formatVnd(parsed.budget, lang)
                          })}
                        </span>
                      )}
                      {parsed.preferences.length > 0 && (
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10.5px] font-bold text-emerald-800">
                          {t('form.sentence.parsedPreferences', {
                            list: parsed.preferences
                              .map((preference) => t(`preference.${preference}`))
                              .join(', ')
                          })}
                        </span>
                      )}
                    </div>
                    {missing.length > 0 && (
                      <>
                        <p className="mt-2 text-[10.5px] font-semibold text-emerald-700">
                          {t('form.sentence.missing', { list: missing.join(', ') })}
                        </p>
                        <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-emerald-600/80">
                          {t('form.sentence.defaults', {
                            days,
                            budget: formatVnd(budget, lang)
                          })}
                        </p>
                      </>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-amber-700">
                    {t('form.sentence.parsedNone')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <p
            id="trip-form-error"
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('form.submitting')}
            </>
          ) : (
            <>
              {t('form.submit')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
