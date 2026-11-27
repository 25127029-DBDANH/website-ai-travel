import { Check, Wallet } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import {
  BUDGET_PER_PERSON_PER_DAY,
  budgetPresetPatch,
  budgetPresetTotal,
  compactVnd,
  customBudgetPatch,
  toggleListValue
} from '../../lib/tripFormLogic.js';
import { INTEREST_KEYS, interestImage, MAX_INTERESTS } from '../../lib/tripOptions.js';
import { FieldError, HIGHLIGHT_RING, StepHeader } from './controls.jsx';

const TIER_KEYS = { 500_000: 'saver', 1_000_000: 'comfort', 2_000_000: 'luxe' };

const InterestGrid = memo(function InterestGrid({ interests, errorMessage, highlighted, t, onToggle }) {
  const selectedSet = new Set(interests);
  const atMax = interests.length >= MAX_INTERESTS;

  return (
    <div className={cn('min-w-0', highlighted && HIGHLIGHT_RING)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id="trip-interests-label" className="label mb-0">
          {t('form.interests.label')} <span aria-hidden="true" className="text-rose-600">*</span>
        </span>
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs font-bold tabular-nums', atMax ? 'text-amber-700' : 'text-slate-600')}
        >
          {t('form.interests.count', { count: interests.length })}
        </span>
      </div>
      <p id="trip-interests-hint" className="mb-2.5 mt-0.5 text-xs text-slate-600">
        {atMax ? t('form.interests.max') : t('form.interests.hint')}
      </p>
      <div
        id="trip-interests"
        tabIndex={-1}
        role="group"
        aria-labelledby="trip-interests-label"
        aria-describedby={errorMessage ? 'trip-interests-error' : 'trip-interests-hint'}
        aria-invalid={Boolean(errorMessage) || undefined}
        className="grid grid-cols-2 gap-2.5 outline-none sm:grid-cols-4 lg:grid-cols-6"
      >
        {INTEREST_KEYS.map((key) => {
          const selected = selectedSet.has(key);
          const blocked = !selected && atMax;
          const label = t(`form.interest.${key}`);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-disabled={blocked || undefined}
              onClick={() => {
                if (blocked) return;
                onToggle(key);
              }}
              className={cn(
                'group flex min-w-0 flex-col overflow-hidden rounded-xl border p-1 text-left transition-[border-color,background-color,opacity,transform] duration-150 active:scale-[0.98]',
                selected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-brand-300',
                blocked && 'cursor-not-allowed opacity-50 hover:border-slate-200 active:scale-100'
              )}
            >
              <span className="relative block overflow-hidden rounded-lg bg-slate-100">
                <img
                  src={interestImage(key)}
                  alt={label}
                  loading="lazy"
                  decoding="async"
                  width="240"
                  height="180"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border transition-colors',
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-white bg-white/90 text-transparent'
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </span>
              {/* Tên truy cập lấy từ alt của ảnh, nhãn chữ chỉ để nhìn (tránh đọc lặp 2 lần). */}
              <span
                aria-hidden="true"
                className={cn(
                  'block px-1 pb-0.5 pt-1.5 text-xs font-bold leading-snug',
                  selected ? 'text-brand-800' : 'text-slate-800'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError id="trip-interests-error" message={errorMessage} />
    </div>
  );
});

export default function StepVibe({
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

  const interests = Array.isArray(form.interests) ? form.interests : [];
  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;
  const interestsRef = useRef(interests);
  interestsRef.current = interests;
  const handleToggleInterest = useCallback((key) => {
    onPatchRef.current({ interests: toggleListValue(interestsRef.current, key) });
  }, []);

  const draftNumber = budgetDraft !== null ? Number(String(budgetDraft).trim()) : NaN;
  const effectiveBudget = Number.isFinite(draftNumber) && draftNumber > 0 ? Math.round(draftNumber) : form.budget;
  const perPersonPerDay = Math.round(effectiveBudget / Math.max(1, (form.group_size || 1) * (form.days || 1)));

  return (
    <div className="space-y-6">
      <StepHeader headingRef={headingRef} title={t('form.step.vibe.title')} hint={t('form.step.vibe.hint')} />

      <InterestGrid
        interests={interests}
        errorMessage={errorText('interests')}
        highlighted={Boolean(highlighted?.has('interests'))}
        t={t}
        onToggle={handleToggleInterest}
      />

      <div className={cn('space-y-4 border-t border-slate-200/80 pt-6', hl('budget'))}>
        <fieldset className="min-w-0">
          <legend className="label">{t('form.budgetTier.label')}</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {BUDGET_PER_PERSON_PER_DAY.map((perPerson) => {
              const tierKey = TIER_KEYS[perPerson];
              const total = budgetPresetTotal(perPerson, form.days, form.group_size);
              const active = form.budget_preset === perPerson && form.budget === total;
              return (
                <button
                  key={perPerson}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onBudgetDraftChange(null);
                    onPatch(budgetPresetPatch(form, perPerson));
                  }}
                  className={cn(
                    'flex flex-col items-start rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] sm:min-h-24',
                    active
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-brand-300'
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className={cn('font-display text-sm font-extrabold', active ? 'text-brand-800' : 'text-slate-900')}>
                      {t(`form.budgetTier.${tierKey}.title`)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                        active
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-200 bg-white text-transparent'
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </span>
                  <span className="mt-1 text-xs leading-snug text-slate-600">
                    {t(`form.budgetTier.${tierKey}.desc`, { amount: compactVnd(perPerson, lang) })}
                  </span>
                  <span className="mt-auto pt-2 text-xs font-bold tabular-nums text-slate-800">
                    {t('form.budgetTier.total', { total: formatVnd(total, lang) })}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="min-w-0 max-w-sm">
          <div className="flex items-baseline justify-between gap-2">
            <label className="label" htmlFor="trip-budget">
              {t('form.budgetTotalLabel')}
            </label>
            {form.budget_preset === null && (
              <span className="text-xs font-semibold text-slate-600">{t('form.budgetCustomTag')}</span>
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
              enterKeyHint="done"
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
          <p id="trip-budget-summary" className="mt-1.5 text-xs font-semibold tabular-nums text-slate-700">
            {t('form.budgetBreakdown', {
              perPerson: compactVnd(perPersonPerDay, lang),
              total: formatVnd(effectiveBudget, lang),
              count: form.group_size,
              days: form.days
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
