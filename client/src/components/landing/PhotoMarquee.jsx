import { Camera, MapPin } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO } from '../../demo.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';

const FALLBACK_GRADIENTS = [
  'from-brand-200 via-brand-100 to-accent-100',
  'from-accent-200 via-accent-100 to-rose-100',
  'from-emerald-200 via-emerald-100 to-brand-100',
  'from-rose-200 via-rose-100 to-accent-100',
  'from-brand-200 via-indigo-100 to-emerald-100',
  'from-accent-200 via-amber-100 to-brand-100'
];

function MarqueeCard({ card }) {
  return (
    <figure className="relative h-40 w-56 shrink-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-card transition-transform duration-300 ease-out-strong hover:-translate-y-1 hover:shadow-lift sm:h-44 sm:w-64">
      {card.src ? (
        <img
          src={card.src}
          alt={card.name || ''}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/10 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold text-white">
            {card.name || <MapPin className="inline h-3.5 w-3.5 -translate-y-px text-white/70" />}
          </p>
          {card.district && (
            <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-bold text-white/70">
              <MapPin className="h-2.5 w-2.5" />
              {card.district}
            </p>
          )}
        </div>
        {card.category && (
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">
            {card.category}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export default function PhotoMarquee() {
  const { lang, t } = useI18n();
  const [photos, setPhotos] = useState(null);
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const stripRef = useRef(null);

  useEffect(() => {
    const node = stripRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '160px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Dải ảnh tự chạy chỉ tốn khung hình khi đang thấy và tab đang mở.
  const scrolling = !reduced && inView && pageVisible;

  useEffect(() => {
    let cancelled = false;
    api
      .listPhotos(20)
      .then((data) => {
        if (!cancelled) setPhotos(Array.isArray(data?.photos) ? data.photos : []);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    if (!photos || photos.length === 0) {
      return Array.from({ length: 12 }, (_, index) => ({
        key: `fallback-${index}`,
        gradient: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]
      }));
    }
    return photos.map((photo) => ({
      key: photo.place_id,
      name: lang === 'vi' && photo.name_vi ? photo.name_vi : photo.name,
      district: photo.district,
      category: photo.category,
      src: assetUrl(photo.photo_url)
    }));
  }, [photos, lang]);

  const track = reduced ? cards : [...cards, ...cards];

  if (DEMO) {
    return (
      <section
        aria-label={t('hero.gallery')}
        className="relative overflow-hidden border-y border-slate-200/70 bg-white py-10 sm:py-12"
      >
        <div className="vn-pattern pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-vn-lacquer/20 bg-vn-lacquer-soft/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-vn-lacquer">
                <Camera className="h-3.5 w-3.5" />
                {t('hero.gallery')}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-500">{t('hero.galleryHint')}</p>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              {['hero.card.area1', 'hero.card.area3', 'hero.card.area5'].map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500"
                >
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mask-fade-x group relative mt-6 overflow-hidden">
          <div className="flex w-max animate-marquee gap-4 px-4 group-hover:[animation-play-state:paused]">
            {Array.from({ length: 6 }, (_, index) => (
              <figure
                key={index}
                aria-hidden="true"
                className="h-40 w-56 shrink-0 rounded-2xl border border-slate-200/70 bg-black shadow-card sm:h-44 sm:w-64"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t('hero.gallery')} className="relative overflow-hidden border-y border-slate-200/70 bg-white py-10 sm:py-12">
      <div className="vn-pattern pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-vn-lacquer/20 bg-vn-lacquer-soft/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-vn-lacquer">
              <Camera className="h-3.5 w-3.5" />
              {t('hero.gallery')}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-500">{t('hero.galleryHint')}</p>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            {['hero.card.area1', 'hero.card.area3', 'hero.card.area5'].map((key) => (
              <span
                key={key}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500"
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mask-fade-x group relative mt-6 overflow-hidden" aria-hidden={photos !== null && photos.length === 0}>
        <div ref={stripRef} className={reduced ? 'overflow-x-auto pb-1' : undefined}>
          <div
            className={cn(
              'flex gap-4 px-4',
              reduced ? 'w-max' : 'w-max animate-marquee group-hover:[animation-play-state:paused]',
              !scrolling && !reduced && '[animation-play-state:paused]'
            )}
          >
            {track.map((card, index) => (
              <MarqueeCard key={`${card.key}-${index}`} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
