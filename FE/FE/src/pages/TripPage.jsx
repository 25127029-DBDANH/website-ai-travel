import {
  AlertCircle,
  CalendarDays,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Wallet
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ChatPanel from '../components/chat/ChatPanel.jsx';
import ItineraryPanel from '../components/itinerary/ItineraryPanel.jsx';
import SwapPlaceModal from '../components/itinerary/SwapPlaceModal.jsx';
import SaveTripPrompt from '../components/SaveTripPrompt.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api, ApiError } from '../lib/api.js';
import { applyRainyPlan, optimizeBudget, PLACES_CATALOG } from '../lib/catalogService.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1500px] px-3 pb-6 pt-4 sm:px-5 lg:px-8 lg:pt-6">
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
      <div className="grid gap-4 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
        <div className="grid h-[55vh] place-items-center rounded-3xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            {t('itinerary.loading')}
          </div>
        </div>
        <div className="hidden h-[55vh] animate-pulse rounded-3xl border border-slate-200 bg-white lg:block" />
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
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [swappingKey, setSwappingKey] = useState(null);
  const [tab, setTab] = useState('chat');
  const [toast, setToast] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [isRainActive, setIsRainActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches
  );

  const bootRef = useRef(false);
  const sendingRef = useRef(false);
  const activeIdRef = useRef(id);
  const requestIdRef = useRef(0);
  const tRef = useRef(t);
  activeIdRef.current = id;
  tRef.current = t;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => setIsDesktop(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const loadTrip = useCallback(async () => {
    const token = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    setNotFound(false);
    try {
      const [tripData, messageData] = await Promise.all([
        api.getTrip(id),
        api.getMessages(id)
      ]);
      if (token !== requestIdRef.current) return;
      setTrip(tripData.trip);
      setItems(tripData.itinerary_items || []);
      setBudget(tripData.budget_summary || null);
      setMessages(messageData.messages || []);
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
    bootRef.current = false;
    sendingRef.current = false;
    setMessages([]);
    setTrip(null);
    setItems([]);
    setBudget(null);
    setQuickReplies([]);
    setActiveDay(1);
    setTab('chat');
    setSending(false);
    setSwappingKey(null);
    setToast(null);
    setShareOpen(false);
    setDuplicating(false);
    loadTrip();
  }, [id, loadTrip]);

  const sendMessage = useCallback(
    async (rawText, options = {}) => {
      const text = String(rawText || '').trim().slice(0, 500);
      if (!text || sendingRef.current) return;

      const tripId = id;
      sendingRef.current = true;
      setSending(true);
      setQuickReplies([]);
      setMessages((current) => [
        ...current,
        { role: 'user', content: text, created_at: new Date().toISOString() }
      ]);
      if (options.swapKey) setSwappingKey(options.swapKey);

      try {
        const response = await api.sendMessage(tripId, text);
        if (activeIdRef.current !== tripId) return;

        const photos = (response.updated_itinerary || [])
          .filter((item) => item.photo_url)
          .slice(0, 6)
          .map((item) => ({ photo_url: item.photo_url, place_name: item.place_name }));
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: response.reply,
            created_at: new Date().toISOString(),
            photos
          }
        ]);
        setQuickReplies(response.quick_replies || []);
        setTrip((current) => (current ? { ...current, status: response.status } : current));

        if (response.updated_itinerary) {
          setItems(response.updated_itinerary);
          if (response.budget_summary) setBudget(response.budget_summary);
        } else if (response.status === 'completed') {
          const fresh = await api.getTrip(tripId);
          if (activeIdRef.current !== tripId) return;
          setItems(fresh.itinerary_items || []);
          setBudget(fresh.budget_summary || null);
          setTrip(fresh.trip);
        } else if (response.budget_summary) {
          setBudget(response.budget_summary);
        }
      } catch (error) {
        if (activeIdRef.current === tripId) {
          setToast({ message: translateApiError(tRef.current, error), tone: 'error' });
        }
      } finally {
        if (activeIdRef.current === tripId) {
          sendingRef.current = false;
          setSending(false);
          setSwappingKey(null);
        }
      }
    },
    [id]
  );

  // Tính toán lại ngân sách cục bộ tức thì với zero latency
  const calcBudget = useCallback((currentTrip, currentItems) => {
    const activities = currentItems.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
    const transit = Math.round(currentItems.length * 18000);
    const total = activities + transit;
    const target = Number(currentTrip?.budget || 0);
    return {
      total_budget: target,
      total_estimated: total,
      activities_cost: activities,
      transit_cost: transit,
      percentage: target ? Math.round((total / target) * 100) : 0,
      health: total > target ? 'over_budget' : total > target * 0.85 ? 'near_budget' : 'under_budget'
    };
  }, []);

  // Thay vì tự động gửi prompt tốn token, hiển thị lời chào cục bộ ngay khi mở chuyến đi
  useEffect(() => {
    if (loading || !trip || bootRef.current) return;
    if (trip.status !== 'draft' || messages.length > 0) return;
    bootRef.current = true;
    const welcome = lang === 'vi'
      ? `Chào bạn! Mình đã chuẩn bị sẵn khung lịch trình du lịch Sài Gòn ${trip.days} ngày cho bạn. Bạn có thể bấm trực tiếp các nút trên lịch trình để đổi điểm, bật chế độ tránh mưa, hoặc tối ưu chi phí ngay lập tức nhé!`
      : `Hello! I have prepared your ${trip.days}-day Ho Chi Minh City itinerary. You can directly tap the action buttons on the timeline to swap places, activate rain mode, or optimize budget instantly!`;
    setMessages([
      {
        role: 'assistant',
        content: welcome,
        created_at: new Date().toISOString()
      }
    ]);
  }, [loading, trip, messages.length, lang]);

  const displayTitle = useMemo(() => {
    if (!trip) return '';
    const prefs = (trip.preferences || []).slice(0, 2).map((preference) => {
      const key = `preference.${preference}`;
      const label = t(key);
      return label === key ? preference : label;
    });
    return t('trip.title', {
      days: Number(trip.days) || 1,
      prefs: prefs.length > 0 ? prefs.join(' · ') : t('trip.custom')
    });
  }, [trip, t]);

  const fallbackReplies = useMemo(() => {
    if (sending) return [];
    return [
      'Gợi ý quán ốc ngon mở sau 22h gần đây',
      'Cách đi xe buýt trên sông Sài Gòn (Waterbus)',
      'Lưu ý an toàn khi đi xe máy ở TP.HCM'
    ];
  }, [sending]);

  const quickReplyChips = quickReplies.length > 0 ? quickReplies : fallbackReplies;

  // 1-Click Smart Swap: Mở Modal thay vì gọi AI prompt
  const handleSwap = (item) => {
    setSwapTarget(item);
  };

  const handleSelectReplacement = (targetItem, replacement) => {
    setItems((currentItems) => {
      const next = currentItems.map((item) => {
        if (item.day_number === targetItem.day_number && item.order_index === targetItem.order_index) {
          return {
            ...item,
            place_id: replacement.place_id,
            place_name: replacement.place_name,
            address: replacement.address,
            description: replacement.description,
            latitude: replacement.latitude,
            longitude: replacement.longitude,
            estimated_cost: replacement.estimated_cost,
            photo_url: replacement.photo_url,
            editorial_score: replacement.editorial_score,
            category: replacement.category || item.category,
            is_indoor: replacement.is_indoor
          };
        }
        return item;
      });
      setBudget(calcBudget(trip, next));
      return next;
    });
    setToast({
      message: `Đã đổi thành công sang ${replacement.place_name}!`,
      tone: 'success'
    });
  };

  const handleRequestAi = (targetItem, customPrompt) => {
    sendMessage(`Nhờ AI đổi điểm ${targetItem.place_name}: ${customPrompt}`);
  };

  const handleDeleteItem = (targetItem) => {
    setItems((currentItems) => {
      const filtered = currentItems.filter(
        (item) => !(item.day_number === targetItem.day_number && item.order_index === targetItem.order_index)
      );
      let order = 1;
      const reindexed = filtered.map((item) => {
        if (item.day_number === targetItem.day_number) {
          const updated = { ...item, order_index: order };
          order += 1;
          return updated;
        }
        return item;
      });
      setBudget(calcBudget(trip, reindexed));
      return reindexed;
    });
    setToast({
      message: `Đã xóa điểm dừng ${targetItem.place_name}.`,
      tone: 'neutral'
    });
  };

  const handleMoveItem = (item, direction) => {
    setItems((currentItems) => {
      const dayItems = currentItems
        .filter((i) => i.day_number === item.day_number)
        .sort((a, b) => a.order_index - b.order_index);
      const currentIndex = dayItems.findIndex((i) => i.order_index === item.order_index);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= dayItems.length) return currentItems;

      const tempOrder = dayItems[currentIndex].order_index;
      dayItems[currentIndex].order_index = dayItems[targetIndex].order_index;
      dayItems[targetIndex].order_index = tempOrder;

      const otherDays = currentItems.filter((i) => i.day_number !== item.day_number);
      return [...otherDays, ...dayItems].sort(
        (a, b) => a.day_number - b.day_number || a.order_index - b.order_index
      );
    });
  };

  const handleRainMode = () => {
    const { updatedItems, replacedCount } = applyRainyPlan(items);
    if (replacedCount > 0) {
      setItems(updatedItems);
      setBudget(calcBudget(trip, updatedItems));
      setIsRainActive(true);
      setToast({
        message: `Đã kích hoạt Tránh Mưa: Thay thế ${replacedCount} điểm ngoài trời bằng điểm trong nhà máy lạnh!`,
        tone: 'success'
      });
    } else {
      setToast({
        message: 'Tất cả các điểm dừng hiện tại đều đã ở trong nhà hoặc có mái che.',
        tone: 'neutral'
      });
    }
  };

  const handleBudgetOptimize = () => {
    const { updatedItems, savings } = optimizeBudget(items, trip?.budget);
    if (savings > 0) {
      setItems(updatedItems);
      setBudget(calcBudget(trip, updatedItems));
      setToast({
        message: `Đã tối ưu chi phí! Tiết kiệm ước tính ${formatVnd(savings, lang)} cho chuyến đi.`,
        tone: 'success'
      });
    } else {
      setToast({
        message: 'Lịch trình của bạn đã ở mức chi phí tiết kiệm tối ưu.',
        tone: 'neutral'
      });
    }
  };

  const handleAddCafe = () => {
    const cafes = PLACES_CATALOG.filter((p) => p.category === 'cafe');
    const existingNames = new Set(items.map((i) => (i.place_name || '').toLowerCase()));
    const available = cafes.find((c) => !existingNames.has(c.place_name.toLowerCase())) || cafes[0];
    const dayStops = items.filter((i) => i.day_number === activeDay);
    const maxOrder = dayStops.length > 0 ? Math.max(...dayStops.map((i) => i.order_index)) : 0;
    const newStop = {
      ...available,
      day_number: activeDay,
      order_index: maxOrder + 1,
      time_slot: '15:30',
      place_id: `cafe-${Date.now()}`
    };
    const next = [...items, newStop];
    setItems(next);
    setBudget(calcBudget(trip, next));
    setToast({
      message: `Đã thêm điểm dừng ${available.place_name} vào ngày ${activeDay}!`,
      tone: 'success'
    });
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
        className="control-pill !px-2.5 !py-1.5 !text-[10.5px]"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('trip.actions.share')}</span>
      </button>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={duplicating}
        aria-label={duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate')}
        className="control-pill !px-2.5 !py-1.5 !text-[10.5px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {duplicating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">
          {duplicating ? t('trip.actions.duplicating') : t('trip.actions.duplicate')}
        </span>
      </button>
    </>
  );

  if (DEMO) {
    return (
      <div data-lenis-prevent className="flex h-[100dvh] min-h-[560px] flex-col bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 lg:px-8 lg:pb-5 lg:pt-5">
          <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3 lg:mb-4">
            <div className="min-w-0 space-y-2">
              <p className="hidden items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:flex">
                <Sparkles className="h-3 w-3 text-brand-500" />
                {t('brand.name')}
              </p>
              <Black className="h-6 w-56 rounded-lg" />
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <Black className="h-7 w-24 rounded-full" />
              <Black className="h-7 w-24 rounded-full" />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:gap-5">
            {isDesktop ? (
              <>
                <div className="h-full min-h-0 min-w-0">
                  <ChatPanel messages={[]} quickReplies={[]} sending={false} onSend={() => {}} demo />
                </div>
                <div className="h-full min-h-0 min-w-0">
                  <ItineraryPanel demo />
                </div>
              </>
            ) : (
              <div className="h-full min-h-0 min-w-0">
                {tab === 'chat' ? (
                  <ChatPanel messages={[]} quickReplies={[]} sending={false} onSend={() => {}} demo />
                ) : (
                  <ItineraryPanel demo />
                )}
              </div>
            )}
          </div>
        </main>

        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-4 pt-1.5 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('chat')}
              aria-pressed={tab === 'chat'}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-[transform,color,background-color] duration-200 ease-out-strong active:scale-[0.98]',
                tab === 'chat' ? 'text-brand-700' : 'text-slate-500'
              )}
            >
              <span
                className={cn(
                  'relative grid h-8 w-12 place-items-center rounded-xl transition-[background-color] duration-200 ease-out-strong',
                  tab === 'chat' && 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm'
                )}
              >
                <MessageCircle className="h-4 w-4" />
              </span>
              {t('itinerary.mobile.chat')}
            </button>

            <button
              type="button"
              onClick={() => setTab('itinerary')}
              aria-pressed={tab === 'itinerary'}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-[transform,color,background-color] duration-200 ease-out-strong active:scale-[0.98]',
                tab === 'itinerary' ? 'text-brand-700' : 'text-slate-500'
              )}
            >
              <span
                className={cn(
                  'relative grid h-8 w-12 place-items-center rounded-xl transition-[background-color] duration-200 ease-out-strong',
                  tab === 'itinerary' && 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm'
                )}
              >
                <CalendarDays className="h-4 w-4" />
              </span>
              {t('itinerary.mobile.itinerary')}
            </button>
          </div>
        </nav>
      </div>
    );
  }

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <PageShell>
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700">
            <MapPin className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
            {t('itinerary.notFound.title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
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
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
            {t('chat.error')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{loadError}</p>
          <button type="button" onClick={loadTrip} className="btn-primary mt-6">
            {t('common.retry')}
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <div data-lenis-prevent className="flex h-[100dvh] min-h-[560px] flex-col bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 lg:px-8 lg:pb-5 lg:pt-5">
        <SaveTripPrompt hasItinerary={items.length > 0} />
        <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3 lg:mb-4">
          <div className="min-w-0">
            <p className="hidden items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:flex">
              <Sparkles className="h-3 w-3 text-brand-500" />
              {t('brand.name')}
            </p>
            <h1 className="truncate font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-xl">
              {displayTitle}
            </h1>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-500 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
              {t('common.days', { count: Number(trip.days) || 1 })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-500 shadow-sm">
              <Wallet className="h-3.5 w-3.5 text-accent-500" />
              {formatVnd(trip.budget, lang)}
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:gap-5">
          {isDesktop ? (
            <>
              <div className="h-full min-h-0 min-w-0">
                <ChatPanel
                  messages={messages}
                  quickReplies={sending ? [] : quickReplyChips}
                  sending={sending}
                  onSend={sendMessage}
                />
              </div>
              <div className="h-full min-h-0 min-w-0">
                <ItineraryPanel
                  trip={trip}
                  items={items}
                  budget={budget}
                  status={trip.status}
                  activeDay={activeDay}
                  onSelectDay={setActiveDay}
                  onSwap={handleSwap}
                  onDelete={handleDeleteItem}
                  onMoveUp={(item) => handleMoveItem(item, 'up')}
                  onMoveDown={(item) => handleMoveItem(item, 'down')}
                  onRainMode={handleRainMode}
                  onBudgetOptimize={handleBudgetOptimize}
                  onAddCafe={handleAddCafe}
                  isRainActive={isRainActive}
                  swappingKey={swappingKey}
                  loading={sending && items.length === 0}
                  actions={itineraryActions}
                />
              </div>
            </>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === 'chat' ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === 'chat' ? 16 : -16 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="h-full min-h-0 min-w-0"
              >
                {tab === 'chat' ? (
                  <ChatPanel
                    messages={messages}
                    quickReplies={sending ? [] : quickReplyChips}
                    sending={sending}
                    onSend={sendMessage}
                  />
                ) : (
                  <ItineraryPanel
                    trip={trip}
                    items={items}
                    budget={budget}
                    status={trip.status}
                    activeDay={activeDay}
                    onSelectDay={setActiveDay}
                    onSwap={handleSwap}
                    onDelete={handleDeleteItem}
                    onMoveUp={(item) => handleMoveItem(item, 'up')}
                    onMoveDown={(item) => handleMoveItem(item, 'down')}
                    onRainMode={handleRainMode}
                    onBudgetOptimize={handleBudgetOptimize}
                    onAddCafe={handleAddCafe}
                    isRainActive={isRainActive}
                    swappingKey={swappingKey}
                    loading={sending && items.length === 0}
                    actions={itineraryActions}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <SwapPlaceModal
        open={Boolean(swapTarget)}
        onClose={() => setSwapTarget(null)}
        targetItem={swapTarget}
        itineraryItems={items}
        onSelectReplacement={handleSelectReplacement}
        onRequestAi={handleRequestAi}
      />

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-4 pt-1.5 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('chat')}
            aria-pressed={tab === 'chat'}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-[transform,color,background-color] duration-200 ease-out-strong active:scale-[0.98]',
              tab === 'chat' ? 'text-brand-700' : 'text-slate-500'
            )}
          >
            <span
              className={cn(
                'relative grid h-8 w-12 place-items-center rounded-xl transition-[background-color] duration-200 ease-out-strong',
                tab === 'chat' && 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm'
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {sending && (
                <span className="absolute right-2.5 top-1 h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent-500" />
              )}
            </span>
            {t('itinerary.mobile.chat')}
          </button>

          <button
            type="button"
            onClick={() => setTab('itinerary')}
            aria-pressed={tab === 'itinerary'}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-[transform,color,background-color] duration-200 ease-out-strong active:scale-[0.98]',
              tab === 'itinerary' ? 'text-brand-700' : 'text-slate-500'
            )}
          >
            <span
              className={cn(
                'relative grid h-8 w-12 place-items-center rounded-xl transition-[background-color] duration-200 ease-out-strong',
                tab === 'itinerary' && 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {items.length > 0 && tab !== 'itinerary' && (
                <span className="absolute right-2.5 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </span>
            {t('itinerary.mobile.itinerary')}
          </button>
        </div>
      </nav>

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
