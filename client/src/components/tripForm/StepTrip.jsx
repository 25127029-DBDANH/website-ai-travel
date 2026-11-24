import { Calendar, MapPin, Wand2, X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { daysPatch, LONG_TRIP_DAYS } from '../../lib/tripFormLogic.js';
import { addDateDays, hcmcDate, START_LOCATION_SUGGESTIONS } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, StepHeader, Stepper } from './controls.jsx';

export default function StepTrip({
  form,
  onPatch,
  errors,
  t,
  highlighted,
  headingRef,
  sentence,
  onSentenceChange,
  quickFillError,
  onQuickFill,
  sentenceRef
}) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');

  const today = hcmcDate();
  const minDate = addDateDays(today, -1);
  const maxDate = addDateDays(today, 365);

  return (
    <div className="space-y-5">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.trip.title')}
        hint={t('form.step.trip.hint')}
      />

      <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5">
        <label htmlFor="trip-quickfill" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Wand2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          {t('form.quickFill.label')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={sentenceRef}
            id="trip-quickfill"
            type="text"
            data-skip-enter="true"
            maxLength={500}
            value={sentence}
            onChange={(event) => onSentenceChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                onQuickFill();
              }
            }}
            placeholder={t('form.quickFill.placeholder')}
            aria-invalid={Boolean(quickFillError) || undefined}
            aria-describedby={quickFillError ? 'trip-quickfill-error' : 'trip-quickfill-hint'}
            className={cn(
              'input min-w-0 flex-1 bg-white py-2.5 text-base sm:text-sm',
              quickFillError && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            )}
          />
          <button
            type="button"
            onClick={() => onQuickFill()}
            className="btn-secondary min-h-11 shrink-0 border-brand-200 px-4 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            {t('form.quickFill.apply')}
          </button>
        </div>
        <FieldError id="trip-quickfill-error" message={quickFillError} />
        {!quickFillError && (
          <p id="trip-quickfill-hint" className="mt-1.5 text-xs text-slate-600">
            {t('form.quickFill.hint')}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[t('form.sentence.sample1'), t('form.sentence.sample2')].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                onSentenceChange(sample);
                onQuickFill(sample);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              “{sample}”
            </button>
          ))}
        </div>
      </div>

      <div className={cn('min-w-0', hl('start_location'))}>
        <label className="label" htmlFor="trip-start">
          {t('form.startLabel')} <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600"
            aria-hidden="true"
          />
          <input
            id="trip-start"
            type="text"
            maxLength={200}
            value={form.start_location}
            onChange={(event) => onPatch({ start_location: event.target.value })}
            placeholder={t('form.startPlaceholder')}
            aria-required="true"
            aria-invalid={Boolean(errors?.start_location) || undefined}
            aria-describedby={errors?.start_location ? 'trip-start-error' : undefined}
            className={cn(
              'input pl-10',
              errors?.start_location && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            )}
          />
        </div>
        <FieldError id="trip-start-error" message={errorText('start_location')} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {START_LOCATION_SUGGESTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onPatch({ start_location: item.value })}
              className={cn(
                'min-h-8 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                form.start_location === item.value
                  ? 'border-brand-400 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cn('min-w-0', hl('days'))}>
          <span id="trip-days-label" className="label">
            {t('form.daysLabel')} <span aria-hidden="true" className="text-rose-600">*</span>
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
            describedBy={
              errors?.days
                ? 'trip-days-error'
                : form.days > LONG_TRIP_DAYS
                  ? 'trip-days-hint'
                  : undefined
            }
            onChange={(nextDays) => onPatch(daysPatch(form, nextDays))}
          />
          <FieldError id="trip-days-error" message={errorText('days')} />
          {!errors?.days && form.days > LONG_TRIP_DAYS && (
            <p id="trip-days-hint" className="mt-1.5 text-xs text-amber-700">
              {t('form.daysLongHint')}
            </p>
          )}
        </div>

        <div className={cn('min-w-0', hl('travel_date'))}>
          <div className="flex items-baseline justify-between gap-2">
            <label className="label" htmlFor="trip-travel-date">
              {t('form.travelDateLabel')}{' '}
              <span className="font-normal text-slate-500">({t('common.optional')})</span>
            </label>
            {form.travel_date && (
              <button
                type="button"
                onClick={() => onPatch({ travel_date: '' })}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
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
              className={cn(
                'input pl-10',
                errors?.travel_date && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              )}
            />
          </div>
          <FieldError id="trip-travel-date-error" message={errorText('travel_date')} />
          {!errors?.travel_date && (
            <p id="trip-travel-date-hint" className="mt-1.5 text-xs text-slate-600">
              {t('form.travelDateHint')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
