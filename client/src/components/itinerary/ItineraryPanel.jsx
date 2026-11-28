import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CloudRain,
  Copy,
  ExternalLink,
  Share2,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOpenPlace, usePlaceDrawer } from '../../context/PlaceDrawerContext.jsx';
import { DEMO } from '../../demo.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { downloadIcsFile } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDayLabel, formatVnd } from '../../lib/format.js';
import RidePickerModal from '../common/RidePickerModal.jsx';
import Modal from '../Modal.jsx';
import BudgetOverview from './BudgetOverview.jsx';
import EmptyItinerary from './EmptyItinerary.jsx';
import OverflowMenu from './OverflowMenu.jsx';
import PlanLoading from './PlanLoading.jsx';
import TimelineItem from './TimelineItem.jsx';
import TransitConnector from './TransitConnector.jsx';

const TripMap = lazy(() => import('./TripMap.jsx'));

const NEARBY_RAIN_ALTERNATIVES = [
  {
    place_id: 'p-bao-tang-my-thuat',
    place_name: 'Bảo tàng Mỹ thuật TP.HCM',
    category: 'sightseeing',
    description: 'Tòa dinh thự kiến trúc Pháp cổ với hành lang lát gạch hoa, hoàn toàn trong nhà.',
    address: '97A Phó Đức Chính, Phường Nguyễn Thái Bình, Quận 1',
    district: 'Quận 1',
    latitude: 10.7698,
    longitude: 106.6995,
    estimated_cost: 30000,
    editorial_score: 4.8,
    is_indoor: true,
    distance_note: 'Cách 450m · Trong nhà'
  },
  {
    place_id: 'p-dinh-doc-lap-indoor',
    place_name: 'Dinh Độc Lập (Khu trưng bày & Hầm chỉ huy)',
    category: 'sightseeing',
    description: 'Di tích lịch sử có mái che rộng rãi, tham quan phòng khánh tiết và hầm chỉ huy.',
    address: '135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1',
    district: 'Quận 1',
    latitude: 10.777,
    longitude: 106.6953,
    estimated_cost: 65000,
    editorial_score: 4.8,
    is_indoor: true,
    distance_note: 'Cách 600m · Có mái che'
  },
  {
    place_id: 'p-saigon-centre-takashimaya',
    place_name: 'TTTM Saigon Centre / Takashimaya',
    category: 'shopping',
    description: 'Trung tâm mua sắm, ẩm thực và cà phê máy lạnh ngay trung tâm Quận 1.',
    address: '65 Lê Lợi, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.7733,
    longitude: 106.701,
    estimated_cost: 80000,
    editorial_score: 4.7,
    is_indoor: true,
    distance_note: 'Cách 500m · Máy lạnh'
  }
];

const NEARBY_RUSH_ALTERNATIVES = [
  {
    place_id: 'p-com-nieu-sg',
    place_name: 'Nhà hàng Cơm Niêu Sài Gòn',
    category: 'food',
    description: 'Ẩm thực truyền thống Việt Nam với niêu cơm đập, không gian ấm cúng.',
    address: '27 Tú Xương / Nguyễn Du, Quận 1',
    district: 'Quận 1',
    latitude: 10.7765,
    longitude: 106.698,
    estimated_cost: 95000,
    editorial_score: 4.6,
    distance_note: 'Cách 500m · Đi bộ 6 phút'
  },
  {
    place_id: 'p-quan-bui',
    place_name: 'Quán Bụi — Hương Vị Đồng Quê',
    category: 'food',
    description: 'Món ngon ba miền chuẩn vị gia đình ngay trung tâm Quận 1.',
    address: '19 Ngô Văn Năm, Bến Nghé, Quận 1',
    district: 'Quận 1',
    latitude: 10.781,
    longitude: 106.704,
    estimated_cost: 90000,
    editorial_score: 4.5,
    distance_note: 'Cách 750m · Gần bờ sông'
  },
  {
    place_id: 'p-bep-me-in',
    place_name: 'Bếp Mẹ Ỉn — Đặc Sản Bánh Xèo',
    category: 'food',
    description: 'Bánh xèo giòn và các món ăn đường phố Sài Gòn (Michelin Bib Gourmand).',
    address: '136 Lê Thánh Tôn, Bến Thành, Quận 1',
    district: 'Quận 1',
    latitude: 10.773,
    longitude: 106.697,
    estimated_cost: 85000,
    editorial_score: 4.7,
    distance_note: 'Cách 600m · Đi bộ 7 phút'
  }
];

