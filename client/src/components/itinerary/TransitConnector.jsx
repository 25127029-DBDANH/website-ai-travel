import { AlertTriangle, Car, CloudRain, Footprints, Navigation } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatDistance, formatVnd } from '../../lib/format.js';

export default function TransitConnector({ transit, memberCount = 1 }) {
  const { lang, t } = useI18n();
  if (!transit) return null;

  const isWalk = transit.mode === 'walk';
  const isCar = transit.mode === 'grab_car';
  const isRain = Boolean(transit.is_rain_mode);
  const Icon = isWalk ? Footprints : (isCar ? (isRain ? CloudRain : Car) : Navigation);

  let modeLabel = 'GrabBike';
  if (isWalk) modeLabel = lang === 'vi' ? 'Đi bộ' : 'Walk';
  else if (isCar) modeLabel = lang === 'vi' ? (isRain ? 'GrabCar (Né mưa)' : 'GrabCar / Taxi') : 'GrabCar';

  const timeSlot = transit.start_time && transit.end_time ? `${transit.start_time} - ${transit.end_time}` : `${transit.duration_min} phút`;
  const baseFare = Number(transit.estimated_fare_vnd || 0);

  return (
    <div className="relative my-2 flex items-center py-1 sm:pl-12">
      <span className="absolute left-4 top-1/2 hidden h-px w-6 bg-slate-300 sm:block" />
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-xs backdrop-blur-sm transition-all',
          transit.is_rush_hour
            ? 'border-amber-300 bg-amber-50/95 text-amber-900 ring-1 ring-amber-200'
            : isRain
            ? 'border-sky-300 bg-sky-50/95 text-sky-900 ring-1 ring-sky-200'
            : 'border-slate-200/90 bg-slate-50/95 text-slate-600'
        )}
      >
        <span className="flex items-center gap-1 font-bold text-slate-800">
          <Icon className={cn('h-3.5 w-3.5', transit.is_rush_hour ? 'text-amber-600' : isRain ? 'text-sky-600' : 'text-brand-600')} />
          <span>{modeLabel}</span>
        </span>
        <span className="text-slate-300">·</span>
        <span className={cn(transit.is_rush_hour ? 'font-bold text-amber-900' : 'text-slate-500')}>{timeSlot}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{formatDistance(transit.distance_km)}</span>
        <span className="text-slate-300">·</span>

        {/* HIỂN THỊ CHI PHÍ DI CHUYỂN LOGIC THEO SỐ THÀNH VIÊN */}
        {baseFare === 0 || isWalk ? (
          <span className="font-extrabold text-emerald-700">{lang === 'vi' ? 'Miễn phí' : 'Free'}</span>
        ) : transit.mode === 'grab_bike' && memberCount > 1 ? (
          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
            <span>{formatVnd(baseFare, lang)}/xe</span>
            <span className="text-slate-300">·</span>
            <span className="font-extrabold text-emerald-700">
              {lang === 'vi' ? `Tổng: ${formatVnd(baseFare * memberCount, lang)} (${memberCount} xe GrabBike)` : `Total: ${formatVnd(baseFare * memberCount, lang)} (${memberCount} bikes)`}
            </span>
          </span>
        ) : isCar ? (
          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
            <span className="font-extrabold text-emerald-700">{formatVnd(baseFare, lang)}/chuyến</span>
            {memberCount > 1 && (
              <span className="text-slate-500 font-semibold">
                (~{formatVnd(Math.round(baseFare / memberCount), lang)}/người)
              </span>
            )}
          </span>
        ) : (
          <span className="font-extrabold text-emerald-700">{formatVnd(baseFare, lang)}</span>
        )}

        {transit.is_rush_hour && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {lang === 'vi' ? '🚗 Kẹt xe: +20m đệm' : 'Rush hour (+20m)'}
          </span>
        )}

        {isRain && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-sky-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
            <CloudRain className="h-3 w-3" />
            {lang === 'vi' ? '🌧️ Đi ô tô né mưa' : 'Rain protected'}
          </span>
        )}
      </div>
    </div>
  );
}
