import { Heart, User, Users } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { companionsPatch, groupSizePatch } from '../../lib/tripFormLogic.js';
import { TRIP_OPTION_VALUES } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, StepHeader, Stepper, ToggleOption } from './controls.jsx';

const COMPANION_ICONS = { solo: User, couple: Heart, friends: Users, family: Users };

export default function StepGroup({ form, onPatch, errors, t, highlighted, headingRef }) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');

  return (
    <div className="space-y-5">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.group.title')}
        hint={t('form.step.group.hint')}
      />

      <fieldset
        id="trip-companions"
        tabIndex={-1}
        aria-invalid={Boolean(errors?.companions) || undefined}
        aria-describedby={errors?.companions ? 'trip-companions-error' : undefined}
        className={cn('min-w-0 outline-none', hl('companions'))}
      >
        <legend className="label">
          {t('form.options.companions')} <span aria-hidden="true" className="text-rose-600">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRIP_OPTION_VALUES.companions.map((option) => {
            const Icon = COMPANION_ICONS[option];
            const selected = form.companions === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onPatch(companionsPatch(form, option))}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t(`form.option.companions.${option}`)}</span>
              </button>
            );
          })}
        </div>
        <FieldError id="trip-companions-error" message={errorText('companions')} />
      </fieldset>

      <div className={cn('min-w-0', hl('group_size'))}>
        <span id="trip-group-size-label" className="label">
          {t('form.options.group_size')} <span aria-hidden="true" className="text-rose-600">*</span>
        </span>
        {form.companions === 'solo' || form.companions === 'couple' ? (
          <div
            id="trip-group-size"
            aria-labelledby="trip-group-size-label"
            className="flex min-h-[3.125rem] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5"
          >
            <span className="font-display text-base font-extrabold tabular-nums text-slate-900">
              {t('form.options.groupCount', { count: form.group_size })}
            </span>
            <span className="text-xs font-medium text-slate-500">{t('form.options.groupFixed')}</span>
          </div>
        ) : (
          <Stepper
            id="trip-group-size"
            labelledBy="trip-group-size-label"
            value={form.group_size}
            min={2}
            max={20}
            label={t('form.options.groupCount', { count: form.group_size })}
            decreaseLabel={t('form.options.groupDecrease')}
            increaseLabel={t('form.options.groupIncrease')}
            invalid={Boolean(errors?.group_size)}
            describedBy={errors?.group_size ? 'trip-group-size-error' : undefined}
            onChange={(size) => onPatch(groupSizePatch(form, size))}
          />
        )}
        <FieldError id="trip-group-size-error" message={errorText('group_size')} />
      </div>

      <fieldset className="min-w-0 space-y-2">
        <legend className="label">{t('form.groupDetailsLabel')}</legend>
        <ToggleOption
          id="trip-has-children"
          label={t('form.hasChildrenLabel')}
          hint={t('form.hasChildrenHint')}
          checked={Boolean(form.has_children)}
          highlighted={highlighted?.has('has_children')}
          onChange={(has_children) => onPatch({ has_children })}
        />
        <ToggleOption
          id="trip-has-elderly"
          label={t('form.hasElderlyLabel')}
          hint={t('form.hasElderlyHint')}
          checked={Boolean(form.has_elderly)}
          highlighted={highlighted?.has('has_elderly')}
          onChange={(has_elderly) => onPatch({ has_elderly })}
        />
        <ToggleOption
          id="trip-mobility"
          label={t('form.mobilityLimitedLabel')}
          hint={t('form.mobilityLimitedHint')}
          checked={form.mobility === 'limited'}
          onChange={(limited) => onPatch({ mobility: limited ? 'limited' : 'normal' })}
        />
      </fieldset>
    </div>
  );
}
