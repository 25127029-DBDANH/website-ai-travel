import { CloudRain, Coffee, SlidersHorizontal, Zap } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import OverflowMenu from './OverflowMenu.jsx';

export default function ItineraryToolbar({
  onRainMode,
  onBudgetOptimize,
  onAddCafe,
  isRainActive = false,
  className
}) {
  const { lang, t } = useI18n();

  const toolItems = [
    onRainMode
      ? {
          id: 'rain',
          label: t('itinerary.toolbar.rainMode'),
          icon: CloudRain,
          active: isRainActive,
          badge: isRainActive ? t('itinerary.toolbar.active') : undefined,
          onSelect: onRainMode
        }
      : null,
    onBudgetOptimize
      ? {
          id: 'budget',
          label: t('itinerary.toolbar.optimizeBudget'),
          icon: Zap,
          onSelect: onBudgetOptimize
        }
      : null,
    onAddCafe
      ? {
          id: 'cafe',
          label: lang === 'vi' ? 'Thêm quán cà phê chiều' : 'Add afternoon café',
          icon: Coffee,
          onSelect: onAddCafe
        }
      : null
  ].filter(Boolean);

  if (toolItems.length === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2',
        className
      )}
    >
      <span className="text-xs font-semibold text-slate-600">
        {t('itinerary.toolbar.moreTools')}
      </span>
      <OverflowMenu
        items={toolItems}
        label={t('itinerary.toolbar.moreTools')}
        triggerLabel={lang === 'vi' ? 'Tùy chỉnh' : 'Tools'}
        triggerIcon={SlidersHorizontal}
        indicator={isRainActive}
      />
    </div>
  );
}
