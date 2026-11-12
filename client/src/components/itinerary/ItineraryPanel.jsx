import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  CloudRain,
  ExternalLink,
  Flame,
  Info,
  MapPin,
  Sparkles,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { DEMO } from '../../demo.jsx';
import { assetUrl, downloadIcsFile } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDayLabel, formatVnd } from '../../lib/format.js';
import BudgetOverview from './BudgetOverview.jsx';
import EmptyItinerary from './EmptyItinerary.jsx';
import PlaceDetailModal from './PlaceDetailModal.jsx';
import PlanLoading from './PlanLoading.jsx';
import TimelineItem from './TimelineItem.jsx';
import TransitConnector from './TransitConnector.jsx';

const TripMap = lazy(() => import('./TripMap.jsx'));

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
  { id: '1', text: 'Áo khoác chống nắng UV & Kính mát (nắng gắt trưa Sài Gòn)' },
  { id: '2', text: 'Ô / Dù gấp mini & Áo mưa tiện lợi (phòng mưa rào buổi chiều)' },
  { id: '3', text: 'Giày thể thao hoặc giày đế mềm (đi bộ thoải mái ở phố đi bộ)' },
  { id: '4', text: 'Túi đeo chéo trước ngực (bảo vệ điện thoại & ví tiền khi dạo phố)' },
  { id: '5', text: 'Sạc pin dự phòng 10.000mAh (chụp ảnh check-in cả ngày)' },
  { id: '6', text: 'Tiền mặt lẻ (10k, 20k, 50k gửi xe & thưởng thức ăn vặt vỉa hè)' },
  { id: '7', text: 'Căn cước công dân / Giấy tờ tùy thân (mua vé di tích lịch sử)' }
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
  swappingKey,
  loading,
  actions,
  className,
  demo = DEMO
}) {
  const { lang, t } = useI18n();
  const [focusRequest, setFocusRequest] = useState(null);
  const [rainMode, setRainMode] = useState(false);
  const [trafficMode, setTrafficMode] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState(['1', '4', '6']);
  const [selectedDetailPlace, setSelectedDetailPlace] = useState(null);

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

  // Cập nhật selectedDetailPlace khi items thay đổi (ví dụ khi swap hoặc toggle accept)
  useEffect(() => {
    if (!selectedDetailPlace) return;
    const updated = items.find(
      (it) => it.day_number === selectedDetailPlace.day_number && it.order_index === selectedDetailPlace.order_index
    );
    if (updated) setSelectedDetailPlace(updated);
  }, [items]);

  const visitedCount = useMemo(
    () => dayItems.filter((i) => i.visited).length,
    [dayItems]
  );

  const acceptedCount = useMemo(
    () => dayItems.filter((i) => i.is_accepted).length,
    [dayItems]
  );

  const dayTotalEstimated = useMemo(() => {
    const acts = dayItems.reduce((acc, it) => acc + Number(it.estimated_cost || 0), 0);
    const trans = dayItems.reduce((acc, it) => acc + Number(it.transit_info?.estimated_fare_vnd || 0), 0);
    return acts + trans;
  }, [dayItems]);

  const handleToggleRainMode = () => {
    const next = !rainMode;
    setRainMode(next);
    if (onToggleRain) onToggleRain(activeDay, next);
  };

  const handleToggleTrafficMode = () => {
    const next = !trafficMode;
    setTrafficMode(next);
    if (onToggleTraffic) onToggleTraffic(activeDay, next);
  };

  const handleTriggerIcsDownload = () => {
    downloadIcsFile(trip, items);
    setCalendarSyncSuccess(true);
  };

  const handleToggleCheckItem = (id) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <>
      <section
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-card',
          className
        )}
        aria-label={t('itinerary.title')}
      >
        {/* HEADER CHÍNH CỦA BẢNG ĐIỀU KHIỂN LỊCH TRÌNH */}
        <header className="shrink-0 border-b border-slate-200/90 bg-white px-3.5 py-3 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-xs">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                  {lang === 'vi' ? 'Lịch trình của bạn' : 'Your Itinerary'}
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {lang === 'vi'
                  ? `${dayCount} ngày khám phá TP.HCM · Dự trù ${formatVnd(trip?.budget || 0, lang)}`
                  : t('itinerary.subtitle', {
                      days: t('common.days', { count: dayCount }),
                      budget: formatVnd(trip?.budget || 0, lang)
                    })}
              </p>
            </div>

            {/* Các nút hành động chính */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
              {/* NÚT BẮT BUỘC: ĐỒNG BỘ GOOGLE CALENDAR */}
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700 shadow-xs transition-all hover:bg-blue-100 active:scale-98"
                title="Đồng bộ toàn bộ lịch trình lên Google Calendar hoặc tải file .ICS"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">{lang === 'vi' ? 'Đồng bộ Google Calendar' : 'Sync Calendar'}</span>
                <span className="sm:hidden">Lịch</span>
              </button>

              {/* Nút Checklist hành lý */}
              <button
                type="button"
                onClick={() => setShowChecklistModal(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300"
                title="Mở danh sách đồ cần chuẩn bị đi Sài Gòn"
              >
                <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden md:inline">{lang === 'vi' ? 'Hành lý' : 'Checklist'}</span>
              </button>

              {actions}
            </div>
          </div>

          {/* THANH TAB CHỌN NGÀY & THANH KỊCH BẢN THÍCH ỨNG (TRỜI MƯA / GIỜ CAO ĐIỂM / AI TIẾT KIỆM) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            {/* Thanh Tab Ngày */}
            <div className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
                const count = itemsByDay.get(day)?.length || 0;
                const isActive = day === activeDay;
                const label = formatDayLabel(lang, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    aria-pressed={isActive}
                    className={cn(
                      'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all active:scale-97',
                      isActive
                        ? 'border-brand-500 bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[9.5px]',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {count} điểm
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Kịch bản thời tiết / Giao thông & AI Tối ưu */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden xl:inline text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                {lang === 'vi' ? 'Kịch bản thích ứng:' : 'Contingency:'}
              </span>

              {/* Nút kịch bản Trời mưa */}
              <button
                type="button"
                onClick={handleToggleRainMode}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-98',
                  rainMode
                    ? 'border-sky-400 bg-sky-500 text-white shadow-xs ring-2 ring-sky-200'
                    : 'border-sky-200 bg-sky-50/50 text-sky-800 hover:bg-sky-100/60'
                )}
                title="Chuyển các điểm ngoài trời sang điểm trong nhà có mái che, ưu tiên GrabCar"
              >
                <CloudRain className="h-3.5 w-3.5" />
                <span>{rainMode ? (lang === 'vi' ? 'Đang né mưa (Trong nhà)' : 'Rain Active') : (lang === 'vi' ? 'Trời mưa Sài Gòn' : 'Rain Mode')}</span>
              </button>

              {/* Nút kịch bản Giờ cao điểm */}
              <button
                type="button"
                onClick={handleToggleTrafficMode}
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-98',
                  trafficMode
                    ? 'border-amber-400 bg-amber-500 text-white shadow-xs ring-2 ring-amber-200'
                    : 'border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60'
                )}
                title="Khoanh vùng trong cùng 1 quận và thêm 20 phút đệm kẹt xe vào chiều muộn"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{trafficMode ? (lang === 'vi' ? 'Đã bật né kẹt xe' : 'Traffic Active') : (lang === 'vi' ? 'Giờ cao điểm (17h-19h)' : 'Rush Hour')}</span>
              </button>

              {/* Nút AI Tối ưu tiết kiệm */}
              {onOptimizeBudget && (
                <button
                  type="button"
                  onClick={onOptimizeBudget}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 active:scale-98"
                  title="AI rà soát và giảm 20% chi phí các hoạt động"
                >
                  <Zap className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === 'vi' ? 'AI Giảm 20% chi phí' : 'Save 20%'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH: CHIA THÀNH 2 KHUNG HÌNH (SPLIT 2-PANEL LAYOUT) */}
        {loading ? (
          <div className="flex-1 p-6">
            <PlanLoading />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 p-6">
            <EmptyItinerary status={status} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
            {/* KHUNG HÌNH THỨ NHẤT: BẢN ĐỒ TRONG NGÀY (LEFT FRAME) */}
            <div className="md:col-span-5 xl:col-span-5 flex flex-col h-full border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 overflow-hidden min-h-[350px] md:min-h-0">
              <Suspense
                fallback={
                  <div className="h-full w-full animate-pulse bg-slate-100 p-6 text-xs text-slate-400">
                    Đang tải bản đồ...
                  </div>
                }
              >
                <TripMap
                  stops={dayItems}
                  activeDay={activeDay}
                  focusRequest={focusRequest}
                  onOpenDetail={(stop) => setSelectedDetailPlace(stop)}
                  isPanelMode={true}
                  className="h-full w-full"
                />
              </Suspense>
            </div>

            {/* KHUNG HÌNH THỨ HAI: LỊCH TRÌNH TIMELINE (RIGHT FRAME) */}
            <div className="md:col-span-7 xl:col-span-7 flex flex-col h-full bg-white overflow-hidden min-h-0">
              {/* Header của Khung 2: Thống kê trạng thái duyệt (Accept) và tiến độ */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-extrabold text-slate-900">
                    {lang === 'vi' ? `Khung 2: Lịch trình Ngày ${activeDay}` : `Day ${activeDay} Itinerary`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({dayItems.length} {lang === 'vi' ? 'chặng' : 'stops'})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold">
                  {/* Badge số điểm đã chốt (Accept) */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{acceptedCount}/{dayItems.length} {lang === 'vi' ? 'đã chốt' : 'accepted'}</span>
                  </span>

                  {/* Badge số điểm đã đến thực tế */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    <span>{visitedCount}/{dayItems.length} {lang === 'vi' ? 'đã đến' : 'visited'}</span>
                  </span>
                </div>
              </div>

              {/* Thông báo kịch bản nếu đang kích hoạt */}
              {rainMode && (
                <div className="mx-4 mt-2 flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11.5px] font-semibold text-sky-900 animate-fade-in">
                  <CloudRain className="h-4 w-4 shrink-0 text-sky-600" />
                  <span>{lang === 'vi' ? '🌧️ Đang kích hoạt Chế độ Trời mưa: Ưu tiên điểm trong nhà, chuyển transit GrabCar.' : '🌧️ Rain Mode active.'}</span>
                </div>
              )}

              {trafficMode && (
                <div className="mx-4 mt-2 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11.5px] font-semibold text-amber-900 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{lang === 'vi' ? '🚗 Đang kích hoạt Chế độ Giờ cao điểm: Khoanh vùng cùng quận, tăng 20 phút đệm kẹt xe.' : '🚗 Rush Hour mode active.'}</span>
                </div>
              )}

              {/* Danh sách các chặng trong ngày (Timeline cuộn mượt) */}
              <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
                <div className="relative">
                  <motion.div
                    aria-hidden="true"
                    variants={ROUTE_LINE}
                    initial={drawRoute ? 'hidden' : false}
                    animate="visible"
                    className="absolute bottom-5 left-[19px] top-4 hidden w-px origin-top bg-gradient-to-b from-brand-200 via-slate-200 to-transparent sm:block"
                  />

                  {dayItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
                      <p className="text-xs font-bold text-slate-600">{t('itinerary.noStops')}</p>
                      <p className="mx-auto mt-1 max-w-xs text-[11px] text-slate-500">
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
                            <span className="absolute left-[13px] top-4 z-10 hidden h-3 w-3 rounded-full border-2 border-white bg-brand-600 shadow-sm sm:block" />
                            <TimelineItem
                              item={item}
                              onSwap={onSwap}
                              onToggleAccept={onToggleAccept}
                              onOpenDetail={(it) => setSelectedDetailPlace(it)}
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
              </div>

              {/* Chân Khung 2: Tổng hợp chi phí dự kiến trong ngày */}
              <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/90 px-4 py-2.5 text-xs">
                <span className="font-semibold text-slate-600">
                  {lang === 'vi' ? `Chi tiêu dự kiến Ngày ${activeDay}:` : `Estimated for Day ${activeDay}:`}
                </span>
                <span className="font-mono font-extrabold text-brand-700">
                  {formatVnd(dayTotalEstimated, lang)}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MÀN HÌNH GIỚI THIỆU ĐỊA ĐIỂM (MODAL POPUP KHI BẤM VÀO TÊN ĐỊA ĐIỂM) */}
      {selectedDetailPlace && (
        <PlaceDetailModal
          stop={selectedDetailPlace}
          isOpen={Boolean(selectedDetailPlace)}
          onClose={() => setSelectedDetailPlace(null)}
          onToggleAccept={onToggleAccept}
          onSwap={onSwap}
          onOpenCheckin={(stop) => {
            if (onOpenLiveMode) onOpenLiveMode();
          }}
          swapping={Boolean(swappingKey)}
        />
      )}

      {/* MODAL ĐỒNG BỘ GOOGLE CALENDAR */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </span>
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  {lang === 'vi' ? 'Đồng bộ Google Calendar' : 'Sync to Google Calendar'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCalendarModal(false);
                  setCalendarSyncSuccess(false);
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                {lang === 'vi'
                  ? `Xuất toàn bộ ${items.length} điểm tham quan & ăn uống của chuyến đi vào ứng dụng Google Calendar:`
                  : `Export all ${items.length} itinerary stops into your Google Calendar:`}
              </p>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11.5px] text-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === 'vi' ? 'Tự động báo chuông nhắc trước 30 phút mỗi điểm' : 'Automatic 30-min reminders before each stop'}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === 'vi' ? 'Chứa đầy đủ địa chỉ chuẩn để mở Google Maps 1-chạm' : 'Includes full address with 1-click Google Maps link'}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === 'vi' ? 'Kèm dự trù chi phí & lưu ý tham quan' : 'Estimated cost & local tips in description'}</span>
                </div>
              </div>

              {calendarSyncSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  ✓ {lang === 'vi' ? 'Đã tải xuống file .ICS! Nhấn mở file để thêm ngay vào ứng dụng Lịch của bạn.' : 'File downloaded! Open the file to import into your Calendar app.'}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTriggerIcsDownload}
                className="btn-primary w-full !py-3 text-xs font-extrabold shadow-glow"
              >
                <Calendar className="h-4 w-4" />
                <span>{lang === 'vi' ? 'Tải file .ICS (Chuẩn Google / Apple Calendar)' : 'Download .ICS Calendar File'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalendarSyncSuccess(true);
                  setTimeout(() => setShowCalendarModal(false), 2000);
                }}
                className="btn-secondary w-full !py-2.5 text-xs font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{lang === 'vi' ? 'Đồng bộ trực tiếp qua tài khoản Google' : 'Sync directly via Google Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECKLIST HÀNH LÝ SÀI GÒN (USER COMPANION) */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <Briefcase className="h-4 w-4" />
                </span>
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  {lang === 'vi' ? 'Hành lý chuẩn Sài Gòn' : 'Saigon Packing Checklist'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500">
                {lang === 'vi' ? 'Tích chọn các vật dụng bạn đã chuẩn bị trước khi lên đường:' : 'Check the items you have prepared before departure:'}
              </p>

              <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {PACKING_ITEMS.map((item) => {
                  const isChecked = checkedItems.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      onClick={() => handleToggleCheckItem(item.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-xs font-medium transition-all',
                        isChecked
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 line-through opacity-85'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>{item.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="btn-primary !py-2 text-xs"
              >
                {lang === 'vi' ? 'Đã chuẩn bị xong' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
