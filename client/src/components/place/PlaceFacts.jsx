import { Clock, Compass, Hourglass, Star, Wallet } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { openStatus } from '../../lib/placeDetail.js';

function formatVisitDuration(minutes, t) {
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) return '';
  if (total < 60) return t('place.duration.min', { min: total });
  const hr = Math.floor(total / 60);
  const min = total % 60;
  if (min === 0) return t('place.duration.hr', { hr });
  return t('place.duration.hrMin', { hr, min });
}

export default function PlaceFacts({
  place,
  stop = null,
  memberCount = 1,
  loading = false,
  now
}) {
  const { lang, t } = useI18n();
  if (!place) return null;

  const hasHours = Boolean(place.openTime && place.closeTime);
  const is24h =
    hasHours &&
    ((place.openTime === '00:00' && place.closeTime === '24:00') ||
      place.openTime === place.closeTime);
  const status = hasHours ? openStatus(place, now ?? new Date()) : { state: 'unknown' };

  const stopCost =
    stop && stop.estimated_cost !== null && stop.estimated_cost !== undefined
      ? Number(stop.estimated_cost)
      : null;
  const effectivePrice =
    stopCost !== null && Number.isFinite(stopCost) && stopCost > 0 && !(place.priceVnd > 0)
      ? stopCost
      : place.priceVnd;
  const hasPrice = effectivePrice !== null && effectivePrice !== undefined;
  const hasDuration = place.durationMin !== null && place.durationMin !== undefined;
  const hasSetting = place.isIndoor !== null && place.isIndoor !== undefined;
  const hasRating = place.rating !== null && place.rating !== undefined;

  const visibleCount = [hasHours, hasPrice, hasDuration, hasSetting, hasRating].filter(Boolean).length;

  if (visibleCount === 0 && !loading) return null;

  let statusLabel = '';
  if (is24h) {
    statusLabel = t('place.status.open24h');
  } else if (status.state === 'open') {
    statusLabel = status.closesAt
      ? t('place.status.openUntil', { time: status.closesAt })
      : t('place.status.open');
  } else if (status.state === 'closed') {
    statusLabel = status.opensAt
      ? t('place.status.closedUntil', { time: status.opensAt })
      : t('place.status.closed');
  }

  const pendingSlots = loading ? Math.max(0, 3 - visibleCount) : 0;

  return (
    <dl className="grid grid-cols-2 gap-2.5">
      {hasHours ? (
        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{t('place.fact.hours')}</span>
          </dt>
          <dd className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
              {is24h ? '24/7' : `${place.openTime} – ${place.closeTime}`}
            </span>
            {statusLabel ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  status.state === 'open'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-200/80 text-slate-700'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status.state === 'open' ? 'bg-emerald-600' : 'bg-slate-500'
                  )}
                />
                <span>{statusLabel}</span>
              </span>
            ) : null}
          </dd>
        </div>
      ) : null}

      {hasPrice ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Wallet className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{t('place.fact.cost')}</span>
          </dt>
          <dd className="mt-1 text-xs font-bold text-slate-900 tabular-nums">
            {effectivePrice > 0 ? (
              <>
                <span>
                  {formatVnd(effectivePrice, lang)}
                  {memberCount > 1 ? `/${t('place.fact.perPersonShort')}` : ''}
                </span>
                {memberCount > 1 ? (
                  <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                    {t('place.fact.groupCost', {
                      count: memberCount,
                      amount: formatVnd(effectivePrice * memberCount, lang)
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-emerald-700">{t('place.fact.free')}</span>
            )}
          </dd>
        </div>
      ) : null}

      {hasDuration ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Hourglass className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{t('place.fact.duration')}</span>
          </dt>
          <dd className="mt-1 text-xs font-bold text-slate-900">
            {formatVisitDuration(place.durationMin, t)}
          </dd>
        </div>
      ) : null}

      {hasSetting ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Compass className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{t('place.fact.setting')}</span>
          </dt>
          <dd className="mt-1 text-xs font-bold text-slate-900">
            {place.isIndoor ? t('place.fact.indoor') : t('place.fact.outdoor')}
          </dd>
        </div>
      ) : null}

      {hasRating ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>{t('place.fact.rating')}</span>
          </dt>
          <dd className="mt-1 text-xs font-bold text-slate-900 tabular-nums">
            {place.rating.toFixed(1)} / 5
          </dd>
        </div>
      ) : null}

      {Array.from({ length: pendingSlots }, (_, index) => (
        <div
          key={`fact-skeleton-${index}`}
          aria-hidden="true"
          className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3"
        >
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3.5 w-24 animate-pulse rounded bg-slate-200/80" />
        </div>
      ))}
    </dl>
  );
}
