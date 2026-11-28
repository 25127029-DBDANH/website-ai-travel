import {
  Bike,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  MapPin
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { GOOGLE_MAPS_LOGO, googleMapsDirectionsUrl } from '../../lib/externalApps.js';
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
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);

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
  const memberCount = Number(trip?.member_count) || (trip?.companion === 'solo' ? 1 : 4);
  const rideOriginStop = useMemo(() => {
    if (!ridePickerStop) return null;
    const idx = dayItems.findIndex(
      (it) =>
        it.day_number === ridePickerStop.day_number &&
        it.order_index === ridePickerStop.order_index
    );
    return idx > 0 ? dayItems[idx - 1] : null;
  }, [dayItems, ridePickerStop]);

  const progressPercent = dayItems.length > 0 ? Math.round((visitedCount / dayItems.length) * 100) : 0;
  const nextPhotoSrc = nextStop?.checkin_photo || (nextStop?.photo_url ? assetUrl(nextStop.photo_url) : null);
  const showNextPhoto = Boolean(nextPhotoSrc && nextPhotoSrc !== failedPhotoUrl);

  const getStopDirectionsUrl = (stop) => {
    if (!stop) return null;
    return googleMapsDirectionsUrl({
      lat: stop.latitude ?? stop.lat,
      lng: stop.longitude ?? stop.lng,
      name: stop.place_name,
      address: stop.address || 'TP. Hồ Chí Minh',
      transportMode: trip?.transport_mode || stop.transit_info?.mode
    });
  };

  const handleConfirmCheckin = (data) => {
    if (!checkinModalStop || checkinModalStop.visited || !onSaveCheckin) return;
    onSaveCheckin(checkinModalStop, data);
    setCheckinModalStop(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* THANH BANNER CHẾ ĐỘ ĐỒNG HÀNH */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
          <div>
            <h3 className="font-display text-sm font-extrabold text-emerald-950 sm:text-base">
              {lang === 'vi' ? 'Chế độ đồng hành trong chuyến đi' : 'On-trip companion'}
            </h3>
            <p className="text-xs text-emerald-800">
              {lang === 'vi'
                ? 'Theo dõi điểm tiếp theo, mở Google Maps, đặt xe và lưu ảnh check-in theo từng ngày.'
                : 'Follow your next stop, open Google Maps, book a ride, and save check-in photos day by day.'}
            </p>
          </div>
        </div>

        {/* Nút Hoàn thành chuyến đi nhanh ở góc trên */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn ngày */}
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={activeDay === day}
                onClick={() => onSelectDay(day)}
                className={cn(
                  'min-h-8 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                  activeDay === day
                    ? 'bg-emerald-700 text-white'
                    : 'border border-emerald-200 bg-white text-slate-700 hover:bg-emerald-100/60'
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
              className="inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 active:scale-[0.97]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'vi' ? 'Hoàn thành chuyến đi' : 'Finish trip'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TIẾN TRÌNH TRONG NGÀY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <span>{lang === 'vi' ? `Tiến độ ngày ${activeDay}:` : `Day ${activeDay} progress:`}</span>
            <span className="tabular-nums text-brand-700">
              {visitedCount} / {dayItems.length} {lang === 'vi' ? 'điểm đã ghé' : 'stops visited'}
            </span>
          </span>
          <span className="font-mono tabular-nums text-emerald-700">{progressPercent}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={lang === 'vi' ? `Tiến độ ngày ${activeDay}` : `Day ${activeDay} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full w-full origin-left rounded-full bg-brand-600 transition-transform duration-300 ease-out-strong"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      {/* THẺ ĐIỂM ĐẾN TIẾP THEO */}
      {nextStop && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="bg-brand-600 px-5 py-3 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {lang === 'vi' ? 'Điểm dừng tiếp theo' : 'Next stop'}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-brand-100">
                {nextStop.time_slot}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-6">
            <div className="relative h-48 w-full overflow-hidden rounded-xl bg-slate-200 sm:h-full">
              {showNextPhoto ? (
                <img
                  src={nextPhotoSrc}
                  alt={nextStop.place_name}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedPhotoUrl(nextPhotoSrc)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
                  <MapPin className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-lg bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold text-white">
                {nextStop.district}
              </span>
              {nextStop.checkin_photo && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Camera className="h-3 w-3" aria-hidden="true" />
                  {lang === 'vi' ? 'Ảnh check-in' : 'Check-in photo'}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="min-w-0 break-words font-display text-xl font-extrabold text-slate-900">
                    {nextStop.place_name}
                  </h4>
                  {nextStop.is_lunch && (
                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {lang === 'vi' ? 'Bữa trưa' : 'Lunch'}
                    </span>
                  )}
                </div>

                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="min-w-0 break-words">{nextStop.address}</span>
                </p>

                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  {nextStop.description}
                </p>

                {nextStop.checkin_note && (
                  <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                    <strong>{lang === 'vi' ? 'Ghi chú:' : 'Note:'}</strong> “{nextStop.checkin_note}”
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                  <span>
                    {lang === 'vi' ? 'Chi phí dự kiến:' : 'Estimated cost:'}{' '}
                    <strong className="text-brand-700">
                      {nextStop.estimated_cost > 0
                        ? formatVnd(nextStop.estimated_cost, lang)
                        : lang === 'vi'
                          ? 'Miễn phí'
                          : 'Free'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    {lang === 'vi' ? 'Thời lượng:' : 'Duration:'}{' '}
                    <strong>
                      {nextStop.suggested_duration || 90} {lang === 'vi' ? 'phút' : 'min'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* 3 NÚT HÀNH ĐỘNG: CHỈ ĐƯỜNG, ĐẶT XE (GRAB / XANH SM / BE), VÀ CHỤP ẢNH */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3">
                <a
                  href={getStopDirectionsUrl(nextStop) || 'https://www.google.com/maps'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#1A73E8] shadow-sm transition-colors hover:border-[#1A73E8]/50 hover:bg-[#1A73E8]/5 active:scale-[0.98]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white p-0.5">
                    <img
                      src={GOOGLE_MAPS_LOGO}
                      alt=""
                      aria-hidden="true"
                      className="h-3.5 w-3.5 object-contain"
                    />
                  </span>
                  <span>{t('ride.googleMapsDirections')}</span>
                </a>

                {/* NÚT ĐẶT XE DI CHUYỂN (chỉ hiện khi điểm chưa check-in) */}
                {!nextStop?.visited ? (
                  <button
                    type="button"
                    onClick={() => setRidePickerStop(nextStop)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 active:scale-[0.98]"
                    title={lang === 'vi' ? 'Chọn ứng dụng đặt xe: Grab, Xanh SM hoặc Be' : 'Choose ride app: Grab, Xanh SM or Be'}
                  >
                    <Bike className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'vi' ? 'Đặt xe (Grab / Xanh SM / Be)' : 'Book ride (Grab / Xanh SM / Be)'}</span>
                  </button>
                ) : null}

                {/* NÚT CHỤP ẢNH CHECK-IN (nếu đã đến và chưa có ảnh thì khóa nút chỉnh sửa) */}
                {nextStop?.visited && !nextStop?.checkin_photo ? (
                  <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
                    <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>{t('itinerary.card.visitedLocked')}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCheckinModalStop(nextStop)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-bold text-brand-800 hover:bg-brand-100 active:scale-[0.98]"
                  >
                    <Camera className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    <span>
                      {nextStop.checkin_photo
                        ? lang === 'vi'
                          ? 'Xem ảnh check-in'
                          : 'View check-in photo'
                        : lang === 'vi'
                          ? 'Chụp ảnh check-in'
                          : 'Photo check-in'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH LỘ TRÌNH CHI TIẾT TRONG NGÀY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="font-display text-sm font-extrabold text-slate-900">
          {lang === 'vi' ? `Lịch trình ngày ${activeDay}` : `Day ${activeDay} schedule`}
        </h4>

        <div className="mt-4 space-y-3">
          {dayItems.map((item) => {
            const isNext = nextStop?.place_id === item.place_id && !item.visited;
            const isDone = Boolean(item.visited);

            return (
              <div
                key={item.place_id || item.order_index}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors',
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isNext
                    ? 'border-brand-400 bg-brand-50/50'
                    : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="button"
                    disabled={isDone}
                    aria-pressed={isDone}
                    aria-label={
                      isDone
                        ? `${t('itinerary.card.visitedLocked')}: ${item.place_name}`
                        : lang === 'vi'
                          ? `Đánh dấu đã đến: ${item.place_name}`
                          : `Mark visited: ${item.place_name}`
                    }
                    onClick={() => {
                      if (!isDone && onToggleVisited) onToggleVisited(item);
                    }}
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition-colors',
                      isDone
                        ? 'cursor-default bg-emerald-700 text-white'
                        : isNext
                        ? 'bg-brand-600 text-white hover:bg-emerald-700 active:scale-95'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 active:scale-95'
                    )}
                    title={
                      isDone
                        ? t('itinerary.card.visitedLocked')
                        : lang === 'vi'
                          ? 'Bấm để đánh dấu đã đến điểm này'
                          : 'Mark stop as visited'
                    }
                  >
                    {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : item.order_index}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold tabular-nums text-slate-600">
                        {item.time_slot}
                      </span>
                      {isDone ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {lang === 'vi' ? 'Đã ghé' : 'Visited'}
                        </span>
                      ) : isNext ? (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {lang === 'vi' ? 'Tiếp theo' : 'Next'}
                        </span>
                      ) : null}
                      {item.checkin_photo && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Camera className="h-2.5 w-2.5" aria-hidden="true" />
                          {lang === 'vi' ? 'Có ảnh' : 'Photo'}
                        </span>
                      )}
                    </div>
                    <p
                      title={item.place_name}
                      className={cn('truncate font-display text-sm font-bold', isDone ? 'text-emerald-950' : 'text-slate-900')}
                    >
                      {item.place_name}
                    </p>
                    <p title={item.address} className="line-clamp-1 text-[11px] text-slate-600">
                      {item.address}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <a
                    href={getStopDirectionsUrl(item) || 'https://www.google.com/maps'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    title={t('ride.googleMapsDirections')}
                    aria-label={`${t('ride.googleMapsDirections')}: ${item.place_name}`}
                  >
                    <img
                      src={GOOGLE_MAPS_LOGO}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 object-contain"
                    />
                  </a>

                  {/* Nút đặt xe mở modal 3 app (ẩn nếu đã check-in) */}
                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() => setRidePickerStop(item)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      title={lang === 'vi' ? 'Đặt xe (Grab / Xanh SM / Be)' : 'Book ride (Grab / Xanh SM / Be)'}
                      aria-label={
                        lang === 'vi'
                          ? `Đặt xe tới ${item.place_name}`
                          : `Book ride to ${item.place_name}`
                      }
                    >
                      <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}

                  {isDone && !item.checkin_photo ? (
                    <span className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-800 sm:px-3">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'vi' ? 'Đã đến' : 'Visited'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCheckinModalStop(item)}
                      className={cn(
                        'inline-flex min-h-8 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3',
                        item.checkin_photo
                          ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {item.checkin_photo
                          ? lang === 'vi'
                            ? 'Xem ảnh'
                            : 'Photo'
                          : 'Check-in'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BANNER HOÀN THÀNH CHUYẾN ĐI */}
      <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-display text-lg font-extrabold sm:text-xl">
            {lang === 'vi' ? 'Kết thúc chuyến đi và xem tổng kết' : 'Finish trip and view summary'}
          </h4>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-300">
            {lang === 'vi'
              ? 'Xem lại các điểm đã ghé, tổng hợp chi tiêu thực tế so với ngân sách và album ảnh check-in.'
              : 'Review visited stops, actual expenses against your budget, and your check-in photo album.'}
          </p>
        </div>

        {onFinishTrip && (
          <button
            type="button"
            onClick={onFinishTrip}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-slate-900 hover:bg-slate-100 active:scale-[0.97] sm:text-sm"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{lang === 'vi' ? 'Hoàn thành chuyến đi' : 'Finish trip'}</span>
          </button>
        )}
      </div>

      {/* MODAL ĐẶT XE (GRAB - XANH SM - BE) */}
      {ridePickerStop && (
        <RidePickerModal
          stop={ridePickerStop}
          originStop={rideOriginStop}
          memberCount={memberCount}
          isOpen={Boolean(ridePickerStop)}
          transportMode={trip?.transport_mode}
          onClose={() => setRidePickerStop(null)}
        />
      )}

      {/* MODAL CHỤP ẢNH CHECK-IN CAMERA / UPLOAD */}
      {checkinModalStop && (
        <CheckinModal
          stop={checkinModalStop}
          readOnly={Boolean(checkinModalStop?.visited)}
          onConfirm={handleConfirmCheckin}
          onClose={() => setCheckinModalStop(null)}
        />
      )}
    </div>
  );
}
