import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import BrandMark from './BrandMark.jsx';

export default function Logo({ compact = false, light = false, className }) {
  const { t } = useI18n();

  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-2.5', className)}>
      <span className="h-9 w-9 shrink-0 rounded-xl">
        <BrandMark className="h-full w-full rounded-xl" />
      </span>
      {!compact && (
        <span
          className={cn(
            'truncate font-display text-base font-extrabold tracking-tight',
            light ? 'text-white' : 'text-slate-900'
          )}
        >
          {t('brand.name')}
        </span>
      )}
    </span>
  );
}
