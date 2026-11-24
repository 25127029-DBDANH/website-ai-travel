import { Wallet } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import {
  BUDGET_PER_PERSON_PER_DAY,
  budgetPresetPatch,
  budgetPresetTotal,
  compactVnd,
  customBudgetPatch
} from '../../lib/tripFormLogic.js';
import { FieldError, HIGHLIGHT_RING, StepHeader } from './controls.jsx';

export default function StepBudget({
  form,
  onPatch,
  errors,
  t,
  lang,
  highlighted,
  headingRef,
  budgetDraft,
  onBudgetDraftChange
}) {
  const hl = (key) => (highlighted?.has(key) ? HIGHLIGHT_RING : '');
  const errorText = (field) => (errors?.[field] ? t(`form.validation.${errors[field]}`) : '');

  const draftNumber = budgetDraft !== null ? Number(String(budgetDraft).trim()) : NaN;
  const effectiveBudget =
    Number.isFinite(draftNumber) && draftNumber > 0 ? Math.round(draftNumber) : form.budget;
  const perPersonPerDay = Math.round(
    effectiveBudget / Math.max(1, (form.group_size || 1) * (form.days || 1))
  );

  return (
    <div className="space-y-5">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.budget.title')}
        hint={t('form.step.budget.hint')}
      />

      <fieldset className={cn('min-w-0', hl('budget'))}>
        <legend className="label">{t('form.budgetPresets')}</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('form.budgetPresets')}>
          {BUDGET_PER_PERSON_PER_DAY.map((perPerson) => {
            const total = budgetPresetTotal(perPerson, form.days, form.group_size);
            const active = form.budget_preset === perPerson && form.budget === total;
            return (
              <button
                key={perPerson}
                type="button"
                aria-pressed={active}
                aria-label={t('form.budgetPresetLabel', {
                  amount: compactVnd(perPerson, lang),
                  total: compactVnd(total, lang)
                })}
                onClick={() => {
                  onBudgetDraftChange(null);
                  onPatch(budgetPresetPatch(form, perPerson));
                }}
                className={cn(
                  'flex min-h-14 flex-col items-start justify-center rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-slate-900'
                )}
              >
                <span className="font-display text-sm font-extrabold tabular-nums">
                  {t('form.budgetPreset', { amount: compactVnd(perPerson, lang) })}
                </span>
                <span className="mt-0.5 text-xs font-medium tabular-nums text-slate-600">
                  = {compactVnd(total, lang)} ₫
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <label className="label" htmlFor="trip-budget">
            {t('form.budgetTotalLabel')} <span aria-hidden="true" className="text-rose-600">*</span>
          </label>
          {form.budget_preset === null && (
            <span className="text-xs font-semibold text-slate-500">{t('form.budgetCustomTag')}</span>
          )}
        </div>
        <div className="relative">
          <Wallet
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-600"
            aria-hidden="true"
          />
          <input
            id="trip-budget"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000000000"
            step="50000"
            value={budgetDraft ?? String(form.budget)}
            onChange={(event) => {
              onBudgetDraftChange(event.target.value);
              onPatch(customBudgetPatch(form, event.target.value));
            }}
            onBlur={() => {
              if (budgetDraft !== null && Number(budgetDraft) > 0) onBudgetDraftChange(null);
            }}
            aria-required="true"
            aria-invalid={Boolean(errors?.budget) || undefined}
            aria-describedby={errors?.budget ? 'trip-budget-error' : 'trip-budget-summary'}
            className={cn(
              'input pl-10 pr-14 font-semibold tabular-nums',
              errors?.budget && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            )}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold tracking-wider text-slate-500">
            VND
          </span>
        </div>
        <FieldError id="trip-budget-error" message={errorText('budget')} />
      </div>

      <p
        id="trip-budget-summary"
        role="status"
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold tabular-nums text-slate-800 sm:text-sm"
      >
        {t('form.budgetBreakdown', {
          perPerson: compactVnd(perPersonPerDay, lang),
          total: formatVnd(effectiveBudget, lang),
          count: form.group_size,
          days: form.days
        })}
      </p>
    </div>
  );
}
