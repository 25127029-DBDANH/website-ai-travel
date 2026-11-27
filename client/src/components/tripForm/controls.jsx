import { ArrowLeft, ArrowRight, Check, ChevronDown, Info, LayoutGrid, Loader2, Minus, Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { toggleListValue } from '../../lib/tripFormLogic.js';

export const HIGHLIGHT_RING =
  'rounded-2xl ring-2 ring-emerald-300 ring-offset-2 ring-offset-white transition-shadow';

export function StepHeader({ headingRef, title, hint, badge }) {
  return (
    <header className="space-y-1">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="flex flex-wrap items-center gap-2 font-display text-lg font-extrabold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:text-xl"
      >
        {title}
        {badge && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-sans text-[11px] font-bold tracking-normal text-slate-600">
            {badge}
          </span>
        )}
      </h3>
      {hint && <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{hint}</p>}
    </header>
  );
}

export function Stepper({
  id,
  labelledBy,
  value,
  label,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  describedBy,
  invalid
}) {
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      tabIndex={-1}
      className={cn(
        'flex items-center justify-between rounded-xl border bg-white p-1 outline-none',
        invalid ? 'border-rose-400' : 'border-slate-200'
      )}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={decreaseLabel}
        className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-slate-200 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="font-display text-base font-extrabold tabular-nums text-slate-900">
        {label}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={increaseLabel}
        className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white shadow-sm transition-[transform,background-color] duration-150 ease-out-strong hover:bg-brand-700 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function OptionChips({
  name,
  values,
  value,
  onChange,
  multiple = false,
  highlighted = false,
  disabledValues = [],
  t: tProp
}) {
  const i18n = useI18n();
  const t = tProp || i18n.t;

  return (
    <fieldset className={cn('min-w-0', highlighted && HIGHLIGHT_RING)}>
      <legend className="label">{t(`form.options.${name}`)}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((option) => {
          const selected = multiple ? value.includes(option) : value === option;
          const disabled = disabledValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(multiple ? toggleListValue(value, option) : option)}
              className={cn(
                'min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
                selected
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-slate-900'
              )}
            >
              {t(`form.option.${name}.${option}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ToggleOption({ id, label, hint, checked, onChange, highlighted = false }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
        checked
          ? 'border-brand-500 bg-brand-50/70 text-slate-900'
          : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300',
        highlighted && HIGHLIGHT_RING
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-600">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-colors',
          checked
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300 bg-white text-transparent'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export function FieldError({ id, message }) {
  return message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">
      {message}
    </p>
  ) : null;
}

export function WizardBanners({ parseSummary, notices, onDismissParse, onDismissNotices, t }) {
  return (
    <>
      {parseSummary && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900"
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('form.sentence.parsed', { count: parseSummary.count })}
            </p>
            <p className="mt-1 text-emerald-800">{parseSummary.badges.join(' · ')}</p>
            {parseSummary.missing.length > 0 && (
              <p className="mt-1 text-emerald-800/90">
                {t('form.sentence.missing', { list: parseSummary.missing.join(', ') })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onDismissParse}
            aria-label={t('form.wizard.dismiss')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-emerald-800 hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {notices.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-800"
        >
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="space-y-1">
              {notices.map((key) => (
                <p key={key}>{t(key)}</p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissNotices}
            aria-label={t('form.wizard.dismiss')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-brand-700 hover:bg-brand-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

export function Accordion({ id, title, summary, open, onToggle, children }) {
  const buttonId = `${id}-toggle`;
  const panelId = `${id}-panel`;
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <h4 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-1 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-600">{summary}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out-strong',
              open && 'rotate-180'
            )}
          />
        </button>
      </h4>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-1 pb-4">
        {children}
      </div>
    </section>
  );
}

export function SubmitLabel({ submitting, submissionStage, t }) {
  if (!submitting) {
    return (
      <>
        {t('form.submit')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </>
    );
  }
  return (
    <>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {submissionStage === 'concept'
        ? t('form.stage.concept')
        : submissionStage === 'generate'
          ? t('form.stage.generate')
          : t('form.stage.save')}
    </>
  );
}

// Thanh hành động của wizard. Trên mobile dính đáy và chứa luôn thẻ tóm tắt (summarySlot).
export function WizardFooter({
  step,
  currentIndex,
  submitting,
  submissionStage,
  onBack,
  onNext,
  onFinetune,
  canSubmit,
  summarySlot,
  t
}) {
  const isFirst = currentIndex === 0;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-5 rounded-b-3xl border-t border-slate-200 bg-white px-4 pt-3 safe-bottom sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-4">
      {summarySlot}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="btn-secondary min-h-11 px-4 text-sm">
          {isFirst ? (
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isFirst ? t('form.wizard.backToStart') : t('form.wizard.back')}</span>
        </button>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {step === 'vibe' && (
            <button
              type="button"
              onClick={onFinetune}
              className="btn-ghost min-h-11 px-3.5 text-sm font-semibold text-slate-700"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t('form.wizard.finetune')}
            </button>
          )}

          {canSubmit ? (
            <button type="submit" disabled={submitting} className="btn-primary min-h-12 px-5 text-sm font-bold">
              <SubmitLabel submitting={submitting} submissionStage={submissionStage} t={t} />
            </button>
          ) : (
            <button type="button" onClick={onNext} className="btn-primary min-h-11 px-5 text-sm font-bold">
              <span>{t('form.wizard.next')}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
