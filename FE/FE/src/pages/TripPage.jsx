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
import SaveTripPrompt from '../components/SaveTripPrompt.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api, ApiError } from '../lib/api.js';
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

  useEffect(() => {
    if (loading || !trip || bootRef.current) return;
    if (trip.status !== 'draft' || messages.length > 0) return;
    bootRef.current = true;
    const prefs = (trip.preferences || [])
      .map((preference) => {
        const key = `preference.${preference}`;
        const label = t(key);
        return label === key ? preference : label;
      })
      .filter(Boolean);
    const message =
      prefs.length > 0
        ? t('chat.initialMessageDetailed', {
            days: Number(trip.days) || 1,
            start: trip.start_location,
            budget: formatVnd(trip.budget, lang),
            preferences: prefs.join(', ')
          })
        : lang === 'vi'
          ? t('chat.initialMessageVi')
          : t('chat.initialMessage');
    sendMessage(message);
  }, [loading, trip, messages.length, lang, t, sendMessage]);

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
    if (trip?.status === 'asking') {
      return [t('chat.chip.food'), t('chat.chip.history'), t('chat.chip.balanced')];
    }
    if (trip?.status === 'completed' && items.length > 0) {
      const dayOne = items.filter((item) => item.day_number === 1);
      const target =
        dayOne.find((item) => item.category === 'food') ||
        items.find((item) => item.category === 'food') ||
        items[0];
      return [
        t('chat.defaultSwap', { place: target.place_name, day: target.day_number }),
        t('chat.defaultCoffee'),
        t('chat.defaultCheaper')
      ];
    }
    return [];
  }, [sending, trip?.status, items, t]);

  const quickReplyChips = quickReplies.length > 0 ? quickReplies : fallbackReplies;

  const handleSwap = (item) => {
    const key = `${item.day_number}-${item.order_index}`;
    sendMessage(
      t('chat.defaultSwap', { place: item.place_name, day: item.day_number }),
      { swapKey: key }
    );
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
