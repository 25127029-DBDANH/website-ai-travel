import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Utensils,
  X
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import {
  getDisplayPlaceName,
  googleMapsPlaceUrl,
  resolveCategoryKey
} from '../../lib/placeDetail.js';
import CategoryTile from '../CategoryTile.jsx';
import RidePickerModal from '../common/RidePickerModal.jsx';
import NearbyPlaces from './NearbyPlaces.jsx';
import PlaceFacts from './PlaceFacts.jsx';

const DRAWER_EASE = [0.23, 1, 0.32, 1];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (event) => setIsDesktop(event.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('Copy failed');
}

export default function PlaceDrawer({
  isOpen,
  entry,
  canGoBack = false,
  onBack,
  onClose,
  onSelectNearby
}) {
  const { lang, t } = useI18n();
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const titleId = useId();
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const scrollRef = useRef(null);

  const [imageFailed, setImageFailed] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [showSwapList, setShowSwapList] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);

  const entryKey = entry?.entryKey ?? null;
  const place = entry?.place ?? null;
  const actions = entry?.actions ?? null;
  const stop = actions?.stop ?? entry?.rawStop ?? null;
  const memberCount = Number(actions?.memberCount) || 1;
  const swapping = Boolean(actions?.swapping);
  const loadingDetail = Boolean(entry?.loadingDetail);
  const detailError = Boolean(entry?.detailError);
  const notFound = Boolean(entry?.notFound);
  const nearby = entry?.nearby ?? [];
  const loadingNearby = Boolean(entry?.loadingNearby);

  useEffect(() => {
    setImageFailed(false);
    setCopyState('idle');
    setShowSwapList(false);
    setSelectedReplacement(null);
    setShowRideModal(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [entryKey, isOpen]);

  useEffect(() => {
    if (copyState === 'idle') return undefined;
    const timer = window.setTimeout(() => setCopyState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useFocusTrap({
    active: isOpen,
    containerRef: panelRef,
    onClose,
    initialFocusRef: closeBtnRef,
    pauseEscape: showRideModal,
    pauseTrap: showRideModal
  });

  const alternatives = useMemo(() => {
    if (!stop || !actions?.onSwap) return [];
    return api.getAlternatives(stop);
  }, [stop, actions?.onSwap]);

  const displayName = place
    ? getDisplayPlaceName(place, lang)
    : notFound
      ? t('place.notFoundTitle')
      : t('place.loadingTitle');

  const categoryKey = place?.category ? resolveCategoryKey(place.category) : null;
  const resolvedPhoto = !imageFailed && place?.photoUrl ? assetUrl(place.photoUrl) : null;
  const displayPhoto = stop?.checkin_photo || resolvedPhoto;
  const showIllustrationBadge = Boolean(displayPhoto && !stop?.checkin_photo && place?.isGenericPhoto);
  const showCheckinBadge = Boolean(stop?.checkin_photo);
  const showPhotoOverlay = showIllustrationBadge || showCheckinBadge;

  const mapsUrl = place ? googleMapsPlaceUrl(place.lat, place.lng) : null;
  const isAccepted = Boolean(stop?.is_accepted);
  const isVisited = Boolean(stop?.visited);
  const timeSlot =
    stop?.time_slot || (stop?.start_time && stop?.end_time ? `${stop.start_time} - ${stop.end_time}` : '');

  const hasItineraryActions = Boolean(
    actions &&
      (actions.onToggleAccept ||
        actions.onSwap ||
        actions.allowBookRide ||
        actions.onOpenCheckin ||
        actions.onToggleVisited ||
        actions.onLocate)
  );

  const rideStop = place
    ? {
        place_name: displayName,
        address: place.address,
        latitude: place.lat,
        longitude: place.lng,
        transit_info: stop?.transit_info
      }
    : null;

  const handleCopyAddress = async () => {
    if (!place?.address) return;
    try {
      await copyText(place.address);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const handleConfirmSwap = () => {
    if (!selectedReplacement || !actions?.onSwap || !stop) return;
    actions.onSwap(stop, selectedReplacement);
    setShowSwapList(false);
    onClose();
  };

  const handleLocate = () => {
    if (!actions?.onLocate || !stop) return;
    actions.onLocate(stop);
    if (!isDesktop) onClose();
  };

  const panelInitial = reduced
    ? { opacity: 1 }
    : isDesktop
      ? { x: '100%', opacity: 0.7 }
      : { y: '100%', opacity: 0.7 };
  const panelAnimate = reduced ? { opacity: 1 } : { x: 0, y: 0, opacity: 1 };
  const panelExit = reduced
    ? { opacity: 0 }
    : isDesktop
      ? { x: '100%', opacity: 0.7 }
      : { y: '100%', opacity: 0.7 };

  return (
    <>
      <AnimatePresence>
        {isOpen && entry ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end">
            <motion.div
              aria-hidden="true"
              onClick={onClose}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: DRAWER_EASE }}
              className="fixed inset-0 bg-slate-900/20"
            />

            <motion.aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              transition={{ duration: reduced ? 0 : 0.2, ease: DRAWER_EASE }}
              className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-soft outline-none md:h-full md:max-h-none md:w-[min(440px,100vw)] md:rounded-none md:border-l md:border-t-0 md:pb-0"
            >
              {/* Mobile drag indicator (decorative) */}
              <div
                aria-hidden="true"
                className="flex shrink-0 justify-center pb-1.5 pt-2.5 md:hidden"
              >
                <span className="h-1 w-10 rounded-full bg-slate-300" />
              </div>

              {/* Floating Back & Close controls */}
              <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex items-center justify-between px-3.5 md:top-3.5">
                <div>
                  {canGoBack ? (
                    <button
                      type="button"
                      onClick={onBack}
                      className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-900 active:scale-[0.97]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('place.back')}</span>
                    </button>
                  ) : null}
                </div>

                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-slate-900/75 text-white transition-colors hover:bg-slate-900 active:scale-[0.97]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable drawer content */}
              <div
                ref={scrollRef}
                data-lenis-prevent
                className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain"
              >
                {notFound && !place ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                      <MapPin className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h2
                      id={titleId}
                      className="mt-4 font-display text-lg font-extrabold text-slate-900"
                    >
                      {t('place.notFoundTitle')}
                    </h2>
                    <p className="mt-1.5 max-w-xs text-sm text-slate-600">
                      {t('place.notFoundBody')}
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.97]"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 1. Hero photo 16:9 */}
                    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100">
                      {displayPhoto ? (
                        <img
                          src={displayPhoto}
                          alt={displayName}
                          onError={() => setImageFailed(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : loadingDetail && !place ? (
                        <div className="h-full w-full animate-pulse bg-slate-200" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-slate-100">
                          <CategoryTile category={categoryKey || 'sightseeing'} size="lg" />
                        </div>
                      )}

                      {showPhotoOverlay ? (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/70 to-transparent"
                        />
                      ) : null}

                      {showIllustrationBadge ? (
                        <span className="absolute bottom-2.5 left-3 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          {t('place.illustration')}
                        </span>
                      ) : null}

                      {showCheckinBadge ? (
                        <span className="absolute bottom-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          <Camera className="h-3 w-3" aria-hidden="true" />
                          <span>{t('place.checkedIn')}</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-5 p-4 sm:p-5">
                      {/* 2. Title + Category & District chips */}
                      <div>
                        <h2
                          id={titleId}
                          className="font-display text-xl font-extrabold leading-snug text-slate-900"
                        >
                          {displayName}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {categoryKey ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {t(`category.${categoryKey}`)}
                            </span>
                          ) : null}

                          {place?.district ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {place.district}
                            </span>
                          ) : null}

                          {timeSlot ? (
                            <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums">
                              {timeSlot}
                            </span>
                          ) : null}

                          {stop?.is_lunch ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                              <Utensils className="h-3 w-3" aria-hidden="true" />
                              <span>{t('place.lunch')}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Itinerary stop status banners */}
                      {isVisited ? (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-bold">{t('place.visitedBannerTitle')}</p>
                            <p className="mt-0.5 text-emerald-800">
                              {t('place.visitedBannerBody')}
                            </p>
                          </div>
                        </div>
                      ) : isAccepted ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                          <span>{t('place.acceptedBanner')}</span>
                        </div>
                      ) : null}

                      {/* Non-blocking error note when enrichment fails */}
                      {detailError ? (
                        <p
                          role="status"
                          className="flex items-center gap-1.5 text-xs text-slate-500"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          <span>{t('place.loadError')}</span>
                        </p>
                      ) : null}

                      {/* 3. Quick facts grid */}
                      <PlaceFacts
                        place={place}
                        stop={stop}
                        memberCount={memberCount}
                        loading={loadingDetail}
                      />

                      {/* 4. Description, stop notes, and check-in memory */}
                      {place?.description ? (
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            {t('place.section.about')}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                            {place.description}
                          </p>
                        </div>
                      ) : loadingDetail ? (
                        <div className="space-y-2" aria-hidden="true">
                          <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
                          <div className="h-3 w-full animate-pulse rounded bg-slate-200/80" />
                          <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200/70" />
                        </div>
                      ) : null}

                      {stop?.notes ? (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                          <strong className="font-semibold text-slate-800">
                            {t('place.section.note')}:{' '}
                          </strong>
                          {stop.notes}
                        </p>
                      ) : null}

                      {stop?.checkin_photo ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                          <div className="flex items-center gap-2 font-bold text-emerald-900">
                            <Camera className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                            <span>{t('place.checkinPhotoTitle')}</span>
                            {stop.checkin_time ? (
                              <span className="font-normal text-emerald-700">
                                ({stop.checkin_time})
                              </span>
                            ) : null}
                          </div>
                          {stop.checkin_note ? (
                            <p className="mt-1 italic text-emerald-800">“{stop.checkin_note}”</p>
                          ) : null}
                        </div>
                      ) : null}

                      {/* 5. Tags */}
                      {place?.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {place.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* 6. Address + Copy + Google Maps Directions */}
                      {place?.address || mapsUrl ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                          {place?.address ? (
                            <div className="flex items-start gap-2.5 text-sm text-slate-700">
                              <MapPin
                                className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-slate-500">
                                  {t('place.section.address')}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-800 sm:text-sm">
                                  {place.address}
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div
                            className={cn(
                              'flex flex-wrap items-center gap-2',
                              place?.address ? 'mt-3 border-t border-slate-100 pt-3' : ''
                            )}
                          >
                            {place?.address ? (
                              <button
                                type="button"
                                onClick={handleCopyAddress}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
                              >
                                {copyState === 'copied' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                )}
                                <span>
                                  {copyState === 'copied'
                                    ? t('place.copied')
                                    : copyState === 'error'
                                      ? t('place.copyError')
                                      : t('place.copyAddress')}
                                </span>
                              </button>
                            ) : null}

                            {mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.97]"
                              >
                                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{t('place.directions')}</span>
                                <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
                              </a>
                            ) : null}

                            <span
                              role="status"
                              aria-live="polite"
                              aria-atomic="true"
                              className="sr-only"
                            >
                              {copyState === 'copied'
                                ? t('place.copied')
                                : copyState === 'error'
                                  ? t('place.copyError')
                                  : ''}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* 7. Itinerary contextual actions */}
                      {hasItineraryActions ? (
                        <section
                          aria-label={t('place.section.actions')}
                          className="space-y-3 border-t border-slate-200 pt-4"
                        >
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            {t('place.section.actions')}
                          </h3>

                          <div className="flex flex-wrap gap-2">
                            {!isVisited && actions.onToggleAccept ? (
                              <button
                                type="button"
                                onClick={() => actions.onToggleAccept(stop)}
                                aria-pressed={isAccepted}
                                className={cn(
                                  'inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors active:scale-[0.97]',
                                  isAccepted
                                    ? 'border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:text-emerald-700'
                                )}
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>
                                  {isAccepted
                                    ? t('itinerary.card.accepted')
                                    : t('itinerary.card.accept')}
                                </span>
                              </button>
                            ) : null}

                            {!isVisited && actions.onSwap ? (
                              <button
                                type="button"
                                onClick={() => setShowSwapList((prev) => !prev)}
                                aria-expanded={showSwapList}
                                className={cn(
                                  'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors active:scale-[0.97]',
                                  showSwapList
                                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                                )}
                              >
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{t('itinerary.card.swap')}</span>
                              </button>
                            ) : null}

                            {!isVisited && actions.allowBookRide ? (
                              <button
                                type="button"
                                onClick={() => setShowRideModal(true)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.97]"
                              >
                                <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{t('place.bookRide')}</span>
                              </button>
                            ) : null}

                            {!isVisited && actions.onOpenCheckin ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  actions.onOpenCheckin(stop);
                                }}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.97]"
                              >
                                <Camera className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                <span>{t('place.checkin')}</span>
                              </button>
                            ) : null}

                            {actions.onToggleVisited ? (
                              <button
                                type="button"
                                onClick={() => actions.onToggleVisited(stop)}
                                aria-pressed={isVisited}
                                className={cn(
                                  'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors active:scale-[0.97]',
                                  isVisited
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                                )}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>
                                  {isVisited
                                    ? t('itinerary.card.unmarkVisited')
                                    : t('itinerary.card.markVisited')}
                                </span>
                              </button>
                            ) : null}

                            {actions.onLocate ? (
                              <button
                                type="button"
                                onClick={handleLocate}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.97]"
                              >
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{t('itinerary.card.showOnMap')}</span>
                              </button>
                            ) : null}
                          </div>

                          {/* Inline swap alternatives picker */}
                          {!isVisited && showSwapList && actions.onSwap ? (
                            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-display text-xs font-bold text-slate-900">
                                  {t('place.swap.title')}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setShowSwapList(false)}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                                >
                                  {t('place.swap.hide')}
                                </button>
                              </div>

                              {alternatives.length === 0 ? (
                                <p className="text-xs text-slate-500">{t('place.swap.empty')}</p>
                              ) : (
                                <>
                                  <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                                    {alternatives.map((alt) => {
                                      const isSelected =
                                        selectedReplacement?.place_id === alt.place_id;
                                      const altCatKey = resolveCategoryKey(alt.category);
                                      return (
                                        <button
                                          key={alt.place_id}
                                          type="button"
                                          onClick={() => setSelectedReplacement(alt)}
                                          aria-pressed={isSelected}
                                          className={cn(
                                            'flex w-full items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-colors',
                                            isSelected
                                              ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-200'
                                              : 'border-slate-200 bg-white hover:border-slate-300'
                                          )}
                                        >
                                          <div className="flex min-w-0 items-center gap-2.5">
                                            <span
                                              aria-hidden="true"
                                              className={cn(
                                                'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                                                isSelected
                                                  ? 'border-brand-600 bg-brand-600 text-white'
                                                  : 'border-slate-300 bg-white text-transparent'
                                              )}
                                            >
                                              <Check className="h-3 w-3" strokeWidth={3} />
                                            </span>
                                            <div className="min-w-0">
                                              <p className="truncate text-xs font-bold text-slate-900">
                                                {alt.place_name}
                                              </p>
                                              <p className="text-[11px] text-slate-500">
                                                {alt.district} ·{' '}
                                                {alt.estimated_cost > 0
                                                  ? formatVnd(alt.estimated_cost, lang)
                                                  : t('place.fact.free')}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                            {t(`category.${altCatKey}`)}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setShowSwapList(false)}
                                      className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {t('common.cancel')}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!selectedReplacement || swapping}
                                      onClick={handleConfirmSwap}
                                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span>{t('place.swap.confirm')}</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </section>
                      ) : null}

                      {/* 8. Nearby places */}
                      <NearbyPlaces
                        places={nearby}
                        loading={loadingNearby}
                        onSelect={onSelectNearby}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <RidePickerModal
        stop={rideStop}
        isOpen={Boolean(showRideModal && rideStop)}
        onClose={() => setShowRideModal(false)}
      />
    </>
  );
}
