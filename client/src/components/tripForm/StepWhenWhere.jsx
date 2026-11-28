import { Calendar, Check, Clock, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn.js';
import { dayHoursSummaryText, daysPatch, LONG_TRIP_DAYS } from '../../lib/tripFormLogic.js';
import { addDateDays, DAY_PRESETS, hcmcDate, STAY_AREAS, stayAreaForLocation } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, StepHeader, Stepper } from './controls.jsx';

const CARD_BASE =
  'flex min-h-11 w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors';
const CARD_ON = 'border-brand-500 bg-brand-50 text-slate-900';
const CARD_OFF = 'border-slate-200 bg-white text-slate-800 hover:border-brand-300';

export default function StepWhenWhere({ form, onPatch, errors, t, highlighted, headingRef }) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');

  const [customDays, setCustomDays] = useState(() => !DAY_PRESETS.includes(form.days));
  const stayKey = stayAreaForLocation(form.start_location);
  const [customStay, setCustomStay] = useState(() => !stayKey);
  const showCustomStay = customStay || !stayKey || Boolean(errors?.start_location);
  const showStepper = customDays || !DAY_PRESETS.includes(form.days) || Boolean(errors?.days);
  const activeHoursSummary = dayHoursSummaryText(form, t);

  const today = hcmcDate();
  const minDate = addDateDays(today, -1);
  const maxDate = addDateDays(today, 365);

  return (
    <div className="space-y-6">
      <StepHeader headingRef={headingRef} title={t('form.step.when_where.title')} hint={t('form.step.when_where.hint')} />

      <div className={cn('min-w-0', hl('days'))}>
        <span id="trip-days-presets-label" className="label">
          {t('form.days.presetsLabel')} <span aria-hidden="true" className="text-rose-600">*</span>
        </span>
        <div role="group" aria-labelledby="trip-days-presets-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAY_PRESETS.map((days) => {
            const selected = !showStepper && form.days === days;
            return (
              <button
                key={days}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCustomDays(false);
                  onPatch(daysPatch(form, days));
                }}
                className={cn(CARD_BASE, 'items-center justify-center text-sm font-bold', selected ? CARD_ON : CARD_OFF)}
              >
                {t(`form.days.preset${days}`)}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showStepper}
            onClick={() => setCustomDays(true)}
            className={cn(CARD_BASE, 'items-center justify-center text-sm font-bold', showStepper ? CARD_ON : CARD_OFF)}
          >
            {t('form.days.custom')}
          </button>
        </div>
        {showStepper && (
          <div className="mt-2.5 max-w-xs">
            <span id="trip-days-label" className="sr-only">
              {t('form.daysLabel')}
            </span>
            <Stepper
              id="trip-days"
              labelledBy="trip-days-label"
              value={form.days}
              min={1}
              max={14}
              label={t('common.days', { count: form.days })}
              decreaseLabel={t('form.daysDecrease')}
              increaseLabel={t('form.daysIncrease')}
              invalid={Boolean(errors?.days)}
              describedBy={errors?.days ? 'trip-days-error' : form.days > LONG_TRIP_DAYS ? 'trip-days-hint' : undefined}
              onChange={(nextDays) => onPatch(daysPatch(form, nextDays))}
            />
          </div>
        )}
        <FieldError id="trip-days-error" message={errorText('days')} />
        {!errors?.days && form.days > LONG_TRIP_DAYS && (
          <p id="trip-days-hint" className="mt-1.5 text-xs text-amber-700">
            {t('form.daysLongHint')}
          </p>
        )}
        {activeHoursSummary && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <span className="flex min-w-0 items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
              <span>{t('form.dayHoursActiveNotice', { summary: activeHoursSummary })}</span>
            </span>
            <button
              type="button"
              onClick={() => onPatch({ day_start: '', day_end: '', day_schedules: [] })}
              className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-100"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              <span>{t('form.dayHoursClear')}</span>
            </button>
          </div>
        )}
      </div>

      <div className={cn('min-w-0 max-w-sm', hl('travel_date'))}>
        <div className="flex items-baseline justify-between gap-2">
          <label className="label" htmlFor="trip-travel-date">
            {t('form.travelDateLabel')} <span className="font-normal text-slate-500">({t('common.optional')})</span>
          </label>
          {form.travel_date && (
            <button
              type="button"
              onClick={() => onPatch({ travel_date: '' })}
              className="inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              {t('form.travelDateClear')}
            </button>
          )}
        </div>
        <div className="relative">
          <Calendar
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            id="trip-travel-date"
            type="date"
            min={minDate}
            max={maxDate}
            value={form.travel_date}
            onChange={(event) => onPatch({ travel_date: event.target.value })}
            aria-invalid={Boolean(errors?.travel_date) || undefined}
            aria-describedby={errors?.travel_date ? 'trip-travel-date-error' : 'trip-travel-date-hint'}
            className={cn('input pl-10', errors?.travel_date && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')}
          />
        </div>
        <FieldError id="trip-travel-date-error" message={errorText('travel_date')} />
        {!errors?.travel_date && (
          <p id="trip-travel-date-hint" className="mt-1.5 text-xs text-slate-600">
            {t('form.travelDateHint')}
          </p>
        )}
      </div>

      <div className={cn('min-w-0', hl('start_location'))}>
        <span id="trip-stay-label" className="label">
          {t('form.stay.label')} <span aria-hidden="true" className="text-rose-600">*</span>
        </span>
        <p id="trip-stay-hint" className="-mt-0.5 mb-2 text-xs text-slate-600">
          {t('form.stay.hint')}
        </p>
        <div
          id="trip-stay"
          role="group"
          aria-labelledby="trip-stay-label"
          aria-describedby="trip-stay-hint"
          className="grid gap-2 sm:grid-cols-2"
        >
          {STAY_AREAS.map((area) => {
            const selected = !showCustomStay && stayKey === area.key;
            return (
              <button
                key={area.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCustomStay(false);
                  onPatch({ start_location: area.value });
                }}
                className={cn(CARD_BASE, selected ? CARD_ON : CARD_OFF)}
              >
                <MapPin
                  className={cn('mt-0.5 h-4 w-4 shrink-0', selected ? 'text-brand-600' : 'text-slate-400')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t(`form.stay.${area.key}.label`)}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-600">{t(`form.stay.${area.key}.desc`)}</span>
                </span>
                {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showCustomStay}
            onClick={() => {
              setCustomStay(true);
              requestAnimationFrame(() => document.getElementById('trip-start')?.focus());
            }}
            className={cn(CARD_BASE, showCustomStay ? CARD_ON : CARD_OFF)}
          >
            <MapPin
              className={cn('mt-0.5 h-4 w-4 shrink-0', showCustomStay ? 'text-brand-600' : 'text-slate-400')}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{t('form.stay.custom.label')}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-600">{t('form.stay.custom.desc')}</span>
            </span>
            {showCustomStay && <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />}
          </button>
        </div>

        {showCustomStay && (
          <div className="mt-2.5">
            <label className="sr-only" htmlFor="trip-start">
              {t('form.startLabel')}
            </label>
            <input
              id="trip-start"
              type="text"
              autoComplete="street-address"
              enterKeyHint="next"
              maxLength={200}
              value={form.start_location}
              onChange={(event) => onPatch({ start_location: event.target.value })}
              placeholder={t('form.startPlaceholder')}
              aria-required="true"
              aria-invalid={Boolean(errors?.start_location) || undefined}
              aria-describedby={errors?.start_location ? 'trip-start-error' : undefined}
              className={cn('input', errors?.start_location && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100')}
            />
          </div>
        )}
        <FieldError id="trip-start-error" message={errorText('start_location')} />
      </div>
    </div>
  );
}
