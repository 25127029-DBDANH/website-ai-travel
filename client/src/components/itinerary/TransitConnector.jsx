import { AlertTriangle, Car, CloudRain, Footprints, Navigation } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatDistance, formatVnd } from '../../lib/format.js';
import { carsNeededForGroup, MIN_FARE_KM } from '../../lib/transitPricing.js';

export default function TransitConnector({ transit, memberCount = 1 }) {
  const { lang, t } = useI18n();
  if (!transit) return null;

  const isWalk = transit.mode === 'walk';
  const isCar = transit.mode === 'grab_car';
  const isRain = Boolean(transit.is_rain_mode);
  const Icon = isWalk ? Footprints : isCar ? (isRain ? CloudRain : Car) : Navigation;

  let modeLabel = 'GrabBike';
  if (isWalk) modeLabel = lang === 'vi' ? 'Đi bộ' : 'Walk';
  else if (isCar) modeLabel = 'GrabCar';

  const timeSlot =
    transit.start_time && transit.end_time
      ? `${transit.start_time}–${transit.end_time}`
      : `${transit.duration_min} ${lang === 'vi' ? 'phút' : 'min'}`;
  const baseFare = Number(transit.estimated_fare_vnd || 0);
  const distanceKm = Number(transit.distance_km || 0);
  const storedCars = Number(transit.cars_needed || 0);
  const carsNeeded = isCar ? (storedCars > 0 ? storedCars : carsNeededForGroup(memberCount)) : 1;
  const displayCarFare = isCar && storedCars === 0 && carsNeeded > 1 ? baseFare * carsNeeded : baseFare;
  const isMinFare = !isWalk && baseFare > 0 && (Boolean(transit.is_min_fare) || distanceKm <= MIN_FARE_KM);

  return (
    <div className="relative my-2 flex items-center py-0.5 sm:pl-10">
      <span className="absolute left-4 top-1/2 hidden h-px w-4 bg-slate-200 sm:block" aria-hidden="true" />
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-1.5 text-xs',
          transit.is_rush_hour
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : isRain
            ? 'border-sky-200 bg-sky-50 text-sky-900'
            : 'border-slate-200/80 bg-slate-50 text-slate-600'
        )}
      >
        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
          <Icon
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              transit.is_rush_hour
                ? 'text-amber-700'
                : isRain
                ? 'text-sky-700'
                : 'text-slate-500'
            )}
            aria-hidden="true"
          />
          <span>{modeLabel}</span>
        </span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="tabular-nums">{timeSlot}</span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="tabular-nums">{formatDistance(distanceKm)}</span>
        <span className="text-slate-300" aria-hidden="true">·</span>

        {baseFare === 0 || isWalk ? (
          <span className="font-semibold text-emerald-700">
            {lang === 'vi' ? 'Miễn phí' : 'Free'}
          </span>
        ) : transit.mode === 'grab_bike' && memberCount > 1 ? (
          <span className="font-semibold text-slate-800 tabular-nums">
            {formatVnd(baseFare * memberCount, lang)} ({memberCount} {lang === 'vi' ? 'xe' : 'bikes'})
          </span>
        ) : isCar ? (
          <span className="font-semibold text-slate-800 tabular-nums">
            {formatVnd(displayCarFare, lang)}/{lang === 'vi' ? 'chuyến' : 'ride'}
            {carsNeeded > 1 ? ` (${t('ride.carsCount', { cars: carsNeeded })})` : ''}
          </span>
        ) : (
          <span className="font-semibold text-slate-800 tabular-nums">
            {formatVnd(baseFare, lang)}
          </span>
        )}

        {isMinFare ? (
          <span
            title={isRain ? t('ride.minFareRainNote') : t('ride.minFareNote')}
            className="inline-flex items-center rounded-md bg-slate-200/75 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
          >
            {t('ride.minFareShort')}
          </span>
        ) : null}

        {transit.is_rush_hour ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {lang === 'vi' ? '+20 phút kẹt xe' : '+20m rush hour'}
          </span>
        ) : null}

        {isRain ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900">
            <CloudRain className="h-3 w-3" aria-hidden="true" />
            {lang === 'vi' ? 'Tránh mưa' : 'Rain mode'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
