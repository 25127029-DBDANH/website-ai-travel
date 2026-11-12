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
  Sparkles,
  Utensils
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDayLabel, formatVnd } from '../../lib/format.js';
import RidePickerModal from '../common/RidePickerModal.jsx';
import CheckinModal from './CheckinModal.jsx';

export default function LiveCompanionView({
  trip,
  items = [],
  activeDay = 1,
  onSelectDay,
  onSaveCheckin,
  onToggleVisited,
  onFinishTrip
}) {
  const { lang, t } = useI18n();
  const [checkinModalStop, setCheckinModalStop] = useState(null);
  const [ridePickerStop, setRidePickerStop] = useState(null);

  const dayCount = Number(trip?.days) || 1;
  const dayItems = useMemo(() => {
    return items
      .filter((it) => it.day_number === activeDay)
      .sort((a, b) => a.order_index - b.order_index);
  }, [items, activeDay]);

  // Tìm điểm tiếp theo chưa được check-in
  const nextStop = useMemo(() => {
    return dayItems.find((it) => !it.visited) || dayItems[dayItems.length - 1];
  }, [dayItems]);

  const visitedCount = dayItems.filter((it) => it.visited).length;
  const progressPercent = dayItems.length > 0 ? Math.round((visitedCount / dayItems.length) * 100) : 0;

  const handleOpenGoogleMaps = (stop) => {
    if (!stop) return;
    const query = encodeURIComponent(`${stop.place_name}, ${stop.address || 'TP. Hồ Chí Minh'}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleConfirmCheckin = (data) => {
    if (!checkinModalStop || !onSaveCheckin) return;
    onSaveCheckin(checkinModalStop, data);
    setCheckinModalStop(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* THANH BANNER THỜI GIAN THỰC */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
          </span>
          <div>
            <h3 className="font-display text-sm font-extrabold text-emerald-950 sm:text-base">
              {lang === 'vi' ? 'Chế độ Đi thực tế (On-Trip Companion)' : 'Live On-Trip Companion'}
            </h3>
            <p className="text-xs text-emerald-700">
              {lang === 'vi'
                ? 'Đang đồng hành theo vị trí và dòng thời gian thực tế của bạn tại TP.HCM'
                : 'Tracking your real-time journey & navigation in Saigon'}
            </p>
          </div>
        </div>

        {/* Nút Hoàn thành chuyến đi nhanh ở góc trên */}
        <div className="flex items-center gap-2">
          {/* Bộ chọn ngày */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  activeDay === day
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-emerald-200 hover:bg-emerald-100/50'
                )}
              >
                {formatDayLabel(lang, day)}
              </button>
            ))}
          </div>

          {onFinishTrip && (
            <button
              type="button"
              onClick={onFinishTrip}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{lang === 'vi' ? 'Hoàn thành chuyến đi' : 'Finish Trip'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TIẾN TRÌNH TRONG NGÀY */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-brand-600" />
            <span>{lang === 'vi' ? `Tiến độ ngày ${activeDay}:` : `Day ${activeDay} Progress:`}</span>
            <span className="text-brand-700">{visitedCount} / {dayItems.length} địa điểm đã ghé thăm</span>
          </span>
          <span className="font-mono text-emerald-600">{progressPercent}%</span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* THẺ HERO: ĐIỂM ĐẾN TIẾP THEO CỦA BẠN */}
      {nextStop && (
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-soft ring-1 ring-brand-100">
          <div className="border-b border-brand-100 bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                <Sparkles className="h-3 w-3" />
                {lang === 'vi' ? 'Điểm đến tiếp theo của bạn' : 'Your Next Stop'}
              </span>
              <span className="font-mono text-xs font-bold text-brand-100">
                {nextStop.time_slot}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-6">
            <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-200 sm:h-full">
              <img
                src={nextStop.checkin_photo || assetUrl(nextStop.photo_url)}
                alt={nextStop.place_name}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                {nextStop.district}
              </span>
              {nextStop.checkin_photo && (
                <span className="absolute top-2 left-2 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                  📸 Ảnh check-in thực tế
                </span>
              )}
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-xl font-extrabold text-slate-900">
                    {nextStop.place_name}
                  </h4>
                  {nextStop.is_lunch && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                      Bữa trưa
                    </span>
                  )}
                </div>

                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <span>{nextStop.address}</span>
                </p>

                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  {nextStop.description}
                </p>

                {nextStop.checkin_note && (
                  <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-900">
                    <strong>Ghi chú của bạn:</strong> “{nextStop.checkin_note}”
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                  <span>{lang === 'vi' ? 'Dự kiến chi phí:' : 'Estimated cost:'} <strong className="text-brand-700">{nextStop.estimated_cost > 0 ? formatVnd(nextStop.estimated_cost, lang) : 'Miễn phí'}</strong></span>
                  <span>·</span>
                  <span>{lang === 'vi' ? 'Thời lượng tham quan:' : 'Duration:'} <strong>{nextStop.suggested_duration || 90} phút</strong></span>
                </div>
              </div>

              {/* 3 NÚT HÀNH ĐỘNG: CHỈ ĐƯỜNG, ĐẶT XE (GRAB / XANH SM / BE), VÀ CHỤP ẢNH */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleMaps(nextStop)}
                  className="btn-primary !py-2.5 text-xs font-extrabold shadow-sm"
                >
                  <Navigation className="h-4 w-4" />
                  <span>{lang === 'vi' ? 'Chỉ đường Google Maps' : 'Open in Maps'}</span>
                </button>

                {/* NÚT ĐẶT XE DI CHUYỂN (GRAB / XANH SM / BE) */}
                <button
                  type="button"
                  onClick={() => setRidePickerStop(nextStop)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-98"
                  title="Chọn ứng dụng đặt xe: Grab, Xanh SM hoặc Be"
                >
                  <Bike className="h-4 w-4" />
                  <span>{lang === 'vi' ? 'Đặt xe di chuyển (Grab / Xanh SM / Be)' : 'Book Ride (Grab / Xanh SM / Be)'}</span>
                </button>

                {/* NÚT CHỤP ẢNH CHECK-IN (BẰNG MÁY ẢNH HOẶC TẢI ẢNH LÊN) */}
                <button
                  type="button"
                  onClick={() => setCheckinModalStop(nextStop)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3.5 py-2.5 text-xs font-extrabold text-brand-800 shadow-xs hover:bg-brand-100 active:scale-98"
                >
                  <Camera className="h-4 w-4 text-brand-600" />
                  <span>{nextStop.checkin_photo ? (lang === 'vi' ? 'Xem / Chụp lại ảnh' : 'View Check-in Photo') : (lang === 'vi' ? 'Chụp ảnh Check-in' : 'Photo Check-in')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH LỘ TRÌNH CHI TIẾT TRONG NGÀY */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <h4 className="font-display text-sm font-extrabold text-slate-900">
          {lang === 'vi' ? `Lộ trình ngày ${activeDay} theo dòng thời gian:` : `Day ${activeDay} Full Schedule:`}
        </h4>

        <div className="mt-4 space-y-3">
          {dayItems.map((item, index) => {
            const isNext = nextStop?.place_id === item.place_id && !item.visited;
            const isDone = Boolean(item.visited);

            return (
              <div
                key={item.place_id || item.order_index}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all',
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/40 opacity-80'
                    : isNext
                    ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-200'
                    : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    onClick={() => onToggleVisited && onToggleVisited(item)}
                    className={cn(
                      'grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95',
                      isDone
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isNext
                        ? 'bg-brand-600 text-white animate-pulse-soft hover:bg-emerald-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                    )}
                    title={isDone ? 'Bấm để hủy đánh dấu đã đến' : 'Bấm để đánh dấu đã đến điểm này'}
                  >
                    {isDone ? '✓' : item.order_index}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {item.time_slot}
                      </span>
                      {isDone ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-800">
                          ✓ Đã ghé thăm
                        </span>
                      ) : isNext ? (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">
                          {lang === 'vi' ? 'Đang tới' : 'Next'}
                        </span>
                      ) : null}
                      {item.checkin_photo && (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          📸 Có ảnh check-in
                        </span>
                      )}
                    </div>
                    <p className={cn('font-display text-sm font-extrabold', isDone ? 'text-emerald-950 font-bold' : 'text-slate-900')}>
                      {item.place_name}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">
                      {item.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleMaps(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600"
                    title="Chỉ đường Google Maps"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </button>

                  {/* Nút đặt xe mở modal 3 app */}
                  <button
                    type="button"
                    onClick={() => setRidePickerStop(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    title="Đặt xe (Grab / Xanh SM / Be)"
                  >
                    <Bike className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckinModalStop(item)}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      item.checkin_photo
                        ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {item.checkin_photo ? '📸 Xem ảnh' : isDone ? '✓ Đã đến' : '📸 Check-in'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BANNER CHÚC MỪNG VÀ NÚT HOÀN THÀNH CHUYẾN ĐI (NHẢY SANG GIAO DIỆN TỔNG KẾT) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-lg">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
            🏁 Kết thúc trải nghiệm thực tế
          </span>
          <h4 className="mt-2 font-display text-lg sm:text-xl font-extrabold">
            Bạn đã hoàn tất chuyến đi khám phá Sài Gòn?
          </h4>
          <p className="mt-1 text-xs text-emerald-100 leading-relaxed max-w-xl">
            Bấm nút bên cạnh để chuyển sang giao diện <strong>Tổng kết chuyến đi</strong>: xem toàn bộ những nơi bạn đã đi qua, tổng kết chi tiêu thực tế so với ngân sách và bộ sưu tập ảnh check-in kỷ niệm.
          </p>
        </div>

        {onFinishTrip && (
          <button
            type="button"
            onClick={onFinishTrip}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-xs sm:text-sm font-extrabold text-emerald-950 shadow-md hover:bg-emerald-50 transition-all active:scale-97"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Hoàn thành chuyến đi</span>
          </button>
        )}
      </div>

      {/* MODAL ĐẶT XE (GRAB - XANH SM - BE) */}
      {ridePickerStop && (
        <RidePickerModal
          stop={ridePickerStop}
          isOpen={Boolean(ridePickerStop)}
          onClose={() => setRidePickerStop(null)}
        />
      )}

      {/* MODAL CHỤP ẢNH CHECK-IN CAMERA / UPLOAD */}
      {checkinModalStop && (
        <CheckinModal
          stop={checkinModalStop}
          onConfirm={handleConfirmCheckin}
          onClose={() => setCheckinModalStop(null)}
        />
      )}
    </div>
  );
}
