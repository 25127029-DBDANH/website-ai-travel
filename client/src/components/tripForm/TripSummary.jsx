import { ChevronUp, MapPinned, Pencil } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { compactVnd, derivePace } from '../../lib/tripFormLogic.js';
import { stayAreaForLocation } from '../../lib/tripOptions.js';

const BUDGET_TIER_KEYS = { 500_000: 'saver', 1_000_000: 'comfort', 2_000_000: 'luxe' };

export function stayLabel(form, t) {
  const key = stayAreaForLocation(form.start_location);
  if (key) return t(`form.stay.${key}.label`);
  return String(form.start_location || '').split(',')[0].trim() || t('form.summary.none');
}

function buildRows(form, t, lang) {
  const interests = Array.isArray(form.interests) ? form.interests : [];
  const perPersonPerDay = Math.round(
    (Number(form.budget) || 0) / Math.max(1, (form.group_size || 1) * (form.days || 1))
  );
  const pace = derivePace(form);
  const paceLabel = t(`form.option.pace.${pace}`);
  const paceValue = form.pace_override ? paceLabel : t('form.summary.paceAuto', { pace: paceLabel });
  const tierKey = BUDGET_TIER_KEYS[form.budget_preset];
  const budgetTierLabel = tierKey ? t(`form.budgetTier.${tierKey}.title`) : t('form.budgetCustomTag');
  const groupTags = [
    t(`form.option.companions.${form.companions}`),
    t('form.options.groupCount', { count: form.group_size }),
    form.has_children ? t('form.field.has_children') : null,
    form.has_elderly ? t('form.field.has_elderly') : null,
    t(`form.option.transport_mode.${form.transport_mode}`)
  ].filter(Boolean);
  const extras = [
    form.must_visit?.length ? t('form.summary.mustVisitCount', { count: form.must_visit.length }) : null,
    form.avoid_districts?.length ? t('form.field.avoid_districts', { value: form.avoid_districts.join(', ') }) : null,
    form.dietary?.length ? form.dietary.map((item) => t(`form.option.dietary.${item}`)).join(', ') : null,
    form.day_start && form.day_end ? `${form.day_start} – ${form.day_end}` : null,
    form.prefer_indoor ? t('form.finetune.indoorOn') : null
  ].filter(Boolean);

  return [
    {
      id: 'days',
      step: 'when_where',
      label: t('form.summary.days'),
      value: `${t('common.days', { count: form.days })} · ${form.travel_date || t('form.review.flexibleDate')}`
    },
    { id: 'area', step: 'when_where', label: t('form.summary.area'), value: stayLabel(form, t) },
    { id: 'group', step: 'who', label: t('form.summary.group'), value: groupTags.join(' · ') },
    {
      id: 'interests',
      step: 'vibe',
      label: t('form.summary.interests'),
      value: interests.length ? interests.map((key) => t(`form.interest.${key}`)).join(', ') : t('form.summary.none'),
      chips: interests.map((key) => t(`form.interest.${key}`))
    },
    {
      id: 'budget',
      step: 'vibe',
      label: t('form.summary.budget'),
      value: `${budgetTierLabel} · ${formatVnd(Number(form.budget) || 0, lang)}`,
      sub: t('form.summary.perPersonDay', { amount: compactVnd(perPersonPerDay, lang) })
    },
    {
      id: 'pace',
      step: 'finetune',
      label: t('form.summary.pace'),
      value: paceValue
    },
    ...(extras.length ? [{ id: 'extras', step: 'finetune', label: t('form.summary.extras'), value: extras.join(' · ') }] : [])
  ];
}

function MatchCount({ matchInfo, t }) {
  return (
    <p role="status" aria-live="polite" className="min-h-0">
      {matchInfo && Number.isInteger(matchInfo.count) && (
        <span className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          <MapPinned className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('form.summary.matchCount', { count: matchInfo.count })}
        </span>
      )}
    </p>
  );
}

function SummaryRows({ rows, onEdit, currentStep, t }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onEdit(row.step)}
            aria-current={row.step === currentStep ? 'step' : undefined}
            className="group flex w-full items-start gap-2 rounded-lg px-1.5 py-2.5 text-left transition-colors hover:bg-slate-50"
          >
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-[11px] font-bold',
                  row.step === currentStep ? 'text-brand-700' : 'text-slate-600'
                )}
              >
                {row.label}
              </span>
              {row.chips?.length ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  {row.chips.map((chip) => (
                    <span
                      key={chip}
                      className="max-w-full break-words rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800"
                    >
                      {chip}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="mt-0.5 block break-words text-sm font-semibold leading-snug tabular-nums text-slate-900">
                  {row.value}
                </span>
              )}
              {row.sub && <span className="mt-0.5 block break-words text-xs tabular-nums text-slate-600">{row.sub}</span>}
            </span>
            <Pencil
              className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600"
              aria-hidden="true"
            />
            <span className="sr-only">{t('form.wizard.edit')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Cột phải trên desktop.
export function TripSummaryAside({ form, t, lang, matchInfo, onEdit, currentStep }) {
  const rows = buildRows(form, t, lang);
  return (
    <aside
      aria-labelledby="trip-summary-title"
      className="sticky top-20 hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-card lg:block"
    >
      <h3 id="trip-summary-title" className="font-display text-base font-extrabold text-slate-900">
        {t('form.summary.title')}
      </h3>
      <p className="mt-0.5 text-xs text-slate-600">{t('form.summary.editHint')}</p>
      <div className="mt-3">
        <MatchCount matchInfo={matchInfo} t={t} />
      </div>
      <div className="mt-1">
        <SummaryRows rows={rows} onEdit={onEdit} currentStep={currentStep} t={t} />
      </div>
    </aside>
  );
}

// Thanh dính đáy trên mobile, mở rộng được.
export function TripSummarySheet({ form, t, lang, matchInfo, onEdit, currentStep, open, onToggle }) {
  const rows = buildRows(form, t, lang);
  const interestsCount = Array.isArray(form.interests) ? form.interests.length : 0;
  return (
    <div className="mb-3 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="trip-summary-sheet"
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold text-slate-600">{t('form.summary.title')}</span>
          <span className="block truncate text-xs font-semibold text-slate-900">
            {t('form.summary.compact', {
              days: t('common.days', { count: form.days }),
              area: stayLabel(form, t),
              count: interestsCount
            })}
          </span>
        </span>
        <span className="sr-only">{open ? t('form.summary.hide') : t('form.summary.show')}</span>
        <ChevronUp
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200', !open && 'rotate-180')}
        />
      </button>
      <div id="trip-summary-sheet" hidden={!open} className="mt-2 max-h-[45dvh] overflow-y-auto px-0.5">
        <MatchCount matchInfo={matchInfo} t={t} />
        <SummaryRows
          rows={rows}
          currentStep={currentStep}
          t={t}
          onEdit={(stepId) => {
            onToggle(false);
            onEdit(stepId);
          }}
        />
      </div>
    </div>
  );
}