const BUDGET_REPLACEMENT = {
  place_id: 'p-com-tam-ba-ghien',
  place_name: 'Cơm Tấm Ba Ghiền',
  category: 'food',
  description: 'Quán cơm tấm sườn nướng than hoa đạt chứng nhận Michelin Bib Gourmand.',
  address: '84 Đặng Văn Ngữ, Phường 10, Phú Nhuận / Q3',
  district: 'Phú Nhuận',
  latitude: 10.7925,
  longitude: 106.671,
  estimated_cost: 55000,
  editorial_score: 4.7,
  is_indoor: true,
  is_lunch: true
};

const ROUTE_EASE = [0.23, 1, 0.32, 1];

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

const PACKING_ITEMS = [
  { id: '1', text: 'Áo khoác chống nắng & kính mát (nắng gắt buổi trưa)' },
  { id: '2', text: 'Ô gấp nhỏ hoặc áo mưa (phòng mưa rào chiều)' },
  { id: '3', text: 'Giày đế mềm dễ đi bộ' },
  { id: '4', text: 'Túi đeo trước ngực đựng điện thoại và ví' },
  { id: '5', text: 'Pin sạc dự phòng 10.000mAh' },
  { id: '6', text: 'Tiền mặt mệnh giá nhỏ (10k, 20k, 50k)' },
  { id: '7', text: 'CCCD / giấy tờ tùy thân để mua vé di tích' }
];

