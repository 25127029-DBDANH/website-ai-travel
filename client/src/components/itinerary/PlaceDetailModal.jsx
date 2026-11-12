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
  Sparkles,
  Utensils,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl, openGrabTransport } from '../../lib/api.js';
import { getCategoryMeta } from '../../lib/categories.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { osmPlaceUrl } from '../../lib/maps.js';
import CategoryTile from '../CategoryTile.jsx';
import RidePickerModal from '../common/RidePickerModal.jsx';

export default function PlaceDetailModal({
  stop,
  isOpen,
  onClose,
  onToggleAccept,
  onSwap,
  onOpenCheckin,
  swapping = false
}) {
  const { lang, t } = useI18n();
  const [showSwapList, setShowSwapList] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [showRideModal, setShowRideModal] = useState(false);

  useEffect(() => {
    setShowSwapList(false);
    setSelectedReplacement(null);
    setImageFailed(false);
  }, [stop?.place_id, isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const alternatives = useMemo(() => {
    if (!stop) return [];
    return api.getAlternatives(stop);
  }, [stop]);

  if (!isOpen || !stop) return null;

  const meta = getCategoryMeta(stop.category);
  const photo = !imageFailed && stop.photo_url ? assetUrl(stop.photo_url) : null;
  const displayPhoto = stop.checkin_photo || photo;
  const mapsUrl = osmPlaceUrl(stop.latitude, stop.longitude);
  const isAccepted = Boolean(stop.is_accepted);
  const isVisited = Boolean(stop.visited);
  const editorialScore = Number(stop.editorial_score) > 0 ? Number(stop.editorial_score) : 4.6;
  const openingHours = Array.isArray(stop.opening_hours) ? stop.opening_hours[0] : (stop.opening_hours || '08:00 - 18:00');

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scale-up"
      >
        {/* Nút đóng modal góc trên bên phải */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3.5 top-3.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-slate-900/60 text-white backdrop-blur transition-all hover:bg-slate-900 hover:scale-105 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header ảnh lớn & huy hiệu */}
        <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-900 sm:h-60">
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={stop.place_name}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div className={cn('h-full w-full bg-gradient-to-br opacity-80', meta.gradient)} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Badges trên ảnh */}
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur">
              <CategoryTile category={stop.category} size="sm" />
              <span>{t(`category.${stop.category}`)}</span>
            </span>
            {stop.district && (
              <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                📍 {stop.district}
              </span>
            )}
            {stop.is_lunch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm">
                <Utensils className="h-3 w-3" />
                {lang === 'vi' ? 'Bữa trưa đặc sản' : 'Lunch'}
              </span>
            )}
          </div>

          {/* Điểm đánh giá / Huy hiệu check-in */}
          <div className="absolute right-4 bottom-4">
            {stop.checkin_photo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white shadow-md">
                <Camera className="h-3.5 w-3.5" />
                {lang === 'vi' ? '📸 Đã check-in thực tế' : 'Checked-in'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-extrabold text-white shadow-md backdrop-blur">
                ★ {editorialScore.toFixed(1)} / 5.0
              </span>
            )}
          </div>

          {/* Tên địa điểm & Giờ trên banner */}
          <div className="absolute left-4 right-20 bottom-3">
            <span className="font-mono text-xs font-bold tracking-wider text-amber-300">
              {stop.time_slot || `${stop.start_time || '08:30'} - ${stop.end_time || '10:15'}`}
            </span>
            <h2 className="mt-0.5 line-clamp-2 font-display text-lg font-extrabold text-white sm:text-2xl drop-shadow-sm">
              {stop.place_name}
            </h2>
          </div>
        </div>

        {/* Nội dung cuộn chi tiết */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Trạng thái duyệt / Accept Badge */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2">
              {isAccepted ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                  <Clock className="h-4 w-4" />
                </span>
              )}
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  {isAccepted
                    ? (lang === 'vi' ? 'Đã chốt vào lịch trình chính thức' : 'Accepted in Itinerary')
                    : (lang === 'vi' ? 'Điểm dự kiến (Chưa chốt)' : 'Tentative Stop')}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isAccepted
                    ? (lang === 'vi' ? 'Điểm đến này đã được xác nhận sẵn sàng trải nghiệm.' : 'This stop is confirmed.')
                    : (lang === 'vi' ? 'Bạn có thể bấm Accept để chốt hoặc Đổi sang điểm khác.' : 'Click Accept to confirm or Swap.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleAccept && onToggleAccept(stop)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold shadow-xs transition-all active:scale-97',
                isAccepted
                  ? 'border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isAccepted ? (lang === 'vi' ? 'Đã duyệt ✓' : 'Accepted') : (lang === 'vi' ? 'Accept (Chốt điểm)' : 'Accept')}</span>
            </button>
          </div>

          {/* Grid thông tin nhanh: Địa chỉ, giờ, chi phí */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'vi' ? 'Giờ mở cửa' : 'Hours'}
                </span>
                <span className="truncate text-xs font-bold text-slate-800">
                  {openingHours}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'vi' ? 'Dự kiến / người' : 'Cost / person'}
                </span>
                <span className="truncate text-xs font-bold text-slate-800">
                  {stop.estimated_cost > 0 ? formatVnd(stop.estimated_cost, lang) : (lang === 'vi' ? 'Miễn phí vé' : 'Free')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-600">
                <Compass className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'vi' ? 'Không gian' : 'Setting'}
                </span>
                <span className="truncate text-xs font-bold text-slate-800">
                  {stop.is_indoor ? (lang === 'vi' ? 'Trong nhà (Né mưa)' : 'Indoor') : (lang === 'vi' ? 'Ngoài trời' : 'Outdoor')}
                </span>
              </div>
            </div>
          </div>

          {/* Địa chỉ chi tiết & Bản đồ */}
          {stop.address && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div>
                  <strong className="text-slate-900">{lang === 'vi' ? 'Địa chỉ:' : 'Address:'}</strong> {stop.address}
                </div>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-bold text-brand-600 hover:underline"
                >
                  <Navigation className="h-3 w-3" />
                  <span>Maps</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Giới thiệu chi tiết địa điểm */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              <span>{lang === 'vi' ? 'Giới thiệu chi tiết điểm đến' : 'Place Overview'}</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-700">
              {stop.description || 'Địa điểm tham quan nổi tiếng tại TP. Hồ Chí Minh mang đậm dấu ấn văn hóa, ẩm thực và đời sống Sài Gòn.'}
            </p>
          </div>

          {/* Nếu người dùng đã check-in thực tế */}
          {stop.checkin_photo && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-emerald-900">
                <Camera className="h-4 w-4 text-emerald-600" />
                <span>{lang === 'vi' ? 'Ảnh kỷ niệm check-in của bạn' : 'Your Check-in Memory'}</span>
                {stop.checkin_time && <span className="text-[11px] font-normal text-emerald-700">({stop.checkin_time})</span>}
              </div>
              {stop.checkin_note && (
                <p className="mt-1.5 italic text-emerald-800">
                  “{stop.checkin_note}”
                </p>
              )}
            </div>
          )}

          {/* MỤC ĐỔI ĐỊA ĐIỂM (KHI LƯỚT ĐẾN CUỐI MODAL) */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="flex items-center gap-1.5 font-display text-sm font-extrabold text-amber-950">
                  <RefreshCw className="h-4 w-4 text-amber-600" />
                  <span>{lang === 'vi' ? 'Đổi sang địa điểm khác' : 'Swap Place'}</span>
                </h4>
                <p className="mt-0.5 text-xs text-amber-800/90">
                  {lang === 'vi'
                    ? 'Bạn không thích điểm này? Chọn ngay một điểm tương đương cùng quận.'
                    : 'Not feeling this stop? Pick a similar alternative.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSwapList((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-extrabold text-amber-900 shadow-xs hover:bg-amber-100"
              >
                <span>{showSwapList ? (lang === 'vi' ? 'Thu gọn danh sách' : 'Hide') : (lang === 'vi' ? 'Xem danh sách thay thế' : 'View list')}</span>
              </button>
            </div>

            {/* DANH SÁCH CÁC ĐỊA ĐIỂM THAY THẾ KHI BẤM XEM */}
            {showSwapList && (
              <div className="mt-3 space-y-2 border-t border-amber-200/80 pt-3 animate-fade-in">
                {alternatives.length === 0 ? (
                  <p className="text-xs text-amber-800 italic">
                    {lang === 'vi' ? 'Hiện tại không có điểm thay thế cùng tiêu chí.' : 'No alternatives found.'}
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-amber-900">
                      {lang === 'vi' ? 'Chọn một địa điểm dưới đây rồi nhấn nút "Xác nhận đổi":' : 'Select an alternative and confirm:'}
                    </p>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {alternatives.map((alt) => {
                        const isSelected = selectedReplacement?.place_id === alt.place_id;
                        return (
                          <div
                            key={alt.place_id}
                            onClick={() => setSelectedReplacement(alt)}
                            className={cn(
                              'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2.5 transition-all',
                              isSelected
                                ? 'border-amber-500 bg-white shadow-sm ring-2 ring-amber-300'
                                : 'border-amber-200/70 bg-white/80 hover:bg-white hover:border-amber-300'
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                                  isSelected ? 'border-amber-600 bg-amber-500 text-white' : 'border-slate-300 bg-white text-transparent'
                                )}
                              >
                                ✓
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-extrabold text-slate-900">
                                  {alt.place_name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {alt.district} · {alt.estimated_cost > 0 ? formatVnd(alt.estimated_cost, lang) : (lang === 'vi' ? 'Miễn phí' : 'Free')}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600">
                              {t(`category.${alt.category}`)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSwapList(false)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {lang === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={!selectedReplacement || swapping}
                        onClick={handleConfirmSwap}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{lang === 'vi' ? 'Xác nhận đổi sang điểm này' : 'Confirm Swap'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action bar dính dưới chân modal */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Accept */}
            <button
              type="button"
              onClick={() => onToggleAccept && onToggleAccept(stop)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold shadow-xs transition-all active:scale-97',
                isAccepted
                  ? 'border border-emerald-400 bg-emerald-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-800 hover:border-emerald-500 hover:text-emerald-700'
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isAccepted ? (lang === 'vi' ? 'Đã duyệt ✓' : 'Accepted') : (lang === 'vi' ? 'Accept điểm này' : 'Accept stop')}</span>
            </button>

            {/* Nút Đổi địa điểm */}
            <button
              type="button"
              onClick={() => setShowSwapList(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-extrabold text-amber-900 shadow-xs hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
              <span>{lang === 'vi' ? 'Đổi địa điểm' : 'Swap Place'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Đặt xe 3 lựa chọn (Grab / Xanh SM / Be) */}
            <button
              type="button"
              onClick={() => setShowRideModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-97"
              title="Đặt xe với 3 lựa chọn: Grab, Xanh SM hoặc Be"
            >
              <Bike className="h-3.5 w-3.5" />
              <span>{lang === 'vi' ? 'Đặt xe (Grab/XanhSM/Be)' : 'Book Ride'}</span>
            </button>

            {/* Nút Chụp ảnh check-in */}
            {onOpenCheckin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCheckin(stop);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <Camera className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{lang === 'vi' ? 'Check-in' : 'Photo'}</span>
              </button>
            )}

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL ĐẶT XE (GRAB - XANH SM - BE) */}
      <RidePickerModal
        stop={stop}
        isOpen={showRideModal}
        onClose={() => setShowRideModal(false)}
      />
    </div>
  );
}
