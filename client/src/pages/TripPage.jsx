import {
  AlertCircle,
  Award,
  CalendarDays,
  Camera,
  Compass,
  Copy,
  Loader2,
  MapPin,
  Share2,
  Wallet
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ExpenseTrackerView from '../components/companion/ExpenseTrackerView.jsx';
import LiveCompanionView from '../components/companion/LiveCompanionView.jsx';
import TripRecapModal from '../components/companion/TripRecapModal.jsx';
import TripSummaryView from '../components/companion/TripSummaryView.jsx';
import ItineraryPanel from '../components/itinerary/ItineraryPanel.jsx';
import OverflowMenu from '../components/itinerary/OverflowMenu.jsx';
import SaveTripPrompt from '../components/SaveTripPrompt.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api, ApiError } from '../lib/api.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1400px] px-3 pb-8 pt-4 sm:px-5 lg:px-8 lg:pt-6">
        {children}
      </main>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <PageShell>
      <div className="mb-4 h-6 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid h-[65vh] place-items-center rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
          {t('itinerary.loading')}
        </div>
      </div>
    </PageShell>
  );
}

export default function TripPage() {
  const { id } = useParams();
  const { lang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [budget, setBudget] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [swappingKey, setSwappingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Chế độ xem: 'itinerary' | 'live' | 'expense' | 'summary'
  const [viewMode, setViewMode] = useState('itinerary');
  const [showRecapModal, setShowRecapModal] = useState(false);

  const requestIdRef = useRef(0);
  const aiNoticeHandledRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const dismissToast = useCallback(() => setToast(null), []);

  const loadTrip = useCallback(async () => {
    const token = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    setNotFound(false);
    try {
      const tripData = await api.getTrip(id);
      if (token !== requestIdRef.current) return;
      setTrip(tripData.trip);
      setItems(tripData.itinerary_items || []);
      setBudget(tripData.budget_summary || null);
    } catch (error) {
      if (token !== requestIdRef.current) return;
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(translateApiError(tRef.current, error));
      }
    } finally {
      if (token === requestIdRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setTrip(null);
    setItems([]);
    setBudget(null);
    setActiveDay(1);
    setSwappingKey(null);
    setToast(null);
    setShareOpen(false);
    setDuplicating(false);
    setViewMode('itinerary');
    setShowRecapModal(false);
    loadTrip();
  }, [id, loadTrip]);

  useEffect(() => {
    const { aiConceptSource, aiGenerationSource } = location.state || {};
    if (!aiGenerationSource || aiNoticeHandledRef.current) return;

    aiNoticeHandledRef.current = true;
    const usedFallback = aiConceptSource === 'fallback' || aiGenerationSource === 'fallback';
    setToast({
      message: usedFallback
        ? lang === 'vi'
          ? 'Gemini chưa hoàn tất một bước nên lịch trình đang dùng dữ liệu dự phòng.'
          : 'Gemini could not complete one step, so this itinerary uses fallback data.'
        : lang === 'vi'
        ? 'Đã tạo và lưu lịch trình.'
        : 'Itinerary created and saved.',
      tone: usedFallback ? 'error' : 'success'
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [lang, location.key, location.pathname, location.state, navigate]);

  const displayTitle = useMemo(() => {
    if (!trip) return '';
    return trip.title || t('trip.title', { days: Number(trip.days) || 1, prefs: 'Sài Gòn' });
  }, [trip, t]);

  // Đổi địa điểm trực tiếp (Direct Place Swap)
  const handleSwap = async (item, replacement) => {
    const key = `${item.day_number}-${item.order_index}`;
    setSwappingKey(key);
    try {
      const res = await api.swapPlace(id, item.day_number, item.order_index, replacement);
      setItems([...res.items]);
      setBudget(res.budget_summary);
      setToast({
        message:
          lang === 'vi'
            ? `Đã đổi sang "${replacement.place_name}".`
            : `Swapped to ${replacement.place_name}.`,
        tone: 'success'
      });
    } catch (error) {
      setToast({ message: translateApiError(tRef.current, error), tone: 'error' });
    } finally {
      setSwappingKey(null);
    }
  };

  // Kịch bản Trời mưa
  const handleToggleRain = async (day, enable) => {
    try {
      const res = await api.applyRainMode(id, day, enable);
      setItems([...res.items]);
      setBudget(res.budget_summary);
      setToast({
        message: enable
          ? lang === 'vi'
            ? 'Đã bật chế độ trời mưa: ưu tiên điểm trong nhà và GrabCar.'
            : 'Rain mode enabled.'
          : lang === 'vi'
          ? 'Đã tắt chế độ trời mưa.'
          : 'Rain mode disabled.',
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Kịch bản Giờ cao điểm
  const handleToggleTraffic = async (day, enable) => {
    try {
      const res = await api.applyTrafficMode(id, day, enable);
      setItems([...res.items]);
      setBudget(res.budget_summary);
      setToast({
        message: enable
          ? lang === 'vi'
            ? 'Đã bật chế độ giờ cao điểm và cộng 20 phút dự phòng.'
            : 'Rush hour mode enabled.'
          : lang === 'vi'
          ? 'Đã tắt chế độ giờ cao điểm.'
          : 'Rush hour mode disabled.',
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Tinh chỉnh AI: Giảm 20% chi phí
  const handleOptimizeBudget = async () => {
    try {
      const res = await api.optimizeBudget(id);
      setItems([...res.items]);
      setBudget(res.budget_summary);
      setToast({
        message:
          lang === 'vi'
            ? 'Đã đổi sang Cơm Tấm Ba Ghiền (55.000 đ), tiết kiệm 40.000 đ.'
            : 'Budget optimized.',
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Check-in (Companion)
  const handleToggleVisited = async (item) => {
    try {
      const res = await api.toggleVisited(id, item.day_number, item.order_index);
      setItems([...res.items]);
      setToast({
        message: item.visited
          ? lang === 'vi'
            ? `Đã bỏ đánh dấu "${item.place_name}".`
            : `Unchecked ${item.place_name}.`
          : lang === 'vi'
          ? `Đã đánh dấu đến "${item.place_name}".`
          : `Checked in at ${item.place_name}.`,
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Chốt địa điểm / Phê duyệt (Accept stop)
  const handleToggleAccept = async (item) => {
    try {
      const res = await api.toggleAcceptPlace(id, item.day_number, item.order_index);
      setItems([...res.items]);
      const updated = res.items.find(
        (it) => it.day_number === item.day_number && it.order_index === item.order_index
      );
      setToast({
        message: updated?.is_accepted
          ? lang === 'vi'
            ? `Đã chốt "${item.place_name}".`
            : `Confirmed ${item.place_name}.`
          : lang === 'vi'
          ? `Đã bỏ chốt "${item.place_name}".`
          : `Unconfirmed ${item.place_name}.`,
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Lưu ảnh check-in chụp bằng camera hoặc tải lên
  const handleSaveCheckin = async (item, data) => {
    try {
      const res = await api.saveCheckin(id, item.day_number, item.order_index, data);
      setItems([...res.items]);
      setToast({
        message:
          lang === 'vi'
            ? `Đã lưu ảnh check-in tại "${item.place_name}".`
            : `Saved check-in photo for ${item.place_name}.`,
        tone: 'success'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const { id: copyId } = await api.duplicateTrip(id);
      navigate(`/trip/${copyId}`);
    } catch (error) {
      setToast({ message: translateApiError(tRef.current, error), tone: 'error' });
      setDuplicating(false);
    }
  };

  const pageOverflowItems = [
    {
      id: 'photobook',
      label: t('trip.actions.photobook'),
      icon: Camera,
      onSelect: () => setShowRecapModal(true)
    },
    ...(viewMode !== 'itinerary'
      ? [
          {
            id: 'share',
            label: t('trip.actions.share'),
            icon: Share2,
            onSelect: () => setShareOpen(true)
          }
        ]
      : []),
    {
      id: 'duplicate',
      label: duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate'),
      icon: Copy,
      disabled: duplicating,
      onSelect: handleDuplicate
    }
  ];

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <PageShell>
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-700">
            <MapPin className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
            {t('itinerary.notFound.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{t('itinerary.notFound.body')}</p>
          <Link to="/" className="btn-primary mt-6">
            {t('nav.backHome')}
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!trip) {
    return (
      <PageShell>
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
            {t('chat.error')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <button type="button" onClick={loadTrip} className="btn-primary mt-6">
            {t('common.retry')}
          </button>
        </div>
      </PageShell>
    );
  }

  const memberLabel =
    Number(trip.member_count) > 1
      ? lang === 'vi'
        ? `${trip.member_count} người`
        : `${trip.member_count} people`
      : lang === 'vi'
      ? '1 người'
      : '1 person';

  return (
    <div data-lenis-prevent className="flex min-h-screen flex-col bg-slate-100/70 pb-10">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-3 pt-3 sm:px-6 lg:px-8 lg:pt-5">
        <SaveTripPrompt hasItinerary={items.length > 0} />

        {/* Tiêu đề gọn + 1 dòng tóm tắt chuyến đi */}
        <div className="relative z-30 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {displayTitle}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {t('common.days', { count: Number(trip.days) || 1 })} · {memberLabel} ·{' '}
              <span className="tabular-nums">{formatVnd(trip.budget, lang)}</span>
            </p>
          </div>

          {/* 4 tab chế độ đồng nhất + menu "⋯" cho thao tác phụ */}
          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label={lang === 'vi' ? 'Chế độ xem chuyến đi' : 'Trip views'}
              className="scrollbar-thin flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'itinerary'}
                onClick={() => setViewMode('itinerary')}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'itinerary'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('trip.tabs.itinerary')}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'live'}
                onClick={() => setViewMode('live')}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'live'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('trip.tabs.live')}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'expense'}
                onClick={() => setViewMode('expense')}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'expense'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('trip.tabs.expense')}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'summary'}
                onClick={() => setViewMode('summary')}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  viewMode === 'summary'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('trip.tabs.summary')}</span>
              </button>
            </div>

            <OverflowMenu
              items={pageOverflowItems}
              label={t('trip.actions.more')}
            />
          </div>
        </div>

        {/* Nội dung theo chế độ đang chọn */}
        {viewMode === 'itinerary' && (
          <div className="h-[calc(100dvh-190px)] min-h-[560px] w-full">
            <ItineraryPanel
              trip={trip}
              items={items}
              budget={budget}
              status={trip.status}
              activeDay={activeDay}
              onSelectDay={setActiveDay}
              onSwap={handleSwap}
              onToggleAccept={handleToggleAccept}
              onToggleRain={handleToggleRain}
              onToggleTraffic={handleToggleTraffic}
              onOptimizeBudget={handleOptimizeBudget}
              onToggleVisited={handleToggleVisited}
              onSaveCheckin={handleSaveCheckin}
              onOpenLiveMode={() => setViewMode('live')}
              onOpenExpenseTracker={() => setViewMode('expense')}
              onOpenRecap={() => setShowRecapModal(true)}
              onShare={() => setShareOpen(true)}
              onDuplicate={handleDuplicate}
              duplicating={duplicating}
              swappingKey={swappingKey}
              loading={false}
            />
          </div>
        )}

        {viewMode === 'live' && (
          <div className="w-full">
            <LiveCompanionView
              trip={trip}
              items={items}
              activeDay={activeDay}
              onSelectDay={setActiveDay}
              onToggleVisited={handleToggleVisited}
              onSaveCheckin={handleSaveCheckin}
              onSwap={handleSwap}
              onFinishTrip={() => setViewMode('summary')}
            />
          </div>
        )}

        {viewMode === 'expense' && (
          <div className="w-full">
            <ExpenseTrackerView trip={trip} items={items} />
          </div>
        )}

        {viewMode === 'summary' && (
          <div className="w-full">
            <TripSummaryView
              trip={trip}
              items={items}
              onBackToItinerary={() => setViewMode('itinerary')}
              onOpenRecap={() => setShowRecapModal(true)}
            />
          </div>
        )}
      </main>

      {showRecapModal && (
        <TripRecapModal
          trip={trip}
          items={items}
          onClose={() => setShowRecapModal(false)}
        />
      )}

      <ShareDialog
        open={shareOpen}
        tripId={id}
        onClose={() => setShareOpen(false)}
        onToast={setToast}
      />

      <Toast message={toast?.message} tone={toast?.tone} onClose={dismissToast} />
    </div>
  );
}
