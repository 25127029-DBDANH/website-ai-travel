import { Bike, Bus, Car, Check, Footprints, Heart, User, Users, UsersRound } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { companionsPatch, groupSizePatch } from '../../lib/tripFormLogic.js';
import { suggestTransport, TRIP_OPTION_VALUES } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, StepHeader, Stepper, ToggleOption } from './controls.jsx';

const COMPANION_ICONS = { solo: User, couple: Heart, friends: Users, family: UsersRound };
const TRANSPORT_ICONS = { grab_bike: Bike, grab_car: Car, public: Bus, walk: Footprints };

export default function StepWho({ form, onPatch, errors, t, highlighted, headingRef }) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');
  const suggested = suggestTransport(form);
  const walkDisabled = form.mobility === 'limited';

  return (
    <div className="space-y-6">
      <StepHeader headingRef={headingRef} title={t('form.step.who.title')} hint={t('form.step.who.hint')} />

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
                  'relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300'
                )}
              >
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-bold">{t(`form.option.companions.${option}`)}</span>
                <span className="text-[11px] font-medium leading-snug text-slate-600">
                  {t(`form.companion.${option}.desc`)}
                </span>
              </button>
            );
          })}
        </div>
        <FieldError id="trip-companions-error" message={errorText('companions')} />
      </fieldset>

      <div className={cn('min-w-0 max-w-sm', hl('group_size'))}>
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
            <span className="text-xs font-medium text-slate-600">{t('form.options.groupFixed')}</span>
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

      <fieldset className={cn('min-w-0', hl('transport_mode'))}>
        <legend className="label">{t('form.options.transport_mode')}</legend>
        <p id="trip-transport-hint" className="-mt-0.5 mb-2 text-xs text-slate-600">
          {walkDisabled ? t('form.transportWalkDisabled') : t('form.transport.hint')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRIP_OPTION_VALUES.transport_mode.map((mode) => {
            const Icon = TRANSPORT_ICONS[mode];
            const selected = form.transport_mode === mode;
            const disabled = walkDisabled && mode === 'walk';
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={selected}
                aria-describedby="trip-transport-hint"
                disabled={disabled}
                onClick={() => onPatch({ transport_mode: mode, transport_manual: true })}
                className={cn(
                  'relative flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-snug">{t(`form.option.transport_mode.${mode}`)}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" strokeWidth={3} aria-hidden="true" />}
                {suggested === mode && (
                  <span className="absolute -top-2 right-2 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[10px] font-bold text-emerald-800">
                    {t('form.transport.suggested')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
