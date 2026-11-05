import { ArrowRight, Calendar, Check, Compass, MapPin, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import { formatVnd } from '../lib/format.js';
import { assetUrl } from '../lib/api.js';
import { useCuratedTrip } from '../lib/curatedTrips.js';

export default function CuratedTripCard({ trip, onSelect }) {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUseTrip = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const tripId = await useCuratedTrip(trip.id);
      if (tripId) {
        navigate(`/trip/${tripId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={assetUrl(trip.cover_photo)}
          alt={trip.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-strong group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
        
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold backdrop-blur-md shadow-sm',
            trip.tagColor || 'bg-white/90 text-slate-800 border-white'
          )}
        >
          {trip.tag}
        </span>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
          <span className="flex items-center gap-1 bg-black/40 backdrop-blur px-2 py-0.5 rounded-lg">
            <Calendar className="h-3.5 w-3.5 text-brand-300" />
            {trip.days} ngày
          </span>
          <span className="flex items-center gap-1 bg-black/40 backdrop-blur px-2 py-0.5 rounded-lg text-accent-300">
            <Wallet className="h-3.5 w-3.5" />
            ≈ {formatVnd(trip.budget, lang)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-extrabold leading-snug text-slate-900 group-hover:text-brand-600 transition-colors">
          {trip.title}
        </h3>
        
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {trip.description}
        </p>

        <div className="mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm nổi bật:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {trip.highlights.slice(0, 3).map((item) => (
              <span
                key={item}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleUseTrip}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            {loading ? (
              'Đang nạp lịch trình...'
            ) : (
              <>
                Sử dụng lịch trình này
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

