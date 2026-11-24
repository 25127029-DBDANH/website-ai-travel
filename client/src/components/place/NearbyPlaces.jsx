import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { formatDistance } from '../../lib/format.js';
import { getDisplayPlaceName, resolveCategoryKey } from '../../lib/placeDetail.js';
import CategoryTile from '../CategoryTile.jsx';

function NearbyPlaceCard({ place, onSelect }) {
  const { lang, t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);

  const photo = !imgFailed && place.photoUrl ? assetUrl(place.photoUrl) : null;
  const categoryKey = resolveCategoryKey(place.category);
  const displayName = getDisplayPlaceName(place, lang);

  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.99]"
    >
      {photo ? (
        <img
          src={photo}
          alt={displayName}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100">
          <CategoryTile category={categoryKey} size="sm" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xs font-bold text-slate-900 sm:text-sm">
          {displayName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {t(`category.${categoryKey}`)}
          {place.district ? ` · ${place.district}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-slate-500">
        {place.distanceKm !== null && place.distanceKm !== undefined ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums">
            {formatDistance(place.distanceKm)}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
    </button>
  );
}

export default function NearbyPlaces({ places = [], loading = false, onSelect }) {
  const { t } = useI18n();

  if (!loading && places.length === 0) return null;

  return (
    <section aria-label={t('place.section.nearby')} className="space-y-2.5 border-t border-slate-200 pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-slate-900">
          {t('place.section.nearby')}
        </h3>
        <span className="text-[11px] font-medium text-slate-500">
          {t('place.section.nearbyHint')}
        </span>
      </div>

      {loading && places.length === 0 ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5"
            >
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {places.map((item) => (
            <NearbyPlaceCard
              key={item.id || `${item.name}-${item.lat}-${item.lng}`}
              place={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
