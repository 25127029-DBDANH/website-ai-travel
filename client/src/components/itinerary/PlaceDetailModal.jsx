import {
  Bike,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Utensils,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { osmPlaceUrl } from '../../lib/maps.js';
import CategoryTile from '../CategoryTile.jsx';
import RidePickerModal from '../common/RidePickerModal.jsx';

export default function PlaceDetailModal({
  stop,
  memberCount = 1,
  isOpen,
  onClose,
  onToggleAccept,
  onSwap,
  onOpenCheckin,
  swapping = false
}) {
  const { lang, t } = useI18n();
  const titleId = useId();
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [showSwapList, setShowSwapList] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [showRideModal, setShowRideModal] = useState(false);

  useEffect(() => {
    setShowSwapList(false);
    setSelectedReplacement(null);
    setImageFailed(false);
  }, [stop?.place_id, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showRideModal) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [isOpen, onClose, showRideModal]);

  const alternatives = useMemo(() => {
    if (!stop) return [];
    return api.getAlternatives(stop);
  }, [stop]);

  if (!isOpen || !stop) return null;

  const photo = !imageFailed && stop.photo_url ? assetUrl(stop.photo_url) : null;
  const displayPhoto = stop.checkin_photo || photo;
  const mapsUrl = osmPlaceUrl(stop.latitude, stop.longitude);
  const isAccepted = Boolean(stop.is_accepted);
  const isVisited = Boolean(stop.visited);
  const editorialScore = Number(stop.editorial_score) > 0 ? Number(stop.editorial_score) : 4.6;
  const openingHours = Array.isArray(stop.opening_hours)
    ? stop.opening_hours[0]
    : stop.opening_hours || '08:00 - 18:00';
  const tags = Array.isArray(stop.tags) ? stop.tags : [];

  const handleConfirmSwap = () => {
    if (!selectedReplacement || !onSwap) return;
    onSwap(stop, selectedReplacement);
    setShowSwapList(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-3.5 top-3.5 z-20 grid h-9 w-9 place-items-center rounded-full bg-slate-900/70 text-white transition-colors hover:bg-slate-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Ảnh tiêu đề + lớp phủ tối để giữ tương phản chữ */}
        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-900 sm:h-56">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={stop.place_name}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-slate-800">
              <CategoryTile category={stop.category} size="lg" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-1.5 pr-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800">
              <span>{t(`category.${stop.category}`)}</span>
            </span>
            {stop.district ? (
              <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                {stop.district}
              </span>
            ) : null}
            {stop.is_lunch ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white">
                <Utensils className="h-3 w-3" aria-hidden="true" />
                {lang === 'vi' ? 'Bữa trưa' : 'Lunch'}
              </span>
            ) : null}
          </div>

          <div className="absolute bottom-3.5 right-4">
            {stop.checkin_photo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                {lang === 'vi' ? 'Đã check-in' : 'Checked in'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
                ★ {editorialScore.toFixed(1)}
              </span>
            )}
          </div>

          <div className="absolute bottom-3.5 left-4 right-24">
            <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
              {stop.time_slot || `${stop.start_time || '08:30'} - ${stop.end_time || '10:15'}`}
            </span>
            <h2
              id={titleId}
              className="mt-0.5 line-clamp-2 font-display text-lg font-extrabold text-white sm:text-2xl"
            >
              {stop.place_name}
            </h2>
          </div>
        </div>

        {/* Nội dung chi tiết (thông tin phụ: giờ mở cửa, chi phí chi tiết, không gian, địa chỉ, tags, ghi chú) */}
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Trạng thái ngắn gọn */}
          {isVisited ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-bold">
                  {lang === 'vi' ? 'Điểm đã hoàn thành' : 'Completed stop'}
                </p>
                <p className="mt-0.5 text-emerald-800">
                  {lang === 'vi'
                    ? 'Chặng này đã được đánh dấu hoàn tất nên tạm khóa thao tác đổi điểm.'
                    : 'This stop is marked visited and locked from edits.'}
                </p>
              </div>
            </div>
          ) : isAccepted ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                {lang === 'vi'
                  ? 'Đã chốt điểm này vào lịch trình.'
                  : 'Confirmed in your itinerary.'}
              </span>
            </div>
          ) : null}

          {/* Thông tin nhanh: Giờ mở cửa, Chi phí chi tiết, Không gian */}
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {lang === 'vi' ? 'Giờ mở cửa' : 'Opening hours'}
              </dt>
              <dd className="mt-1 text-xs font-bold text-slate-900">{openingHours}</dd>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Wallet className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {lang === 'vi' ? 'Chi phí dự kiến' : 'Estimated cost'}
              </dt>
              <dd className="mt-1 text-xs font-bold text-slate-900 tabular-nums">
                {stop.estimated_cost > 0 ? (
                  <>
                    <span>
                      {formatVnd(stop.estimated_cost, lang)}
                      {memberCount > 1 ? `/${lang === 'vi' ? 'người' : 'pp'}` : ''}
                    </span>
                    {memberCount > 1 ? (
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                        {lang === 'vi'
                          ? `Nhóm ${memberCount} người: ${formatVnd(stop.estimated_cost * memberCount, lang)}`
                          : `Group (${memberCount}): ${formatVnd(stop.estimated_cost * memberCount, lang)}`}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-emerald-700">
                    {lang === 'vi' ? 'Miễn phí' : 'Free'}
                  </span>
                )}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Compass className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {lang === 'vi' ? 'Không gian' : 'Setting'}
              </dt>
              <dd className="mt-1 text-xs font-bold text-slate-900">
                {stop.is_indoor
                  ? lang === 'vi'
                    ? 'Trong nhà'
                    : 'Indoor'
                  : lang === 'vi'
                  ? 'Ngoài trời'
                  : 'Outdoor'}
              </dd>
            </div>
          </dl>

          {/* Địa chỉ & mở bản đồ ngoài */}
          {stop.address ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-slate-900">
                    {lang === 'vi' ? 'Địa chỉ: ' : 'Address: '}
                  </span>
                  {stop.address}
                </div>
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline"
                >
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  <span>Maps</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Giới thiệu & ghi chú */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === 'vi' ? 'Giới thiệu' : 'Overview'}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {stop.description ||
                (lang === 'vi'
                  ? 'Địa điểm tham quan và trải nghiệm tại TP.HCM.'
                  : 'Local stop in Ho Chi Minh City.')}
            </p>
            {stop.notes ? (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <strong className="font-semibold text-slate-800">
                  {lang === 'vi' ? 'Ghi chú: ' : 'Note: '}
                </strong>
                {stop.notes}
              </p>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Kỷ niệm check-in nếu có */}
          {stop.checkin_photo ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <Camera className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>{lang === 'vi' ? 'Ảnh check-in của bạn' : 'Your check-in photo'}</span>
                {stop.checkin_time ? (
                  <span className="font-normal text-emerald-700">({stop.checkin_time})</span>
                ) : null}
              </div>
              {stop.checkin_note ? (
                <p className="mt-1 italic text-emerald-800">“{stop.checkin_note}”</p>
              ) : null}
            </div>
          ) : null}

          {/* Danh sách gợi ý đổi điểm (chỉ mở khi người dùng bấm Đổi địa điểm) */}
          {!isVisited && showSwapList ? (
            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {lang === 'vi' ? 'Chọn địa điểm thay thế' : 'Choose an alternative'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSwapList(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  {lang === 'vi' ? 'Thu gọn' : 'Hide'}
                </button>
              </div>

              {alternatives.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {lang === 'vi'
                    ? 'Hiện chưa có điểm thay thế cùng tiêu chí.'
                    : 'No similar alternatives available.'}
                </p>
              ) : (
                <>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                    {alternatives.map((alt) => {
                      const isSelected = selectedReplacement?.place_id === alt.place_id;
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
                                  : lang === 'vi'
                                  ? 'Miễn phí'
                                  : 'Free'}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {t(`category.${alt.category}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSwapList(false)}
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedReplacement || swapping}
                      onClick={handleConfirmSwap}
                      className="btn-primary !px-3.5 !py-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'vi' ? 'Đổi sang điểm này' : 'Confirm swap'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Thanh hành động chân modal — mỗi hành động chỉ xuất hiện 1 lần */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {!isVisited ? (
              <>
                {onToggleAccept ? (
                  <button
                    type="button"
                    onClick={() => onToggleAccept(stop)}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                      isAccepted
                        ? 'border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:text-emerald-700'
                    )}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {isAccepted ? t('itinerary.card.accepted') : t('itinerary.card.accept')}
                    </span>
                  </button>
                ) : null}

                {onSwap ? (
                  <button
                    type="button"
                    onClick={() => setShowSwapList((prev) => !prev)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('itinerary.card.swap')}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowRideModal(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'vi' ? 'Gọi xe' : 'Book ride'}</span>
                </button>

                {onOpenCheckin ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCheckin(stop);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Camera className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>{lang === 'vi' ? 'Check-in' : 'Check-in'}</span>
                  </button>
                ) : null}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>{lang === 'vi' ? 'Đã hoàn thành (chỉ xem)' : 'Completed (read-only)'}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-3.5 !py-2 text-xs"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      <RidePickerModal
        stop={stop}
        isOpen={showRideModal}
        onClose={() => setShowRideModal(false)}
      />
    </div>
  );
}
