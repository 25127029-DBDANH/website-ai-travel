import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import BrandMark from './BrandMark.jsx';

export default function Logo({ compact = false, light = false, className }) {
  const { t } = useI18n();

  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-2.5', className)}>
      <span className="relative h-10 w-10 shrink-0 rounded-2xl shadow-glow">
        <BrandMark className="h-full w-full rounded-2xl" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              'block truncate font-display text-base font-extrabold tracking-tight',
              light ? 'text-white' : 'text-slate-900'
            )}
          >
            {t('brand.name')}
          </span>
          <span
            className={cn(
              'hidden text-[11px] font-bold uppercase tracking-[0.18em] sm:block',
              light ? 'text-white/70' : 'text-slate-500'
            )}
          >
            {t('brand.tagline')}
          </span>
        </span>
      )}
    </span>
  );
}
