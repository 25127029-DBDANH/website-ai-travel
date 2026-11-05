import { ChevronDown, ChevronUp, Clock, CloudRain, Loader2, MapPin, Navigation, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { getCategoryMeta } from '../../lib/categories.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { assetUrl } from '../../lib/api.js';
import { osmPlaceUrl } from '../../lib/maps.js';
import CategoryTile from '../CategoryTile.jsx';

export default function TimelineItem({
  item,
  onSwap,
  onLocate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  swapping = false,
  disabled = false
}) {
  const { lang, t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const meta = getCategoryMeta(item.category);
  const photo = !imageFailed && item.photo_url ? assetUrl(item.photo_url) : null;
  const mapsUrl = osmPlaceUrl(item.latitude, item.longitude);
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  const mappable =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const openingHours = Array.isArray(item.opening_hours) ? item.opening_hours[0] : null;
  const editorialScore = Number(item.editorial_score) > 0 ? Number(item.editorial_score) : null;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5 transition-[transform,border-color,box-shadow] duration-300 ease-out-strong hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className={cn('h-1 w-full bg-gradient-to-r', meta.gradient)} />

      {photo && (
        <div className="relative h-40 w-full overflow-hidden bg-slate-100 sm:h-44">
          <img
            src={photo}
            alt={item.place_name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 ease-out-strong group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700 backdrop-blur">
              {t(`category.${item.category}`)}
            </span>
            {item.rain_replacement && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-600/90 text-white px-2 py-0.5 text-[9.5px] font-extrabold backdrop-blur">
                <CloudRain className="h-3 w-3" />
                Tránh mưa
              </span>
            )}
            {item.budget_optimized && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600/90 text-white px-2 py-0.5 text-[9.5px] font-extrabold backdrop-blur">
                <Zap className="h-3 w-3" />
                Giá tốt
              </span>
            )}
          </div>
          {editorialScore !== null && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800 backdrop-blur">
              {t('itinerary.card.editorScore')} {editorialScore.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {photo && item.photo_credit && (
        <p className="bg-slate-50 px-4 py-1.5 text-[9.5px] font-medium text-slate-500">
          {t('itinerary.card.photoCredit')}{' '}
          {item.photo_source_url ? (
            <a
              href={item.photo_source_url}
              target="_blank"
              rel="noreferrer"
              className="rounded underline decoration-slate-300 underline-offset-2 transition-colors duration-200 ease-out-strong hover:text-slate-600"
            >
              {item.photo_credit}
            </a>
          ) : (
            item.photo_credit
          )}
          {item.photo_license ? ` · ${item.photo_license}` : ''}
        </p>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {!photo && <CategoryTile category={item.category} />}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  {item.time_slot}
                </span>
                {!photo && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t(`category.${item.category}`)}
                  </span>
                )}
                {!photo && editorialScore !== null && (
                  <span className="text-[10.5px] font-bold text-slate-500">
                    {t('itinerary.card.editorScore')} {editorialScore.toFixed(1)}
                  </span>
                )}
                {item.is_indoor && (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                    Máy lạnh
                  </span>
                )}
              </div>

              {/* Nút di chuyển vị trí ▲ ▼ */}
              {(onMoveUp || onMoveDown) && (
                <div className="flex items-center gap-0.5 text-slate-400">
                  {onMoveUp && (
                    <button
                      type="button"
                      disabled={isFirst || disabled}
                      onClick={() => onMoveUp(item)}
                      title="Di chuyển lên trước"
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onMoveDown && (
                    <button
                      type="button"
                      disabled={isLast || disabled}
                      onClick={() => onMoveDown(item)}
                      title="Di chuyển xuống sau"
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <h3 className="mt-1.5 font-display text-base font-extrabold leading-snug text-slate-900">
              {item.place_name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">
              {item.description}
            </p>

            <div className="mt-2 flex flex-col gap-1 text-[11px] font-medium text-slate-500">
              {item.address && (
                <span className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-1">{item.address}</span>
                </span>
              )}
              {openingHours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{openingHours}</span>
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
              <span className="text-sm font-extrabold text-slate-900">
                {formatVnd(item.estimated_cost, lang)}
                <span className="ml-1 text-[10px] font-semibold text-slate-500">
                  {t('itinerary.card.perPerson')}
                </span>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onLocate && mappable && (
                  <button
                    type="button"
                    onClick={() => onLocate(item)}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700 transition-[transform,border-color,background-color] duration-200 ease-out-strong hover:border-brand-300 hover:bg-brand-100 active:scale-[0.97]"
                  >
                    <MapPin className="h-3 w-3" />
                    {t('itinerary.card.showOnMap')}
                  </button>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 transition-[transform,border-color,color] duration-200 ease-out-strong hover:border-brand-300 hover:text-brand-700 active:scale-[0.97]"
                  >
                    <Navigation className="h-3 w-3" />
                    {t('itinerary.card.open')}
                  </a>
                )}
                {onSwap ? (
                  <button
                    type="button"
                    onClick={() => onSwap(item)}
                    disabled={disabled || swapping}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700 transition-[transform,border-color,background-color] duration-200 ease-out-strong hover:border-brand-300 hover:bg-brand-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {swapping ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {swapping ? t('itinerary.card.swapping') : t('itinerary.card.swap')}
                  </button>
                ) : null}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={disabled}
                    title="Xóa điểm này"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

