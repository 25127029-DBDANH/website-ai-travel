import { CalendarDays, Sparkles, Wallet } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { DEMO, Black } from '../../demo.jsx';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDayLabel, formatVnd } from '../../lib/format.js';
import BudgetOverview from './BudgetOverview.jsx';
import EmptyItinerary from './EmptyItinerary.jsx';
import PlanLoading from './PlanLoading.jsx';
import TimelineItem from './TimelineItem.jsx';
import TransitConnector from './TransitConnector.jsx';

const TripMap = lazy(() => import('./TripMap.jsx'));

const ROUTE_EASE = [0.23, 1, 0.32, 1];

// Tuyến đường được "vẽ" một lần khi lịch trình mới xuất hiện: đường ray chạy trước, điểm dừng hạ xuống theo sau.
const ROUTE_LINE = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 0.55, ease: ROUTE_EASE } }
};

const ROUTE_STOP = {
  hidden: { opacity: 0, y: 10 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, delay: 0.14 + Math.min(index, 5) * 0.06, ease: ROUTE_EASE }
  })
};

const STATUS_STYLES = {
  draft: {
    labelKey: 'itinerary.status.draft',
    pill: 'border-slate-200 bg-slate-50 text-slate-500',
    dot: 'bg-slate-400'
  },
  asking: {
    labelKey: 'itinerary.status.asking',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500 animate-pulse-soft'
  },
  generating: {
    labelKey: 'itinerary.status.generating',
    pill: 'border-brand-200 bg-brand-50 text-brand-700',
    dot: 'bg-brand-500 animate-pulse-soft'
  },
  completed: {
    labelKey: 'itinerary.status.completed',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500'
  }
};

