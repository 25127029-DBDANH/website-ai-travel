import { ArrowRight, Calendar, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import { formatVnd } from '../lib/format.js';
import { assetUrl } from '../lib/api.js';
import { useCuratedTrip } from '../lib/curatedTrips.js';

export default function CuratedTripCard({ trip }) {
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[transform,border-color,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={assetUrl(trip.cover_photo)}
          alt={trip.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out-strong group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

        <span
          className={cn(
            'absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-bold',
            trip.tagColor || 'border-slate-200 bg-white text-slate-800'
          )}
        >
          {trip.tag}
        </span>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold text-white">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-white/90" />
            {t('common.days', { count: trip.days })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-white/90" />
            ~ {formatVnd(trip.budget, lang)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-brand-700">
          {trip.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {trip.description}
        </p>

        <div className="mt-3">
          <span className="text-xs font-semibold text-slate-500">{t('curated.highlights')}</span>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700">
            {trip.highlights.slice(0, 3).join(' · ')}
          </p>
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleUseTrip}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              t('curated.loading')
            ) : (
              <>
                {t('curated.useTrip')}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
