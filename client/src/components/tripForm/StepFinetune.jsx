import { AlertTriangle, Check, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn.js';
import {
  CATALOG_DISTRICTS,
  dayHoursSummaryText,
  derivePace,
  FORM_DIETARY,
  MAX_AVOID_DISTRICTS,
  MAX_MUST_VISIT,
  toggleListValue
} from '../../lib/tripFormLogic.js';
import { TRIP_OPTION_VALUES } from '../../lib/tripOptions.js';
import { isImeComposing, normalizePlaceResult } from '../../lib/tripWizardLogic.js';
import { Accordion, FieldError, HIGHLIGHT_RING, OptionChips, StepHeader, ToggleOption } from './controls.jsx';

// Nhóm nào chứa field lỗi thì tự mở, để focusFirstErrorField tìm được ô cần sửa.
const SECTION_FIELDS = {
  pace: ['pace_override'],
  must_visit: ['must_visit'],
  avoid: ['avoid_districts'],
  dietary: ['dietary'],
  hours: ['day_start', 'day_end', 'day_schedules'],
  notes: ['special_notes', 'custom_notes']
};

export default function StepFinetune({ form, onPatch, errors, t, highlighted, headingRef, onSearchPlaces }) {
  const [placeQuery, setPlaceQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [userToggled, setUserToggled] = useState({});

  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');
  const mustVisit = form.must_visit || [];
  const atLimit = mustVisit.length >= MAX_MUST_VISIT;
  const dayHoursError = errorText('day_start') || errorText('day_end') || errorText('day_schedules');
  const daySchedules = Array.isArray(form.day_schedules) ? form.day_schedules : [];
  const hasConfiguredHours = Boolean(form.day_start || form.day_end || daySchedules.length > 0);

  const isOpen = (id) => {
    if (SECTION_FIELDS[id].some((field) => errors?.[field])) return true;
    if (id in userToggled) return userToggled[id];
    if (id === 'hours' && hasConfiguredHours) return true;
    return SECTION_FIELDS[id].some((field) => highlighted?.has(field));
  };
  const toggle = (id) =>
    setUserToggled((cur) => {
      const hasHighlight =
        SECTION_FIELDS[id].some((field) => highlighted?.has(field)) ||
        (id === 'hours' && hasConfiguredHours);
      const currentlyOpen = id in cur ? cur[id] : hasHighlight;
      return { ...cur, [id]: !currentlyOpen };
    });

  const updateDayWindow = (dayNumber, field, value) => {
    const existing = daySchedules.find((entry) => entry.day_number === dayNumber) || {
      day_number: dayNumber,
      day_start: '',
      day_end: ''
    };
    const updatedEntry = { ...existing, [field]: value };
    const others = daySchedules.filter((entry) => entry.day_number !== dayNumber);
    if (!updatedEntry.day_start && !updatedEntry.day_end) {
      onPatch({ day_schedules: others });
    } else {
      onPatch({
        day_schedules: [...others, updatedEntry].sort((a, b) => a.day_number - b.day_number)
      });
    }
  };

  const clearDayWindow = (dayNumber) => {
    onPatch({
      day_schedules: daySchedules.filter((entry) => entry.day_number !== dayNumber)
    });
  };

  useEffect(() => {
    const trimmed = placeQuery.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return undefined;
    }

    let active = true;
    setSearching(true);
    setSearchError(false);

    const timer = setTimeout(async () => {
      try {
        const response = await onSearchPlaces({ q: trimmed, limit: 6 });
        if (!active) return;
        const rawList = Array.isArray(response) ? response : response?.results || [];
        const normalized = rawList
          .map(normalizePlaceResult)
          .filter(Boolean)
          .filter((item, idx, arr) => arr.findIndex((other) => other.id === item.id) === idx);
        setResults(normalized);
      } catch {
        if (!active) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [placeQuery, onSearchPlaces]);

  const handleAddPlace = (place) => {
    if (atLimit || mustVisit.some((item) => item.id === place.id)) return;
    onPatch({ must_visit: [...mustVisit, place] });
    setPlaceQuery('');
    setResults([]);
  };

  const handleRemovePlace = (id) => {
    onPatch({ must_visit: mustVisit.filter((item) => item.id !== id) });
  };

  const empty = t('form.finetune.empty');
  const currentPace = derivePace(form);
  const currentPaceLabel = t(`form.option.pace.${currentPace}`);
  const summaries = {
    pace: form.pace_override ? currentPaceLabel : t('form.summary.paceAuto', { pace: currentPaceLabel }),
    must_visit: mustVisit.length ? mustVisit.map((p) => p.name).join(', ') : empty,
    avoid: form.avoid_districts.length ? form.avoid_districts.join(', ') : empty,
    dietary: form.dietary.length
      ? form.dietary.map((item) => t(`form.option.dietary.${item}`)).join(', ')
      : empty,
    hours: dayHoursSummaryText(form, t) || t('form.review.flexibleHours'),
    notes:
      [form.prefer_indoor ? t('form.finetune.indoorOn') : null, form.custom_notes.trim() || null]
        .filter(Boolean)
        .join(' · ') || empty
  };

  return (
    <div className="space-y-4">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.finetune.title')}
        hint={t('form.step.finetune.hint')}
        badge={t('form.step.optional')}
      />

      <div className="rounded-2xl border border-slate-200 bg-white px-3 sm:px-4">
        <Accordion
          id="trip-ft-pace"
          title={t('form.finetune.paceSection')}
          summary={summaries.pace}
          open={isOpen('pace')}
          onToggle={() => toggle('pace')}
        >
          <fieldset className={cn('min-w-0', hl('pace_override'))}>
            <legend className="sr-only">{t('form.finetune.paceSection')}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TRIP_OPTION_VALUES.pace.map((option) => {
                const selected = currentPace === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onPatch({ pace_override: option })}
                    className={cn(
                      'flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors',
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-slate-900'
                    )}
                  >
                    <span className="min-w-0 flex-1">{t(`form.option.pace.${option}`)}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                {form.pace_override ? t('form.finetune.paceCustomHint') : t('form.finetune.paceAutoHint')}
              </p>
              {form.pace_override && (
                <button
                  type="button"
                  onClick={() => onPatch({ pace_override: null })}
                  className="inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  {t('form.finetune.paceReset')}
                </button>
              )}
            </div>
          </fieldset>
        </Accordion>

        <Accordion
          id="trip-ft-must-visit"
          title={t('form.mustVisitLabel')}
          summary={summaries.must_visit}
          open={isOpen('must_visit')}
          onToggle={() => toggle('must_visit')}
        >
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <label className="label" htmlFor="trip-must-visit">
                {t('form.mustVisitLabel')}
              </label>
              <span className="text-xs font-semibold tabular-nums text-slate-500">
                {t('form.mustVisitCount', { count: mustVisit.length, max: MAX_MUST_VISIT })}
              </span>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="trip-must-visit"
                type="search"
                enterKeyHint="search"
                data-skip-enter="true"
                value={placeQuery}
                disabled={atLimit}
                onChange={(event) => setPlaceQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isImeComposing(event)) event.preventDefault();
                }}
                placeholder={
                  atLimit
                    ? t('form.mustVisitMaxReached', { max: MAX_MUST_VISIT })
                    : t('form.mustVisitPlaceholder')
                }
                aria-invalid={Boolean(errors?.must_visit) || undefined}
                aria-describedby={errors?.must_visit ? 'trip-must-visit-error' : 'trip-must-visit-hint'}
                className="input pl-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
              {searching && (
                <Loader2
                  className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-600"
                  aria-hidden="true"
                />
              )}
            </div>
            <FieldError id="trip-must-visit-error" message={errorText('must_visit')} />
            <p id="trip-must-visit-hint" className="mt-1.5 text-xs text-slate-600">
              {t('form.mustVisitHint', { max: MAX_MUST_VISIT })}
            </p>

            {placeQuery.trim() && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {searching ? (
                  <p role="status" className="px-3.5 py-2.5 text-xs text-slate-600">
                    {t('form.mustVisitSearching')}
                  </p>
                ) : searchError ? (
                  <p role="alert" className="px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                    {t('form.mustVisitError')}
                  </p>
                ) : results.length === 0 ? (
                  <p role="status" className="px-3.5 py-2.5 text-xs text-slate-600">
                    {t('form.mustVisitEmpty')}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {results.map((place) => {
                      const alreadyAdded = mustVisit.some((item) => item.id === place.id);
                      return (
                        <li key={place.id}>
                          <button
                            type="button"
                            disabled={alreadyAdded || atLimit}
                            onClick={() => handleAddPlace(place)}
                            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs transition-colors hover:bg-brand-50/70 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-slate-900">{place.name}</span>
                              {place.district && (
                                <span className="block text-[11px] text-slate-500">{place.district}</span>
                              )}
                            </span>
                            <span
                              className={cn(
                                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                alreadyAdded
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-brand-50 text-brand-700'
                              )}
                            >
                              {alreadyAdded ? (
                                <>
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  {t('form.mustVisitAdded')}
                                </>
                              ) : (
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {mustVisit.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {mustVisit.map((place) => (
                  <span
                    key={place.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1 text-xs font-semibold text-brand-800"
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="min-w-0 truncate" title={place.name}>
                      {place.name}
                    </span>
                    {place.district && <span className="shrink-0 text-brand-700">· {place.district}</span>}
                    <button
                      type="button"
                      onClick={() => handleRemovePlace(place.id)}
                      aria-label={t('form.mustVisitRemove', { name: place.name })}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-brand-700 transition-colors hover:bg-brand-200/70"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Accordion>

        <Accordion
          id="trip-ft-avoid"
          title={t('form.options.avoid_districts')}
          summary={summaries.avoid}
          open={isOpen('avoid')}
          onToggle={() => toggle('avoid')}
        >
          <fieldset id="trip-avoid-districts" tabIndex={-1} className={cn('min-w-0 outline-none', hl('avoid_districts'))}>
            <legend className="sr-only">{t('form.options.avoid_districts')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATALOG_DISTRICTS.map(({ name }) => {
                const selected = form.avoid_districts.includes(name);
                const disabled = !selected && form.avoid_districts.length >= MAX_AVOID_DISTRICTS;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => onPatch({ avoid_districts: toggleListValue(form.avoid_districts, name) })}
                    className={cn(
                      'min-h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      selected
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    )}
                  >
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
            <FieldError id="trip-avoid-districts-error" message={errorText('avoid_districts')} />
          </fieldset>
        </Accordion>

        <Accordion
          id="trip-ft-dietary"
          title={t('form.options.dietary')}
          summary={summaries.dietary}
          open={isOpen('dietary')}
          onToggle={() => toggle('dietary')}
        >
          <OptionChips
            name="dietary"
            values={FORM_DIETARY}
            value={form.dietary}
            multiple
            highlighted={highlighted?.has('dietary')}
            onChange={(dietary) => onPatch({ dietary })}
            t={t}
          />
        </Accordion>

        <Accordion
          id="trip-ft-hours"
          title={t('form.dayHoursLabel')}
          summary={summaries.hours}
          open={isOpen('hours')}
          onToggle={() => toggle('hours')}
        >
          <fieldset className="min-w-0">
            <legend className="sr-only">{t('form.dayHoursLabel')}</legend>
            {form.days > 1 && (
              <p className="mb-1.5 text-xs font-semibold text-slate-700">
                {t('form.dayHoursAllDaysTitle')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="trip-day-start" className="mb-1 block text-xs font-medium text-slate-700">
                  {t('form.dayStartLabel')}
                </label>
                <input
                  id="trip-day-start"
                  type="time"
                  value={form.day_start}
                  onChange={(event) => onPatch({ day_start: event.target.value })}
                  aria-invalid={Boolean(errors?.day_start) || undefined}
                  aria-describedby={dayHoursError ? 'trip-day-hours-error' : 'trip-day-hours-hint'}
                  className={cn('input', errors?.day_start && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')}
                />
              </div>
              <div>
                <label htmlFor="trip-day-end" className="mb-1 block text-xs font-medium text-slate-700">
                  {t('form.dayEndLabel')}
                </label>
                <input
                  id="trip-day-end"
                  type="time"
                  value={form.day_end}
                  onChange={(event) => onPatch({ day_end: event.target.value })}
                  aria-invalid={Boolean(errors?.day_end) || undefined}
                  aria-describedby={dayHoursError ? 'trip-day-hours-error' : 'trip-day-hours-hint'}
                  className={cn('input', errors?.day_end && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')}
                />
              </div>
            </div>
            <FieldError id="trip-day-hours-error" message={dayHoursError} />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              {!dayHoursError && (
                <p id="trip-day-hours-hint" className="text-xs text-slate-600">
                  {t('form.dayHoursHint')}
                </p>
              )}
              {hasConfiguredHours && (
                <button
                  type="button"
                  onClick={() => onPatch({ day_start: '', day_end: '', day_schedules: [] })}
                  className="inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  {t('form.dayHoursClear')}
                </button>
              )}
            </div>

            {form.days > 1 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {t('form.dayHoursByDayTitle')}
                  </p>
                  <p className="text-[11px] text-slate-500">{t('form.dayHoursByDayHint')}</p>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: form.days }, (_, idx) => idx + 1).map((dayNum) => {
                    const entry = daySchedules.find((item) => item.day_number === dayNum);
                    return (
                      <div
                        key={dayNum}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2"
                      >
                        <span className="min-w-16 text-xs font-bold text-slate-800">
                          {t('form.dayHoursDayItem', { day: dayNum })}
                        </span>
                        <input
                          id={`trip-day-${dayNum}-start`}
                          type="time"
                          aria-label={`${t('form.dayHoursDayItem', { day: dayNum })} — ${t('form.dayStartLabel')}`}
                          value={entry?.day_start || ''}
                          onChange={(event) => updateDayWindow(dayNum, 'day_start', event.target.value)}
                          className="input !w-auto min-w-[7.5rem] !py-1.5 text-xs"
                        />
                        <span className="text-xs text-slate-400">–</span>
                        <input
                          id={`trip-day-${dayNum}-end`}
                          type="time"
                          aria-label={`${t('form.dayHoursDayItem', { day: dayNum })} — ${t('form.dayEndLabel')}`}
                          value={entry?.day_end || ''}
                          onChange={(event) => updateDayWindow(dayNum, 'day_end', event.target.value)}
                          className="input !w-auto min-w-[7.5rem] !py-1.5 text-xs"
                        />
                        {entry ? (
                          <button
                            type="button"
                            onClick={() => clearDayWindow(dayNum)}
                            className="inline-flex min-h-7 items-center gap-0.5 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                            <span>{t('form.dayHoursFlexibleDay')}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">
                            {t('form.dayHoursFlexibleDay')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </fieldset>
        </Accordion>

        <Accordion
          id="trip-ft-notes"
          title={t('form.finetune.notesSection')}
          summary={summaries.notes}
          open={isOpen('notes')}
          onToggle={() => toggle('notes')}
        >
          <div className="space-y-3">
            <ToggleOption
              id="trip-prefer-indoor"
              label={t('form.preferIndoorLabel')}
              hint={t('form.preferIndoorHint')}
              checked={Boolean(form.prefer_indoor)}
              onChange={(prefer_indoor) => onPatch({ prefer_indoor })}
            />
            <div className="min-w-0">
              <label className="label" htmlFor="trip-special-notes">
                {t('form.options.special_notes')}
              </label>
              <textarea
                id="trip-special-notes"
                rows={2}
                maxLength={500}
                value={form.custom_notes}
                onChange={(event) => onPatch({ custom_notes: event.target.value })}
                placeholder={t('form.options.specialNotesPlaceholder')}
                aria-invalid={Boolean(errors?.special_notes) || undefined}
                aria-describedby={errors?.special_notes ? 'trip-special-notes-error' : undefined}
                className={cn(
                  'input min-h-[4.5rem] resize-y py-2.5 text-base sm:text-sm',
                  errors?.special_notes && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                )}
              />
              <FieldError id="trip-special-notes-error" message={errorText('special_notes')} />
            </div>
          </div>
        </Accordion>
      </div>
    </div>
  );
}
