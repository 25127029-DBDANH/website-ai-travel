import { CircleDollarSign, TrendingUp, Wallet } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';

const HEALTH = {
  under_budget: {
    labelKey: 'itinerary.budget.health.under',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bar: 'from-emerald-500 to-teal-400',
    dot: 'bg-emerald-500'
  },
  near_budget: {
    labelKey: 'itinerary.budget.health.near',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    bar: 'from-amber-500 to-orange-400',
    dot: 'bg-amber-500'
  },
  over_budget: {
    labelKey: 'itinerary.budget.health.over',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    bar: 'from-rose-500 to-red-400',
    dot: 'bg-rose-500'
  }
};

export default function BudgetOverview({ budget, tripBudget }) {
  const { lang, t } = useI18n();
  const totalBudget = budget?.total_budget ?? tripBudget ?? 0;
  const summary = budget || null;
  const health = HEALTH[summary?.health] || HEALTH.under_budget;
  const rawPercentage = Math.max(0, Number(summary?.percentage) || 0);
  const percentage = Math.min(100, rawPercentage);
  const overBudget = summary?.health === 'over_budget';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-brand-100/60 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="hidden h-9 w-9 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700 sm:grid">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {t('itinerary.budget.title')}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {summary ? t('itinerary.budget.estimated') : t('itinerary.budget.total')}
              </p>
            </div>
          </div>

          {summary ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold',
                health.badge
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', health.dot)} />
              {t(health.labelKey)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
              VND
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 sm:mt-3">
          <p className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {formatVnd(summary ? summary.total_estimated : totalBudget, lang)}
          </p>
          <p className="pb-0.5 text-[11px] font-semibold text-slate-500 sm:pb-1">
            {summary ? (
              <>
                {t('itinerary.budget.of', { budget: formatVnd(totalBudget, lang) })}
                <span className={cn('ml-1.5 font-bold', overBudget ? 'text-rose-600' : 'text-slate-500')}>
                  ({t('itinerary.budget.percent', { percent: Math.round(rawPercentage) })})
                </span>
              </>
            ) : (
              ''
            )}
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={t('itinerary.budget.title')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary ? Math.round(percentage) : undefined}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mt-2 sm:h-2"
        >
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out-strong',
              summary ? health.bar : 'from-brand-500 to-accent-500'
            )}
            style={{ width: `${summary ? percentage : 0}%` }}
          />
        </div>

        {summary ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
            <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-900/5 sm:px-3 sm:py-2">
              <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                <CircleDollarSign className="h-3 w-3" />
                {t('itinerary.budget.activities')}
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-slate-700 sm:text-sm">
                {formatVnd(summary.activities_cost, lang)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-900/5 sm:px-3 sm:py-2">
              <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                <TrendingUp className="h-3 w-3" />
                {t('itinerary.budget.transit')}
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-slate-700 sm:text-sm">
                {formatVnd(summary.transit_cost, lang)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] font-medium text-slate-500">{t('itinerary.budget.pending')}</p>
        )}

        {overBudget ? (
          <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[10.5px] font-medium leading-relaxed text-rose-700">
            {t('itinerary.budget.overHint')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
