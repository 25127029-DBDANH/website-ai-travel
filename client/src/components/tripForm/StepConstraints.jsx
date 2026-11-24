import { AlertTriangle, Check, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn.js';
import {
  CATALOG_DISTRICTS,
  FORM_DIETARY,
  MAX_AVOID_DISTRICTS,
  MAX_MUST_VISIT,
  toggleListValue
} from '../../lib/tripFormLogic.js';
import { TRIP_OPTION_VALUES } from '../../lib/tripOptions.js';
import { normalizePlaceResult } from '../../lib/tripWizardLogic.js';
import { FieldError, HIGHLIGHT_RING, OptionChips, StepHeader } from './controls.jsx';

export default function StepConstraints({
  form,
  onPatch,
  errors,
  t,
  highlighted,
  headingRef,
  onSearchPlaces
}) {
  const [placeQuery, setPlaceQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');
  const mustVisit = form.must_visit || [];
  const atLimit = mustVisit.length >= MAX_MUST_VISIT;
  const walkDisabled = form.mobility === 'limited';

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

  return (
    <div className="space-y-5">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.constraints.title')}
        hint={t('form.step.constraints.hint')}
      />

      <div>
        <OptionChips
          name="transport_mode"
          values={TRIP_OPTION_VALUES.transport_mode}
          value={form.transport_mode}
          disabledValues={walkDisabled ? ['walk'] : []}
          highlighted={highlighted?.has('transport_mode')}
          onChange={(transport_mode) => onPatch({ transport_mode })}
          t={t}
        />
        {walkDisabled && (
          <p className="mt-1.5 text-xs text-slate-600">{t('form.transportWalkDisabled')}</p>
        )}
      </div>

      <OptionChips
        name="dietary"
        values={FORM_DIETARY}
        value={form.dietary}
        multiple
        highlighted={highlighted?.has('dietary')}
        onChange={(dietary) => onPatch({ dietary })}
        t={t}
      />

      <fieldset className={cn('min-w-0', hl('avoid_districts'))}>
        <legend className="label">{t('form.options.avoid_districts')}</legend>
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
        <p className="mt-1.5 text-xs text-slate-600">
          {t('form.options.avoidHint', { max: MAX_AVOID_DISTRICTS })}
        </p>
        {form.avoid_districts.includes('Quận 1') && (
          <p role="status" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t('form.options.avoidDistrict1')}</span>
          </p>
        )}
        <FieldError id="trip-avoid-districts-error" message={errorText('avoid_districts')} />
      </fieldset>

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
            data-skip-enter="true"
            value={placeQuery}
            disabled={atLimit}
            onChange={(event) => setPlaceQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
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
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-800"
              >
                <MapPin className="h-3 w-3 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{place.name}</span>
                {place.district && <span className="text-brand-600/80">· {place.district}</span>}
                <button
                  type="button"
                  onClick={() => handleRemovePlace(place.id)}
                  aria-label={t('form.mustVisitRemove', { name: place.name })}
                  className="grid h-6 w-6 place-items-center rounded-full text-brand-700 transition-colors hover:bg-brand-200/70"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <label className="label" htmlFor="trip-special-notes">
          {t('form.options.special_notes')}{' '}
          <span className="font-normal text-slate-500">({t('common.optional')})</span>
        </label>
        <textarea
          id="trip-special-notes"
          rows={2}
          maxLength={400}
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
  );
}
