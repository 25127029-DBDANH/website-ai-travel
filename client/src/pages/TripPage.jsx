import {
  AlertCircle,
  Award,
  Calendar,
  CalendarDays,
  Camera,
  Compass,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  Share2,
  Sparkles,
  Wallet
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ExpenseTrackerView from '../components/companion/ExpenseTrackerView.jsx';
import LiveCompanionView from '../components/companion/LiveCompanionView.jsx';
import TripRecapModal from '../components/companion/TripRecapModal.jsx';
import TripSummaryView from '../components/companion/TripSummaryView.jsx';
import ItineraryPanel from '../components/itinerary/ItineraryPanel.jsx';
import SaveTripPrompt from '../components/SaveTripPrompt.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO } from '../demo.jsx';
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
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          {t('itinerary.loading')}
        </div>
      </div>
    </PageShell>
  );
}

export default function TripPage() {
  const { id } = useParams();
  const { lang, t } = useI18n();
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

  // 4 Chế độ hiển thị: 'itinerary' (Lịch trình) | 'live' (Đi thực tế) | 'expense' (Sổ chi tiêu)
  const [viewMode, setViewMode] = useState('itinerary');
  const [showRecapModal, setShowRecapModal] = useState(false);

  const requestIdRef = useRef(0);
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
        message: lang === 'vi' ? `✓ Đã đổi thành "${replacement.place_name}" thành công!` : `✓ Swapped to ${replacement.place_name}!`,
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
          ? (lang === 'vi' ? '🌧️ Đã bật Chế độ Trời mưa: Chuyển các điểm ngoài trời sang điểm trong nhà, đi GrabCar.' : '🌧️ Rain Mode active.')
          : (lang === 'vi' ? 'Đã tắt chế độ trời mưa.' : 'Rain mode disabled.'),
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
          ? (lang === 'vi' ? '🚗 Đã bật Chế độ Giờ cao điểm: Khoanh vùng trong cùng 1 quận, tăng 20 phút đệm kẹt xe.' : '🚗 Rush Hour mode active.')
          : (lang === 'vi' ? 'Đã tắt chế độ giờ cao điểm.' : 'Rush Hour mode disabled.'),
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
        message: lang === 'vi' ? '💰 AI đã tối ưu giảm 20% chi phí cho các điểm đến!' : '💰 Budget optimized by 20%!',
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
          ? (lang === 'vi' ? `Đã bỏ đánh dấu ${item.place_name}` : `Unchecked ${item.place_name}`)
          : (lang === 'vi' ? `✓ Đã check-in ${item.place_name} thành công!` : `✓ Checked-in ${item.place_name}!`),
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
          ? (lang === 'vi' ? `✓ Đã chốt điểm "${item.place_name}" vào lịch trình!` : `✓ Accepted ${item.place_name}!`)
          : (lang === 'vi' ? `Đã bỏ chốt điểm "${item.place_name}"` : `Unaccepted ${item.place_name}`),
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
        message: lang === 'vi' ? `📸 Đã lưu ảnh check-in tại ${item.place_name}!` : `📸 Saved check-in photo for ${item.place_name}!`,
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

  const itineraryActions = (
    <>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        aria-label={t('trip.actions.share')}
        className="control-pill !px-3 !py-1.5 !text-xs font-bold"
      >
        <Share2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="hidden sm:inline">{t('trip.actions.share')}</span>
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={duplicating}
        aria-label={duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate')}
        className="control-pill !px-3 !py-1.5 !text-xs font-bold disabled:opacity-60"
      >
        {duplicating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-slate-500" />
        )}
        <span className="hidden sm:inline">
          {duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate')}
        </span>
      </button>
    </>
  );

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <PageShell>
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-700">
            <MapPin className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
            {t('itinerary.notFound.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('itinerary.notFound.body')}
          </p>
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
            <AlertCircle className="h-7 w-7" />
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

  return (
    <div data-lenis-prevent className="flex min-h-screen flex-col bg-slate-100/70 pb-12">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-3 pt-3 sm:px-6 lg:px-8 lg:pt-5">
        <SaveTripPrompt hasItinerary={items.length > 0} />

        {/* Tiêu đề & Tóm tắt chuyến đi */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 lg:mb-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3 w-3 text-brand-500" />
              {t('brand.name')} · TP. Hồ Chí Minh
            </p>
            <h1 className="truncate font-display text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {displayTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-xs">
              <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
              {t('common.days', { count: Number(trip.days) || 1 })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-xs">
              <Wallet className="h-3.5 w-3.5 text-accent-500" />
              {formatVnd(trip.budget, lang)}
            </span>
          </div>
        </div>

        {/* 4 TAB CHUYỂN ĐỔI CHẾ ĐỘ TRẢI NGHIỆM CHÍNH (ĐỒNG HÀNH & GIỮ CHÂN NGƯỜI DÙNG) */}
        {/* 4 TAB CHUYỂN ĐỔI CHẾ ĐỘ TRẢI NGHIỆM CHÍNH (TÔ MÀU ĐẶC TRƯNG TỪNG CHẾ ĐỘ DỄ THAO TÁC) */}
        <div className="mb-3.5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xs">
          {/* TAB 1: LỊCH TRÌNH TIMELINE (MÀU XANH DƯƠNG - BLUE) */}
          <button
            type="button"
            onClick={() => setViewMode('itinerary')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
              viewMode === 'itinerary'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                : 'border border-blue-200/80 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-900'
            )}
          >
            <CalendarDays className={cn('h-3.5 w-3.5', viewMode === 'itinerary' ? 'text-white' : 'text-blue-600')} />
            <span>{lang === 'vi' ? '1. Lịch trình Timeline' : '1. Timeline'}</span>
          </button>

          {/* TAB 2: CHẾ ĐỘ ĐI THỰC TẾ (MÀU XANH LÁ - EMERALD) */}
          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
              viewMode === 'live'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-300'
                : 'border border-emerald-200/80 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950'
            )}
          >
            <Compass className={cn('h-3.5 w-3.5', viewMode === 'live' ? 'text-white' : 'text-emerald-600')} />
            <span>{lang === 'vi' ? '2. Chế độ Đi thực tế (Companion)' : '2. Live Companion'}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </button>

          {/* TAB 3: SỔ CHI TIÊU & CƯỚC DI CHUYỂN (MÀU VÀNG CAM - AMBER) */}
          <button
            type="button"
            onClick={() => setViewMode('expense')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
              viewMode === 'expense'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                : 'border border-amber-200/80 bg-amber-50/50 text-amber-800 hover:bg-amber-100 hover:text-amber-950'
            )}
          >
            <Wallet className={cn('h-3.5 w-3.5', viewMode === 'expense' ? 'text-white' : 'text-amber-600')} />
            <span>{lang === 'vi' ? '3. Sổ chi tiêu & Di chuyển' : '3. Expense Tracker'}</span>
          </button>

          {/* TAB 4: TỔNG KẾT CHUYẾN ĐI (MÀU TÍM HOÀNG GIA - PURPLE) */}
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
              viewMode === 'summary'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-300'
                : 'border border-purple-200/80 bg-purple-50/50 text-purple-800 hover:bg-purple-100 hover:text-purple-950'
            )}
          >
            <Award className={cn('h-3.5 w-3.5', viewMode === 'summary' ? 'text-white' : 'text-purple-600')} />
            <span>{lang === 'vi' ? '4. Tổng kết chuyến đi' : '4. Trip Summary'}</span>
          </button>

          {/* NÚT XUẤT THẺ ẢNH KỶ NIỆM */}
          <button
            type="button"
            onClick={() => setShowRecapModal(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 text-xs font-extrabold text-amber-900 hover:from-amber-100 hover:to-orange-100 transition-all shadow-xs active:scale-97"
          >
            <Camera className="h-3.5 w-3.5 text-amber-600" />
            <span>{lang === 'vi' ? 'Xuất Thẻ ảnh Kỷ niệm' : 'Trip Story Card'}</span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </button>
        </div>

        {/* NỘI DUNG TƯƠNG ỨNG THEO CHẾ ĐỘ ĐANG CHỌN */}
        {viewMode === 'itinerary' && (
          <div className="h-[calc(100vh-215px)] min-h-[580px] w-full">
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
              swappingKey={swappingKey}
              loading={false}
              actions={itineraryActions}
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
            <ExpenseTrackerView
              trip={trip}
              items={items}
            />
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

      {/* MODAL THẺ ẢNH KỶ NIỆM (RECAP STORY) */}
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
