import { Check, Clock, X } from 'lucide-react';
import { preferenceOptions } from '../../i18n/translations.js';
import { getCategoryMeta } from '../../lib/categories.jsx';
import { cn } from '../../lib/cn.js';
import { PREFERENCE_CATEGORY, toggleListValue } from '../../lib/tripFormLogic.js';
import { TRIP_OPTION_VALUES } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, OptionChips, StepHeader, ToggleOption } from './controls.jsx';

export default function StepStyle({ form, onPatch, errors, t, highlighted, headingRef }) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');
  const dayHoursError = errorText('day_start') || errorText('day_end');

  return (
    <div className="space-y-5">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.style.title')}
        hint={t('form.step.style.hint')}
      />

      <div className={cn('min-w-0', hl('preferences'))}>
        <div className="flex items-baseline justify-between gap-2">
          <span id="trip-preferences-label" className="label">
            {t('form.preferencesLabel')} <span aria-hidden="true" className="text-rose-600">*</span>
          </span>
          <span className="text-xs font-medium text-slate-500">{t('form.preferencesHint')}</span>
        </div>
        <div
          id="trip-preferences"
          tabIndex={-1}
          role="group"
          aria-labelledby="trip-preferences-label"
          aria-invalid={Boolean(errors?.preferences) || undefined}
          aria-describedby={errors?.preferences ? 'trip-preferences-error' : undefined}
          className="grid grid-cols-2 gap-1.5 outline-none sm:grid-cols-3"
        >
          {preferenceOptions.map((preference) => {
            const meta = getCategoryMeta(PREFERENCE_CATEGORY[preference]);
            const Icon = meta.icon;
            const selected = form.preferences.includes(preference);
            return (
              <button
                key={preference}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onPatch({ preferences: toggleListValue(form.preferences, preference) })}
                className={cn(
                  'flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-slate-900'
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                    selected ? 'border-brand-200 bg-white text-brand-600' : meta.tile
                  )}
                >
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

      <OptionChips
        name="pace"
        values={TRIP_OPTION_VALUES.pace}
        value={form.pace}
        highlighted={highlighted?.has('pace')}
        onChange={(pace) => onPatch({ pace })}
        t={t}
      />

      <fieldset className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <legend className="label flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>
              {t('form.dayHoursLabel')}{' '}
              <span className="font-normal text-slate-500">({t('common.optional')})</span>
            </span>
          </legend>
          {(form.day_start || form.day_end) && (
            <button
              type="button"
              onClick={() => onPatch({ day_start: '', day_end: '' })}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              {t('form.dayHoursClear')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trip-day-start" className="mb-1 block text-xs font-medium text-slate-600">
              {t('form.dayStartLabel')}
            </label>
            <input
              id="trip-day-start"
              type="time"
              value={form.day_start}
              onChange={(event) => onPatch({ day_start: event.target.value })}
              aria-invalid={Boolean(errors?.day_start) || undefined}
              aria-describedby={dayHoursError ? 'trip-day-hours-error' : 'trip-day-hours-hint'}
              className={cn(
                'input',
                errors?.day_start && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              )}
            />
          </div>
          <div>
            <label htmlFor="trip-day-end" className="mb-1 block text-xs font-medium text-slate-600">
              {t('form.dayEndLabel')}
            </label>
            <input
              id="trip-day-end"
              type="time"
              value={form.day_end}
              onChange={(event) => onPatch({ day_end: event.target.value })}
              aria-invalid={Boolean(errors?.day_end) || undefined}
              aria-describedby={dayHoursError ? 'trip-day-hours-error' : 'trip-day-hours-hint'}
              className={cn(
                'input',
                errors?.day_end && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              )}
            />
          </div>
        </div>
        <FieldError id="trip-day-hours-error" message={dayHoursError} />
        {!dayHoursError && (
          <p id="trip-day-hours-hint" className="mt-1.5 text-xs text-slate-600">
            {t('form.dayHoursHint')}
          </p>
        )}
      </fieldset>

      <ToggleOption
        id="trip-prefer-indoor"
        label={t('form.preferIndoorLabel')}
        hint={t('form.preferIndoorHint')}
        checked={Boolean(form.prefer_indoor)}
        onChange={(prefer_indoor) => onPatch({ prefer_indoor })}
      />
    </div>
  );
}