export default function ItineraryPanel({
  trip,
  items = [],
  budget,
  status,
  activeDay,
  onSelectDay,
  onSwap,
  swappingKey,
  loading,
  actions,
  className,
  demo = DEMO
}) {
  const { lang, t } = useI18n();
  const state = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const [focusRequest, setFocusRequest] = useState(null);
  const reduced = useReducedMotion();
  const revealedRoute = useRef('');

  const routeSignature = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.day_number}.${item.order_index}.${item.place_id || item.place_name}`
        )
        .join('|'),
    [items]
  );

  // Chỉ chạy hiệu ứng khi tuyến đường vừa xuất hiện, không phát lại lúc đổi tab ngày hay hoán đổi điểm dừng.
  const drawRoute = Boolean(routeSignature) && !reduced && revealedRoute.current !== routeSignature;

  useEffect(() => {
    if (routeSignature) revealedRoute.current = routeSignature;
  }, [routeSignature]);

  const handleLocate = (item) => {
    setFocusRequest({
      key: `${item.day_number}-${item.order_index}`,
      token: Date.now()
    });
  };

  const handleSelectDay = (day) => {
    setFocusRequest(null);
    onSelectDay(day);
  };

  const itemsByDay = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (!map.has(item.day_number)) map.set(item.day_number, []);
      map.get(item.day_number).push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order_index - b.order_index);
    }
    return map;
  }, [items]);

  const dayItems = itemsByDay.get(activeDay) || [];
  const dayCount = Number(trip?.days) || 1;
  const dayPhotos = useMemo(
    () => dayItems.filter((item) => item.photo_url).slice(0, 8),
    [dayItems]
  );

  if (demo) {
    return (
      <section
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-900/5',
          className
        )}
        aria-label={t('itinerary.title')}
      >
        <header className="border-b border-slate-200/80 bg-gradient-to-b from-brand-50/60 to-white px-3 py-2.5 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm sm:h-7 sm:w-7">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                <h2 className="font-display text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-lg">
                  {t('itinerary.title')}
                </h2>
              </div>
              <Black className="ml-9 mt-2 h-3 w-40 rounded-full" />
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {actions}
              <Black className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <div className="mt-3 hidden gap-1.5 pl-9 sm:flex">
            <Black className="h-6 w-20 rounded-full" />
            <Black className="h-6 w-24 rounded-full" />
          </div>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <Black className="h-24 w-full rounded-2xl" />
          <Black className="mt-4 h-40 w-full rounded-2xl" />
          <div className="mt-4 flex gap-1.5">
            <Black className="h-7 w-20 rounded-xl" />
            <Black className="h-7 w-20 rounded-xl" />
            <Black className="h-7 w-20 rounded-xl" />
          </div>
          <div className="mt-4 grid gap-3">
            <Black className="h-24 w-full rounded-2xl" />
            <Black className="h-24 w-full rounded-2xl" />
            <Black className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-900/5',
        className
      )}
      aria-label={t('itinerary.title')}
    >
      <header className="border-b border-slate-200/80 bg-gradient-to-b from-brand-50/60 to-white px-3 py-2.5 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm sm:h-7 sm:w-7">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </span>
              <h2 className="font-display text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-lg">
                {t('itinerary.title')}
              </h2>
            </div>
            <p className="mt-1 hidden truncate pl-9 text-[11.5px] font-semibold text-slate-500 sm:block">
              {t('itinerary.subtitle', {
                days: t('common.days', { count: dayCount }),
                budget: formatVnd(trip?.budget || 0, lang)
              })}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {actions}
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold',
                state.pill
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', state.dot)} />
              {t(state.labelKey)}
            </span>
          </div>
        </div>

        <div className="mt-3 hidden flex-wrap gap-1.5 pl-9 sm:flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
            <CalendarDays className="h-3 w-3" />
            {t('common.days', { count: dayCount })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
            <Wallet className="h-3 w-3" />
            {formatVnd(trip?.budget || 0, lang)}
          </span>
          {items.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
              {t('itinerary.stops', { count: items.length })}
            </span>
          )}
        </div>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-scroll px-3 py-3 sm:px-5 sm:py-4">
        <BudgetOverview budget={budget} tripBudget={trip?.budget} />

        {loading ? (
          <PlanLoading />
        ) : items.length === 0 ? (
          <div className="mt-4">
            <EmptyItinerary status={status} />
          </div>
        ) : (
          <>
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="mt-4 h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                />
              }
            >
              <TripMap
                stops={dayItems}
                activeDay={activeDay}
                focusRequest={focusRequest}
                className="mt-4"
              />
            </Suspense>

            {dayPhotos.length > 0 && (
              <div className="scrollbar-thin mt-4 flex gap-2 overflow-x-auto pb-1" role="list">
                {dayPhotos.map((item) => (
                  <button
                    key={`gallery-${item.place_id || item.place_name}-${item.order_index}`}
                    type="button"
                    onClick={() => handleLocate(item)}
                    aria-label={`${t('itinerary.card.showOnMap')}: ${item.place_name}`}
                    className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:scale-[0.97]"
                  >
                    <img
                      src={assetUrl(item.photo_url)}
                      alt={item.place_name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out-strong group-hover:scale-110"
                    />
                    <span className="absolute bottom-1 right-1 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                      {item.order_index}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="scrollbar-thin mt-4 flex gap-1.5 overflow-x-auto pb-1">
              {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
                const count = itemsByDay.get(day)?.length || 0;
                const isActive = day === activeDay;
                const label = formatDayLabel(lang, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    aria-label={t('itinerary.dayTabLabel', { day: label, count })}
                    aria-pressed={isActive}
                    className={cn(
                      'touch-target shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-[transform,color,border-color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.97]',
                      isActive
                        ? 'border-brand-500 bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                    )}
                  >
                    {label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[9px]',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-3">
              <motion.div
                aria-hidden="true"
                variants={ROUTE_LINE}
                initial={drawRoute ? 'hidden' : false}
                animate="visible"
                className="absolute bottom-5 left-[19px] top-4 hidden w-px origin-top bg-gradient-to-b from-brand-200 via-slate-200 to-transparent sm:block"
              />
              {dayItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
                  <p className="text-xs font-bold text-slate-600">{t('itinerary.noStops')}</p>
                  <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
                    {t('itinerary.noStopsBody')}
                  </p>
                </div>
              ) : (
                dayItems.map((item, index) => {
                  const key = `${item.day_number}-${item.order_index}`;
                  return (
                    <div
                      key={key}
                      id={`stop-${item.day_number}-${item.order_index}`}
                      className="scroll-mt-3"
                    >
                      {index > 0 && <TransitConnector transit={item.transit_info} />}
                      <motion.div
                        className="relative sm:pl-12"
                        variants={ROUTE_STOP}
                        custom={index}
                        initial={drawRoute ? 'hidden' : false}
                        animate="visible"
                      >
                        <span className="absolute left-[13px] top-7 z-10 hidden h-3 w-3 rounded-full border-2 border-white bg-brand-600 shadow sm:block" />
                        <TimelineItem
                          item={item}
                          onSwap={onSwap}
                          onLocate={handleLocate}
                          swapping={swappingKey === key}
                          disabled={Boolean(swappingKey)}
                        />
                      </motion.div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