export default function ItineraryPanel({
  trip,
  items = [],
  budget,
  status,
  activeDay,
  onSelectDay,
  onSwap,
  onToggleAccept,
  onToggleRain,
  onToggleTraffic,
  onOptimizeBudget,
  onToggleVisited,
  onSaveCheckin,
  onOpenLiveMode,
  onOpenExpenseTracker,
  onOpenRecap,
  onShare,
  onDuplicate,
  duplicating = false,
  swappingKey,
  loading,
  actions,
  className,
  demo = DEMO
}) {
  const { lang, t } = useI18n();
  const openPlace = useOpenPlace();
  const { syncStopItems } = usePlaceDrawer();
  const adaptiveStorageKey = trip?.id ? `saigon-guide-adaptive-${trip.id}` : null;
  const readAdaptiveState = useCallback(() => {
    if (adaptiveStorageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(adaptiveStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            rainMode: Boolean(parsed?.rainMode),
            trafficMode: Boolean(parsed?.trafficMode)
          };
        }
      } catch {
        // Ignore storage errors
      }
    }
    return {
      rainMode: items.some((it) => Boolean(it.transit_info?.is_rain_mode)),
      trafficMode: items.some((it) => Boolean(it.transit_info?.is_rush_hour))
    };
  }, [adaptiveStorageKey, items]);

  const [focusRequest, setFocusRequest] = useState(null);
  const [rainMode, setRainMode] = useState(() => readAdaptiveState().rainMode);
  const [trafficMode, setTrafficMode] = useState(() => readAdaptiveState().trafficMode);
  const [showRainModal, setShowRainModal] = useState(false);
  const [showTrafficModal, setShowTrafficModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState(['1', '4', '6']);
  const [rideTargetPlace, setRideTargetPlace] = useState(null);

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

  const drawRoute = Boolean(routeSignature) && !reduced && revealedRoute.current !== routeSignature;

  useEffect(() => {
    if (routeSignature) revealedRoute.current = routeSignature;
  }, [routeSignature]);

  const handleLocate = useCallback((item) => {
    setFocusRequest({
      key: `${item.day_number}-${item.order_index}`,
      token: Date.now()
    });
  }, []);

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
  const memberCount = Number(trip?.member_count) || (trip?.companion === 'solo' ? 1 : 4);

  const buildPlaceActions = useCallback(
    (stop) => ({
      stop,
      memberCount,
      swapping: Boolean(swappingKey),
      onToggleAccept,
      onSwap,
      onToggleVisited,
      onLocate: handleLocate,
      allowBookRide: true,
      onOpenCheckin: onOpenLiveMode
        ? () => {
            onOpenLiveMode();
          }
        : undefined
    }),
    [
      memberCount,
      swappingKey,
      onToggleAccept,
      onSwap,
      onToggleVisited,
      handleLocate,
      onOpenLiveMode
    ]
  );

  const handleOpenDetail = useCallback(
    (stop) => {
      if (!stop) return;
      openPlace({
        id: stop.place_id || stop.id,
        seed: stop,
        actions: buildPlaceActions(stop)
      });
    },
    [openPlace, buildPlaceActions]
  );

  useEffect(() => {
    syncStopItems(items, buildPlaceActions);
  }, [items, buildPlaceActions, syncStopItems]);

  const visitedCount = useMemo(
    () => dayItems.filter((i) => i.visited).length,
    [dayItems]
  );

  const acceptedCount = useMemo(
    () => dayItems.filter((i) => i.is_accepted).length,
    [dayItems]
  );

  const dayTotalEstimated = useMemo(() => {
    const acts = dayItems.reduce((acc, it) => acc + Number(it.estimated_cost || 0), 0) * memberCount;
    const trans = dayItems.reduce((acc, it) => {
      const fare = Number(it.transit_info?.estimated_fare_vnd || 0);
      return it.transit_info?.mode === 'grab_bike' ? acc + fare * memberCount : acc + fare;
    }, 0);
    return acts + trans;
  }, [dayItems, memberCount]);

  const saveAdaptiveState = useCallback(
    (nextRain, nextTraffic) => {
      if (!adaptiveStorageKey || typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(
          adaptiveStorageKey,
          JSON.stringify({ rainMode: Boolean(nextRain), trafficMode: Boolean(nextTraffic) })
        );
      } catch {
        // Ignore storage errors
      }
    },
    [adaptiveStorageKey]
  );

  useEffect(() => {
    const stored = readAdaptiveState();
    setRainMode(stored.rainMode);
    setTrafficMode(stored.trafficMode);
  }, [adaptiveStorageKey]);

  const handleToggleRainMode = () => {
    if (rainMode) {
      setRainMode(false);
      saveAdaptiveState(false, trafficMode);
      if (onToggleRain) onToggleRain(activeDay, false);
    } else {
      setShowRainModal(true);
    }
  };

  const handleKeepOriginalRain = () => {
    setShowRainModal(false);
    setRainMode(true);
    saveAdaptiveState(true, trafficMode);
    if (onToggleRain) onToggleRain(activeDay, true);
  };

  const handleSelectRainAlternative = async (alt) => {
    setShowRainModal(false);
    const targetOutdoor = dayItems.find((it) => !it.is_indoor) || dayItems[0];
    if (targetOutdoor && onSwap) {
      await onSwap(targetOutdoor, alt);
    }
    setRainMode(true);
    saveAdaptiveState(true, trafficMode);
    if (onToggleRain) {
      await onToggleRain(activeDay, true);
    }
  };

  const handleToggleTrafficMode = () => {
    if (trafficMode) {
      setTrafficMode(false);
      saveAdaptiveState(rainMode, false);
      if (onToggleTraffic) onToggleTraffic(activeDay, false);
    } else {
      setShowTrafficModal(true);
    }
  };

  const handleKeepOriginalTraffic = () => {
    setShowTrafficModal(false);
    setTrafficMode(true);
    saveAdaptiveState(rainMode, true);
    if (onToggleTraffic) onToggleTraffic(activeDay, true);
  };

  const handleSelectRushAlternative = (alt) => {
    setShowTrafficModal(false);
    const target = dayItems.find((it) => it.order_index >= 3) || dayItems[dayItems.length - 1];
    if (target && onSwap) {
      onSwap(target, alt);
    }
  };

  const handleOpenBudgetOptimizer = () => {
    setShowBudgetModal(true);
  };

  const handleConfirmBudgetOptimization = () => {
    setShowBudgetModal(false);
    const target = dayItems.find((it) => it.estimated_cost >= 80000) || dayItems[2];
    if (target && onSwap) {
      onSwap(target, BUDGET_REPLACEMENT);
    }
    if (onOptimizeBudget) {
      onOptimizeBudget();
    }
  };

  const handleTriggerIcsDownload = async () => {
    await downloadIcsFile(trip, items);
    setCalendarSyncSuccess(true);
  };

  const handleToggleCheckItem = (id) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const scenarioItems = [];
  if (onToggleRain) {
    scenarioItems.push({
      id: 'rain-mode',
      label: t('itinerary.toolbar.rainMode'),
      icon: CloudRain,
      active: rainMode,
      badge: rainMode ? t('itinerary.toolbar.active') : undefined,
      onSelect: handleToggleRainMode
    });
  }
  if (onToggleTraffic) {
    scenarioItems.push({
      id: 'traffic-mode',
      label: t('itinerary.toolbar.trafficMode'),
      icon: AlertTriangle,
      active: trafficMode,
      badge: trafficMode ? t('itinerary.toolbar.active') : undefined,
      onSelect: handleToggleTrafficMode
    });
  }
  if (onOptimizeBudget) {
    scenarioItems.push({
      id: 'optimize-budget',
      label: t('itinerary.toolbar.optimizeBudget'),
      icon: Zap,
      onSelect: handleOpenBudgetOptimizer
    });
  }

  const utilityItems = [
    {
      id: 'packing-checklist',
      label: t('itinerary.toolbar.packingList'),
      icon: Briefcase,
      onSelect: () => setShowChecklistModal(true)
    }
  ];
  if (onDuplicate) {
    utilityItems.push({
      id: 'duplicate-trip',
      label: duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate'),
      icon: Copy,
      disabled: duplicating,
      onSelect: onDuplicate
    });
  }

  const toolsMenuItems =
    scenarioItems.length > 0
      ? [...scenarioItems, { type: 'divider', id: 'tools-divider' }, ...utilityItems]
      : utilityItems;

  return (
    <>
      <section
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-card',
          className
        )}
        aria-label={t('itinerary.title')}
      >
        {/* THANH CÔNG CỤ GỌN: Chọn ngày + Chia sẻ + Xuất lịch + Menu tiện ích */}
        <header className="relative z-20 shrink-0 border-b border-slate-200/90 bg-white px-3.5 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Chọn ngày */}
            <nav
              aria-label={lang === 'vi' ? 'Chọn ngày' : 'Select day'}
              className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto py-0.5"
            >
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
                      'min-h-9 shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors active:scale-[0.98]',
                      isActive
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    )}
                  >
                    {label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Hành động chính (tối đa 3 nút: Chia sẻ, Xuất lịch, Tiện ích "⋯") */}
            <div className="flex shrink-0 items-center gap-1.5">
              {actions}

              {onShare ? (
                <button
                  type="button"
                  onClick={onShare}
                  aria-label={t('trip.actions.share')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('trip.actions.share')}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                aria-label={t('itinerary.toolbar.exportCalendar')}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 active:scale-[0.98]"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('itinerary.toolbar.exportCalendar')}</span>
              </button>

              <OverflowMenu
                items={toolsMenuItems}
                label={t('itinerary.toolbar.moreTools')}
                triggerLabel={lang === 'vi' ? 'Tiện ích' : 'Tools'}
                triggerIcon={SlidersHorizontal}
                indicator={rainMode || trafficMode}
              />
            </div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH: BẢN ĐỒ (TRÁI) & TIMELINE (PHẢI) */}
        {loading ? (
          <div className="flex-1 p-6">
            <PlanLoading />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 p-6">
            <EmptyItinerary status={status} />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
            {/* Bản đồ trong ngày */}
            <div className="flex h-full min-h-[320px] flex-col overflow-hidden border-b border-slate-200 bg-slate-50/50 md:col-span-5 md:min-h-0 md:border-b-0 md:border-r">
              <Suspense
                fallback={
                  <div className="h-full w-full animate-pulse bg-slate-100 p-6 text-xs text-slate-400">
                    {lang === 'vi' ? 'Đang tải bản đồ...' : 'Loading map...'}
                  </div>
                }
              >
                <TripMap
                  stops={dayItems}
                  activeDay={activeDay}
                  focusRequest={focusRequest}
                  onOpenDetail={handleOpenDetail}
                  trafficMode={trafficMode}
                  isPanelMode={true}
                  className="h-full w-full"
                />
              </Suspense>
            </div>

            {/* Danh sách điểm dừng */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:col-span-7">
              {/* Tổng ngân sách 1 dòng (bấm để mở chi tiết) */}
              <BudgetOverview
                budget={budget}
                tripBudget={trip?.budget}
                dayEstimated={dayTotalEstimated}
                activeDay={activeDay}
                memberCount={memberCount}
              />

              {/* Dòng tóm tắt ngày */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2 text-xs">
                <span className="font-display font-bold text-slate-900">
                  {formatDayLabel(lang, activeDay)}
                  <span className="ml-1.5 font-sans font-normal text-slate-500">
                    · {t('itinerary.stops', { count: dayItems.length })}
                  </span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                  {acceptedCount}/{dayItems.length} {lang === 'vi' ? 'đã chốt' : 'confirmed'} ·{' '}
                  {visitedCount}/{dayItems.length} {lang === 'vi' ? 'đã đến' : 'visited'}
                </span>
              </div>

              {/* Thông báo trạng thái khi đang bật chế độ Mưa / Kẹt xe */}
              {rainMode ? (
                <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900">
                  <span className="flex items-center gap-1.5">
                    <CloudRain className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
                    <span>
                      {lang === 'vi'
                        ? 'Đang bật chế độ trời mưa (ưu tiên trong nhà và GrabCar).'
                        : 'Rain mode active (indoor spots & GrabCar).'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleRainMode}
                    className="shrink-0 font-semibold text-sky-800 underline hover:text-sky-950"
                  >
                    {lang === 'vi' ? 'Tắt' : 'Turn off'}
                  </button>
                </div>
              ) : null}

              {trafficMode ? (
                <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>
                      {lang === 'vi'
                        ? 'Đang bật giờ cao điểm (+20 phút dự phòng di chuyển).'
                        : 'Rush hour mode active (+20m buffer).'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleTrafficMode}
                    className="shrink-0 font-semibold text-amber-900 underline hover:text-amber-950"
                  >
                    {lang === 'vi' ? 'Tắt' : 'Turn off'}
                  </button>
                </div>
              ) : null}

              {/* Danh sách điểm dừng cuộn */}
              <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-28 pt-3">
                <div className="relative">
                  <motion.div
                    aria-hidden="true"
                    variants={ROUTE_LINE}
                    initial={drawRoute ? 'hidden' : false}
                    animate="visible"
                    className="absolute bottom-5 left-[15px] top-4 hidden w-px origin-top bg-slate-200 sm:block"
                  />

                  {dayItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
                      <p className="text-xs font-bold text-slate-600">{t('itinerary.noStops')}</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
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
                          {index > 0 ? (
                            <TransitConnector transit={item.transit_info} memberCount={memberCount} />
                          ) : null}
                          <motion.div
                            className="relative sm:pl-10"
                            variants={ROUTE_STOP}
                            custom={index}
                            initial={drawRoute ? 'hidden' : false}
                            animate="visible"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute left-[10px] top-5 z-10 hidden h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600 sm:block"
                            />
                            <TimelineItem
                              item={item}
                              memberCount={memberCount}
                              onSwap={onSwap}
                              onToggleAccept={onToggleAccept}
                              onToggleVisited={onToggleVisited}
                              onOpenDetail={handleOpenDetail}
                              onLocate={handleLocate}
                              onBookRide={(it) => setRideTargetPlace(it)}
                              swapping={swappingKey === key}
                              disabled={Boolean(swappingKey)}
                            />
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* GỌI XE TRỰC TIẾP TỪ MENU "⋯" */}
      <RidePickerModal
        stop={rideTargetPlace}
        originStop={(() => {
          if (!rideTargetPlace) return null;
          const idx = dayItems.findIndex(
            (it) =>
              it === rideTargetPlace ||
              (it.day_number === rideTargetPlace.day_number &&
                it.order_index === rideTargetPlace.order_index)
          );
          return idx > 0 ? dayItems[idx - 1] : null;
        })()}
        isOpen={Boolean(rideTargetPlace)}
        onClose={() => setRideTargetPlace(null)}
      />

      {/* MODAL CHẾ ĐỘ TRỜI MƯA */}
      <Modal
        open={showRainModal}
        onClose={() => setShowRainModal(false)}
        title={lang === 'vi' ? 'Chế độ trời mưa' : 'Rain mode'}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
            {dayItems.some((it) => !it.is_indoor) ? (
              <p>
                {lang === 'vi' ? 'Điểm ngoài trời bị ảnh hưởng: ' : 'Outdoor stop affected: '}
                <strong className="font-bold">
                  {dayItems.find((it) => !it.is_indoor)?.place_name}
                </strong>
                .{' '}
                {lang === 'vi'
                  ? 'Bạn có thể đổi sang điểm trong nhà gần đây hoặc giữ nguyên và đi GrabCar.'
                  : 'Swap to a nearby indoor place or keep the stop with GrabCar.'}
              </p>
            ) : (
              <p>
                {lang === 'vi'
                  ? 'Các điểm trong ngày đều ở trong nhà. Bật chế độ này sẽ chuyển chặng di chuyển sang GrabCar.'
                  : 'Current stops are indoors. Enabling rain mode switches transit to GrabCar.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              {lang === 'vi' ? 'Đổi sang điểm trong nhà gần đây' : 'Swap to a nearby indoor spot'}
            </p>
            {NEARBY_RAIN_ALTERNATIVES.map((alt) => (
              <button
                key={alt.place_id}
                type="button"
                onClick={() => handleSelectRainAlternative(alt)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {alt.place_name}{' '}
                    <span className="font-semibold text-amber-700">★ {alt.editorial_score}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {alt.address} · {alt.distance_note}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-brand-700 tabular-nums">
                  {formatVnd(alt.estimated_cost, lang)}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleKeepOriginalRain}
              className="btn-primary w-full !py-2.5 text-xs"
            >
              <CloudRain className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'vi'
                  ? 'Giữ nguyên điểm cũ và chuyển sang GrabCar'
                  : 'Keep stops and switch to GrabCar'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL GIỜ CAO ĐIỂM */}
      <Modal
        open={showTrafficModal}
        onClose={() => setShowTrafficModal(false)}
        title={lang === 'vi' ? 'Giờ cao điểm (17h–19h)' : 'Rush hour (17:00–19:00)'}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-semibold">
              {dayItems[1]?.place_name || 'Phố đi bộ Nguyễn Huệ'} →{' '}
              {dayItems[2]?.place_name || 'Phở Hòa Pasteur'}
            </p>
            <p className="mt-1 text-amber-900">
              {lang === 'vi'
                ? 'Di chuyển liên quận khung 17h–19h thường chậm thêm 20–30 phút.'
                : 'Cross-district travel during 17:00–19:00 adds 20–30 minutes.'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              {lang === 'vi' ? 'Đổi sang điểm gần hơn (< 800m)' : 'Swap to a closer spot (< 800m)'}
            </p>
            {NEARBY_RUSH_ALTERNATIVES.map((alt) => (
              <button
                key={alt.place_id}
                type="button"
                onClick={() => handleSelectRushAlternative(alt)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {alt.place_name}{' '}
                    <span className="font-semibold text-amber-700">★ {alt.editorial_score}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {alt.address} · {alt.distance_note}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-brand-700 tabular-nums">
                  {formatVnd(alt.estimated_cost, lang)}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleKeepOriginalTraffic}
              className="btn-primary w-full !py-2.5 text-xs"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'vi'
                  ? 'Giữ nguyên lộ trình và cộng 20 phút dự phòng'
                  : 'Keep route and add 20-minute buffer'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL TỐI ƯU CHI PHÍ */}
      <Modal
        open={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={lang === 'vi' ? 'Tối ưu chi phí (-20%)' : 'Optimize budget (-20%)'}
        className="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowBudgetModal(false)}
              className="btn-secondary !px-4 !py-2 text-xs"
            >
              {lang === 'vi' ? 'Giữ nguyên' : 'Keep original'}
            </button>
            <button
              type="button"
              onClick={handleConfirmBudgetOptimization}
              className="btn-primary !px-4 !py-2 text-xs"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'vi' ? 'Áp dụng đổi điểm' : 'Apply swap'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p className="leading-relaxed">
            {lang === 'vi'
              ? 'Đổi điểm ăn uống giá cao nhất trong ngày sang quán đặc sản bình dân tương đương:'
              : 'Swap the priciest meal stop for a well-rated local spot:'}
          </p>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">{lang === 'vi' ? 'Hiện tại' : 'Current'}</span>
              <span className="font-semibold text-slate-700 line-through">
                Phở Hòa Pasteur (95.000 đ)
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
              <span className="font-semibold text-emerald-800">
                {lang === 'vi' ? 'Thay bằng' : 'Replace with'}
              </span>
              <span className="font-bold text-emerald-900">Cơm Tấm Ba Ghiền (55.000 đ)</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-dashed border-emerald-200 pt-2 font-bold text-emerald-700">
              <span>{lang === 'vi' ? 'Tiết kiệm' : 'Savings'}</span>
              <span>-40.000 đ</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL XUẤT LỊCH / GOOGLE CALENDAR (.ICS) */}
      <Modal
        open={showCalendarModal}
        onClose={() => {
          setShowCalendarModal(false);
          setCalendarSyncSuccess(false);
        }}
        title={t('itinerary.toolbar.exportCalendar')}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            {lang === 'vi'
              ? `Xuất ${items.length} điểm trong lịch trình sang ứng dụng Lịch (Google Calendar hoặc Apple Calendar).`
              : `Export all ${items.length} stops to Google Calendar or Apple Calendar.`}
          </p>

          <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                {lang === 'vi' ? 'Nhắc trước 30 phút cho mỗi điểm' : '30-minute reminder per stop'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                {lang === 'vi'
                  ? 'Kèm địa chỉ, chi phí dự kiến và ghi chú'
                  : 'Includes address, estimated cost, and notes'}
              </span>
            </li>
          </ul>

          {calendarSyncSuccess ? (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
            >
              {lang === 'vi'
                ? 'Đã tải file .ICS. Mở file để thêm lịch trình vào ứng dụng Lịch.'
                : '.ICS file downloaded. Open it to import into your calendar.'}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleTriggerIcsDownload}
              className="btn-primary w-full !py-2.5 text-xs"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'vi' ? 'Tải file .ICS (Google / Apple Calendar)' : 'Download .ICS file'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCalendarSyncSuccess(true);
                setTimeout(() => setShowCalendarModal(false), 2000);
              }}
              className="btn-secondary w-full !py-2.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {lang === 'vi' ? 'Đồng bộ qua tài khoản Google' : 'Sync with Google Account'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DANH SÁCH HÀNH LÝ */}
      <Modal
        open={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        title={t('itinerary.toolbar.packingList')}
        className="max-w-md"
        footer={
          <button
            type="button"
            onClick={() => setShowChecklistModal(false)}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            {lang === 'vi' ? 'Xong' : 'Done'}
          </button>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {lang === 'vi'
              ? 'Đánh dấu các vật dụng bạn đã chuẩn bị:'
              : 'Check off items as you pack:'}
          </p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
            {PACKING_ITEMS.map((item) => {
              const isChecked = checkedItems.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-xs font-medium transition-colors',
                    isChecked
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 line-through'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCheckItem(item.id)}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>{item.text}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
