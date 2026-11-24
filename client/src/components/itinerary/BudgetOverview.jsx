import { ChevronDown, Wallet } from 'lucide-react';
import { useId, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';

const HEALTH = {
  under_budget: {
    labelKey: 'itinerary.budget.health.under',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500'
  },
  near_budget: {
    labelKey: 'itinerary.budget.health.near',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500'
  },
  over_budget: {
    labelKey: 'itinerary.budget.health.over',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500'
  }
};

export default function BudgetOverview({
  budget,
  tripBudget,
  dayEstimated = null,
  activeDay = null,
  memberCount = 1,
  className
}) {
  const { lang, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const totalBudget = budget?.total_budget ?? tripBudget ?? 0;
  const summary = budget || null;
  const health = HEALTH[summary?.health] || HEALTH.under_budget;
  const rawPercentage = Math.max(0, Number(summary?.percentage) || 0);
  const percentage = Math.min(100, rawPercentage);
  const overBudget = summary?.health === 'over_budget';
  const effectiveMembers = summary?.member_count || memberCount || 1;
  const displayAmount = summary ? summary.total_estimated : totalBudget;

  return (
    <section
      aria-label={t('itinerary.budget.title')}
      className={cn(
        'border-b border-slate-200/80 bg-slate-50/70',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={expanded ? t('itinerary.budget.hideDetails') : t('itinerary.budget.showDetails')}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-100/70"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate text-xs text-slate-600">
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatVnd(displayAmount, lang)}
            </span>
            {summary && totalBudget > 0 ? (
              <span className="ml-1 text-slate-500 tabular-nums">
                / {formatVnd(totalBudget, lang)}
              </span>
            ) : null}
          </span>
          {summary ? (
            <span
              className={cn(
                'hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline-flex',
                health.badge
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', health.dot)} aria-hidden="true" />
              {t(health.labelKey)}
            </span>
          ) : null}
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
          {summary ? (
            <span className={cn('tabular-nums', overBudget ? 'text-rose-600' : 'text-slate-500')}>
              {Math.round(rawPercentage)}%
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform duration-200 ease-out-strong',
              expanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded ? (
        <div id={detailsId} className="space-y-3 border-t border-slate-200/70 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              {summary ? t('itinerary.budget.estimated') : t('itinerary.budget.total')}
              {effectiveMembers > 1 && summary
                ? ` · ~${formatVnd(
                    summary.per_person_estimated || Math.round(summary.total_estimated / effectiveMembers),
                    lang
                  )}/${lang === 'vi' ? 'người' : 'person'}`
                : ''}
            </span>
            {summary ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:hidden',
                  health.badge
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', health.dot)} aria-hidden="true" />
                {t(health.labelKey)}
              </span>
            ) : null}
          </div>

          <div
            role="progressbar"
            aria-label={t('itinerary.budget.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary ? Math.round(percentage) : undefined}
            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-out-strong',
                summary ? health.bar : 'bg-brand-600'
              )}
              style={{ width: `${summary ? percentage : 0}%` }}
            />
          </div>

          {summary ? (
            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-medium text-slate-500">
                  {t('itinerary.budget.activities')}
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {formatVnd(summary.activities_cost, lang)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-slate-500">
                  {t('itinerary.budget.transit')}
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                  {formatVnd(summary.transit_cost, lang)}
                </dd>
              </div>
              {dayEstimated !== null && activeDay ? (
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-[11px] font-medium text-slate-500">
                    {lang === 'vi' ? `Dự kiến Ngày ${activeDay}` : `Day ${activeDay} est.`}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-brand-700 tabular-nums">
                    {formatVnd(dayEstimated, lang)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-xs text-slate-500">{t('itinerary.budget.pending')}</p>
          )}

          {overBudget ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {t('itinerary.budget.overHint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
