import { Car, Footprints } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { formatDistance, formatVnd } from '../../lib/format.js';

export default function TransitConnector({ transit }) {
  const { lang, t } = useI18n();
  if (!transit) return null;

  const isWalk = transit.mode === 'walk';
  const Icon = isWalk ? Footprints : Car;
  const label = t(isWalk ? 'itinerary.transit.walk' : 'itinerary.transit.grab', {
    min: transit.duration_min,
    distance: formatDistance(transit.distance_km),
    fare: formatVnd(transit.estimated_fare_vnd, lang)
  });

  return (
    <div className="relative flex items-center py-1.5 sm:pl-12">
      <span className="absolute left-4 top-1/2 hidden h-px w-6 bg-slate-200 sm:block" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 shadow-sm">
        <Icon className="h-3 w-3 text-slate-400" />
        {label}
      </span>
    </div>
  );
}
