import { AlertTriangle, Car, Footprints, Navigation } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { formatDistance, formatVnd } from '../../lib/format.js';

export default function TransitConnector({ transit }) {
  const { lang, t } = useI18n();
  if (!transit) return null;

  const isWalk = transit.mode === 'walk';
  const isCar = transit.mode === 'grab_car';
  const Icon = isWalk ? Footprints : (isCar ? Car : Navigation);

  let modeLabel = 'GrabBike';
  if (isWalk) modeLabel = lang === 'vi' ? 'Đi bộ' : 'Walk';
  else if (isCar) modeLabel = lang === 'vi' ? 'GrabCar (Mái che)' : 'GrabCar';

  const timeSlot = transit.start_time && transit.end_time ? `${transit.start_time} - ${transit.end_time}` : `${transit.duration_min} phút`;
  const fareLabel = transit.estimated_fare_vnd > 0 ? formatVnd(transit.estimated_fare_vnd, lang) : (lang === 'vi' ? 'Miễn phí' : 'Free');

  return (
    <div className="relative my-2 flex items-center py-1 sm:pl-12">
      <span className="absolute left-4 top-1/2 hidden h-px w-6 bg-slate-300 sm:block" />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-xs backdrop-blur-sm">
        <span className="flex items-center gap-1 font-bold text-slate-800">
          <Icon className="h-3.5 w-3.5 text-brand-600" />
          <span>{modeLabel}</span>
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{timeSlot}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{formatDistance(transit.distance_km)}</span>
        <span className="text-slate-300">·</span>
        <span className="font-extrabold text-emerald-700">{fareLabel}</span>

        {transit.is_rush_hour && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            {lang === 'vi' ? 'Giờ cao điểm (+20p đệm kẹt xe)' : 'Rush hour (+20m)'}
          </span>
        )}
      </div>
    </div>
  );
}
