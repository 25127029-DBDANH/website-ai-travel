import {
  Bike,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Utensils,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl, openGrabTransport } from '../../lib/api.js';
import { getCategoryMeta } from '../../lib/categories.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import CategoryTile from '../CategoryTile.jsx';

export default function TimelineItem({
  item,
  onSwap,
  onToggleAccept,
  onOpenDetail,
  onLocate,
  swapping = false,
  disabled = false
}) {
  const { lang, t } = useI18n();
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [alternatives, setAlternatives] = useState([]);

  const meta = getCategoryMeta(item.category);
  const isAccepted = Boolean(item.is_accepted);
  const isVisited = Boolean(item.visited);

  const handleOpenSwapModal = (e) => {
    e.stopPropagation();
    const alts = api.getAlternatives(item);
    setAlternatives(alts);
    setSelectedReplacement(alts[0] || null);
    setShowSwapModal(true);
  };

  const handleConfirmSwap = () => {
    if (!selectedReplacement || !onSwap) return;
    onSwap(item, selectedReplacement);
    setShowSwapModal(false);
  };

  const handleAcceptClick = (e) => {
    e.stopPropagation();
    if (onToggleAccept) {
      onToggleAccept(item);
    }
  };

  const handleNameClick = (e) => {
    e.stopPropagation();
    if (onOpenDetail) {
      onOpenDetail(item);
    }
  };

  return (
    <>
      <article
        onClick={handleNameClick}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200',
          isVisited
            ? 'border-emerald-300 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-200/80 hover:bg-emerald-50'
            : isAccepted
            ? 'border-emerald-300 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-200/80 hover:bg-emerald-50/60'
            : 'border-slate-200/90 bg-white shadow-xs hover:border-brand-300 hover:shadow-sm'
        )}
      >
        <div className={cn('h-1 w-full bg-gradient-to-r', isVisited ? 'from-emerald-500 to-teal-500' : meta.gradient)} />

        <div className="flex flex-col gap-2.5 p-3.5 sm:px-4">
          {/* TẦNG 1 (HEADER ROW): Khung giờ, Icon loại hình, Huy hiệu Quận/Bữa trưa/Check-in, và Chi phí góc phải */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
              {/* Khung giờ */}
              <span
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 font-mono text-[11px] font-extrabold tracking-tight shadow-xs',
                  isVisited
                    ? 'bg-emerald-700 text-white'
                    : item.is_lunch
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                    : 'bg-slate-900 text-white'
                )}
              >
                {item.time_slot || `${item.start_time || '08:30'} - ${item.end_time || '10:15'}`}
              </span>

              {/* Icon phân loại */}
              <CategoryTile category={item.category} size="sm" />

              {/* Huy hiệu Quận */}
              {item.district && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  📍 {item.district}
                </span>
              )}

              {/* Huy hiệu Bữa trưa */}
              {item.is_lunch && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200">
                  <Utensils className="h-3 w-3 text-amber-600" />
                  {lang === 'vi' ? 'Bữa trưa' : 'Lunch'}
                </span>
              )}

              {/* Huy hiệu Đã hoàn thành / Check-in */}
              {isVisited && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  {lang === 'vi' ? 'Đã hoàn thành' : 'Completed'}
                </span>
              )}

              {item.checkin_photo && (
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800">
                  📸 Check-in
                </span>
              )}
            </div>

            {/* Chi phí hiển thị góc phải trên cùng (Rõ ràng, không bao giờ bị đè) */}
            <div className="shrink-0 text-right">
              <span className={cn(
                'inline-block font-display text-xs sm:text-sm font-extrabold',
                isVisited ? 'text-emerald-900 font-black' : 'text-slate-900'
              )}>
                {item.estimated_cost > 0 ? formatVnd(item.estimated_cost, lang) : (lang === 'vi' ? 'Miễn phí' : 'Free')}
              </span>
            </div>
          </div>

          {/* TẦNG 2 (TIÊU ĐỀ ĐỊA ĐIỂM): Chiếm trọn 100% bề ngang, hiển thị đầy đủ không bị che khuất */}
          <div className="w-full">
            <button
              type="button"
              onClick={handleNameClick}
              className="group/name text-left w-full"
              title={lang === 'vi' ? 'Bấm để xem màn hình giới thiệu chi tiết' : 'Click to view place details'}
            >
              <h3
                className={cn(
                  'font-display text-sm sm:text-base font-extrabold leading-snug transition-colors line-clamp-2',
                  isVisited
                    ? 'text-emerald-950 group-hover/name:text-emerald-700'
                    : isAccepted
                    ? 'text-emerald-950 group-hover/name:text-emerald-700'
                    : 'text-slate-900 group-hover/name:text-brand-600'
                )}
              >
                {item.place_name}
              </h3>
            </button>
            {item.description && (
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 line-clamp-1">
                {item.description}
              </p>
            )}
          </div>

          {/* TẦNG 3 (ACTION BAR RIÊNG BIỆT PHÍA DƯỚI): Nút bấm logic */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/90 pt-2.5 mt-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="hidden sm:inline">{lang === 'vi' ? 'Bấm vào thẻ để xem chi tiết' : 'Click for details'}</span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* NẾU ĐÃ HOÀN THÀNH: KHÔNG CHO PHÉP ĐỔI ĐỊA ĐIỂM (Logic thực tế chuẩn) */}
              {isVisited ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100/80 px-3 py-1.5 text-xs font-extrabold text-emerald-900 shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === 'vi' ? 'Chặng đã hoàn tất ✓' : 'Stop completed ✓'}</span>
                </span>
              ) : (
                <>
                  {/* NÚT 1: ACCEPT */}
                  <button
                    type="button"
                    onClick={handleAcceptClick}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold shadow-xs transition-all active:scale-95',
                      isAccepted
                        ? 'border border-emerald-400 bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                    )}
                    title={isAccepted ? (lang === 'vi' ? 'Đã duyệt điểm này. Bấm để bỏ chọn.' : 'Accepted. Click to undo.') : (lang === 'vi' ? 'Chấp nhận và chốt điểm này vào lịch trình' : 'Accept this stop')}
                  >
                    {isAccepted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{lang === 'vi' ? 'Đã duyệt ✓' : 'Accepted'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600" />
                        <span>{lang === 'vi' ? 'Accept' : 'Accept'}</span>
                      </>
                    )}
                  </button>

                  {/* NÚT 2: ĐỔI ĐỊA ĐIỂM */}
                  <button
                    type="button"
                    onClick={handleOpenSwapModal}
                    disabled={disabled || swapping}
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 shadow-xs transition-all hover:bg-amber-100 hover:border-amber-400 active:scale-95 disabled:opacity-50"
                    title={lang === 'vi' ? 'Đổi sang địa điểm tham quan khác' : 'Swap to another place'}
                  >
                    {swapping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                    )}
                    <span>{lang === 'vi' ? 'Đổi địa điểm' : 'Swap'}</span>
                  </button>
                </>
              )}

              {/* NÚT XEM CHI TIẾT */}
              <button
                type="button"
                onClick={handleNameClick}
                className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"
                title={lang === 'vi' ? 'Mở cửa sổ giới thiệu chi tiết' : 'View details'}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {/* NÚT ĐỊNH VỊ TRÊN BẢN ĐỒ */}
              {onLocate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocate(item);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  title={lang === 'vi' ? 'Xem vị trí trên bản đồ' : 'Show on map'}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* MODAL ĐỔI ĐỊA ĐIỂM (DANH SÁCH CÁC ĐIỂM THAY THẾ) */}
      {showSwapModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowSwapModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-extrabold text-slate-900 sm:text-base">
                    {lang === 'vi' ? 'Đổi địa điểm cho chặng này' : 'Swap Place'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'vi' ? 'Điểm hiện tại:' : 'Current stop:'} <strong className="text-slate-800">{item.place_name}</strong> ({item.time_slot})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold text-slate-700">
                {lang === 'vi' ? 'Chọn 1 địa điểm thay thế phù hợp:' : 'Select an alternative stop:'}
              </p>

              <div className="mt-2.5 max-h-72 space-y-2 overflow-y-auto pr-1">
                {alternatives.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    {lang === 'vi' ? 'Không có địa điểm thay thế khả dụng.' : 'No alternatives available.'}
                  </p>
                ) : (
                  alternatives.map((alt) => {
                    const isSelected = selectedReplacement?.place_id === alt.place_id;
                    const altPhoto = alt.photo_url ? assetUrl(alt.photo_url) : null;
                    return (
                      <div
                        key={alt.place_id}
                        onClick={() => setSelectedReplacement(alt)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition-all',
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-2 ring-brand-300'
                            : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50/80'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {altPhoto ? (
                            <img
                              src={altPhoto}
                              alt={alt.place_name}
                              className="h-12 w-12 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
                              <MapPin className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="truncate font-display text-xs font-extrabold text-slate-900 sm:text-sm">
                              {alt.place_name}
                            </h4>
                            <p className="line-clamp-1 text-[11px] text-slate-500">
                              {alt.description}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10.5px] font-bold text-slate-600">
                              <span>📍 {alt.district}</span>
                              <span>·</span>
                              <span className="text-brand-700">
                                {alt.estimated_cost > 0 ? formatVnd(alt.estimated_cost, lang) : (lang === 'vi' ? 'Miễn phí' : 'Free')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all',
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          )}
                        >
                          ✓
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {lang === 'vi' ? 'Đóng' : 'Close'}
              </button>
              <button
                type="button"
                disabled={!selectedReplacement || swapping}
                onClick={handleConfirmSwap}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:from-brand-700 hover:to-brand-600 disabled:opacity-50 active:scale-97"
              >
                {swapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>{lang === 'vi' ? 'Xác nhận đổi sang điểm này' : 'Confirm Swap'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
