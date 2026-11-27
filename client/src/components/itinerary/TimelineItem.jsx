import {
  Bike,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { googleMapsSearchUrl } from '../../lib/externalApps.js';
import { formatVnd } from '../../lib/format.js';
import CategoryTile from '../CategoryTile.jsx';
import OverflowMenu from './OverflowMenu.jsx';
import StopSwapModal from './StopSwapModal.jsx';

export default function TimelineItem({
  item,
  memberCount = 1,
  onSwap,
  onToggleAccept,
  onOpenDetail,
  onLocate,
  onToggleVisited,
  onBookRide,
  swapping = false,
  disabled = false
}) {
  const { lang, t } = useI18n();
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [swapError, setSwapError] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [swapSource, setSwapSource] = useState(null);
  const [failedPhoto, setFailedPhoto] = useState(null);

  const isAccepted = Boolean(item.is_accepted);
  const isVisited = Boolean(item.visited);
  const photo =
    item.photo_url && item.photo_url !== failedPhoto ? assetUrl(item.photo_url) : null;
  const mapsUrl = googleMapsSearchUrl({
    lat: item.latitude,
    lng: item.longitude,
    name: item.place_name,
    address: item.address
  });
  const timeSlot = item.time_slot || `${item.start_time || '08:30'} - ${item.end_time || '10:15'}`;

  const loadSwapSuggestions = async (reason = null) => {
    setLoadingAlternatives(true);
    setSwapError('');
    try {
      const result = await api.suggestPlaceSwaps({
        current_item: item,
        reason: reason?.trim() || null
      });
      const alts = result.alternatives || [];
      setAlternatives(alts);
      setSwapSource(result.source || 'gemini');
      setSelectedReplacement(alts[0] || null);
    } catch (requestError) {
      setSwapSource(null);
      setSwapError(
        requestError.message ||
          (lang === 'vi'
            ? 'Không tải được gợi ý đổi điểm.'
            : 'Could not load swap suggestions.')
      );
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleOpenSwapModal = async (e) => {
    e?.stopPropagation?.();
    setAlternatives([]);
    setSelectedReplacement(null);
    setSwapError('');
    setSwapReason('');
    setSwapSource(null);
    setShowSwapModal(true);
    await loadSwapSuggestions();
  };

  const handleConfirmSwap = async () => {
    if (!selectedReplacement || !onSwap) return;
    setSwapError('');
    try {
      await onSwap(item, selectedReplacement);
      setShowSwapModal(false);
    } catch (requestError) {
      setSwapError(
        requestError.message ||
          (lang === 'vi' ? 'Không thể đổi địa điểm.' : 'Could not swap this place.')
      );
    }
  };

  const handleAcceptClick = (e) => {
    e?.stopPropagation?.();
    if (onToggleAccept) {
      onToggleAccept(item);
    }
  };

  const handleNameClick = (e) => {
    e?.stopPropagation?.();
    if (onOpenDetail) {
      onOpenDetail(item);
    }
  };

  const overflowItems = [];
  if (!isVisited && onToggleAccept) {
    overflowItems.push({
      id: 'accept',
      label: isAccepted ? t('itinerary.card.unaccept') : t('itinerary.card.accept'),
      icon: isAccepted ? CheckCircle2 : Check,
      active: isAccepted,
      onSelect: handleAcceptClick
    });
  }
  if (onToggleVisited) {
    overflowItems.push({
      id: 'visited',
      label: isVisited ? t('itinerary.card.unmarkVisited') : t('itinerary.card.markVisited'),
      icon: CheckCircle2,
      active: isVisited,
      onSelect: () => onToggleVisited(item)
    });
  }

  const secondaryItems = [];
  if (onLocate) {
    secondaryItems.push({
      id: 'locate',
      label: t('itinerary.card.showOnMap'),
      icon: MapPin,
      onSelect: () => onLocate(item)
    });
  }
  if (!isVisited && onBookRide) {
    secondaryItems.push({
      id: 'ride',
      label: t('itinerary.card.bookRide'),
      icon: Bike,
      onSelect: () => onBookRide(item)
    });
  }
  if (mapsUrl) {
    secondaryItems.push({
      id: 'external-map',
      label: t('itinerary.card.open'),
      icon: ExternalLink,
      href: mapsUrl
    });
  }

  if (overflowItems.length > 0 && secondaryItems.length > 0) {
    overflowItems.push({ type: 'divider', id: 'div-stop' });
  }
  overflowItems.push(...secondaryItems);

  return (
    <>
      <article
        className={cn(
          'rounded-2xl border p-3 transition-[border-color,box-shadow,background-color] duration-200 ease-out-strong sm:p-3.5',
          isVisited
            ? 'border-emerald-200 bg-emerald-50/50'
            : isAccepted
            ? 'border-emerald-200/90 bg-white ring-1 ring-emerald-500/15'
            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-card'
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Ảnh gọn 4:3 trên desktop, 16:9 trên mobile */}
          {photo ? (
            <div className="aspect-[16/9] max-h-36 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:aspect-[4/3] sm:max-h-none sm:w-28">
              <img
                src={photo}
                alt={item.place_name}
                loading="lazy"
                decoding="async"
                width="224"
                height="168"
                onError={() => setFailedPhoto(item.photo_url)}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/9] max-h-32 w-full shrink-0 items-center justify-center rounded-xl bg-slate-100 sm:aspect-[4/3] sm:max-h-none sm:w-28">
              <CategoryTile category={item.category} size="md" />
            </div>
          )}

          {/* Thông tin cốt lõi: giờ, trạng thái, chi phí, tên, 1 dòng mô tả */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums',
                    isVisited
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-900 text-white'
                  )}
                >
                  {timeSlot}
                </span>
                {isVisited ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {t('itinerary.card.visited')}
                  </span>
                ) : isAccepted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {t('itinerary.card.accepted')}
                  </span>
                ) : null}
              </div>

              <span
                className={cn(
                  'shrink-0 font-display text-xs font-extrabold tabular-nums sm:text-sm',
                  item.estimated_cost > 0 ? 'text-slate-900' : 'text-emerald-700'
                )}
              >
                {item.estimated_cost > 0
                  ? formatVnd(item.estimated_cost, lang)
                  : lang === 'vi'
                  ? 'Miễn phí'
                  : 'Free'}
                {item.estimated_cost > 0 && memberCount > 1 ? (
                  <span className="ml-0.5 text-[11px] font-medium text-slate-500">
                    /{lang === 'vi' ? 'người' : 'pp'}
                  </span>
                ) : null}
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words font-display text-sm font-extrabold leading-snug text-slate-900 sm:text-base">
                {item.place_name}
              </h3>
              {item.description ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                  {item.description}
                </p>
              ) : null}
            </div>

            {/* Thanh thao tác: tối đa 2 nút trực tiếp (Chi tiết, Đổi địa điểm) + menu "⋯" */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-1.5">
                {onOpenDetail ? (
                  <button
                    type="button"
                    onClick={handleNameClick}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98]"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('itinerary.card.details')}</span>
                  </button>
                ) : null}

                {!isVisited && onSwap ? (
                  <button
                    type="button"
                    onClick={handleOpenSwapModal}
                    disabled={disabled || swapping}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {swapping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{swapping ? t('itinerary.card.swapping') : t('itinerary.card.swap')}</span>
                  </button>
                ) : null}
              </div>

              {overflowItems.length > 0 ? (
                <OverflowMenu
                  items={overflowItems}
                  label={`${t('itinerary.card.moreActions')}: ${item.place_name}`}
                />
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <StopSwapModal
        open={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        item={item}
        swapReason={swapReason}
        onSwapReasonChange={setSwapReason}
        onSearchReason={loadSwapSuggestions}
        alternatives={alternatives}
        selectedReplacement={selectedReplacement}
        onSelectReplacement={setSelectedReplacement}
        loadingAlternatives={loadingAlternatives}
        swapError={swapError}
        swapSource={swapSource}
        swapping={swapping}
        onConfirmSwap={handleConfirmSwap}
      />
    </>
  );
}
