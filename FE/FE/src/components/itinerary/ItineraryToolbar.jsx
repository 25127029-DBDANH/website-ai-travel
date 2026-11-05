import { CloudRain, Coffee, DollarSign, Sparkles, Zap } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';

export default function ItineraryToolbar({
  onRainMode,
  onBudgetOptimize,
  onAddCafe,
  isRainActive = false,
  className
}) {
  const { lang, t } = useI18n();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-2.5 backdrop-blur-sm shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        <span>Thao tác nhanh 1-chạm:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onRainMode}
          className={cn(
            'inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all active:scale-[0.97]',
            isRainActive
              ? 'border border-sky-400 bg-sky-100 text-sky-800 shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
          )}
          title="Tự động thay các điểm ngoài trời bằng điểm trong nhà có máy lạnh"
        >
          <CloudRain className="h-3.5 w-3.5 text-sky-600" />
          <span>{isRainActive ? 'Đang bật Tránh Mưa' : 'Tránh Mưa/Nắng'}</span>
        </button>

        <button
          type="button"
          onClick={onBudgetOptimize}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.97] transition-all"
          title="Tự động chọn quán ăn tương đương mức giá tiết kiệm hơn"
        >
          <Zap className="h-3.5 w-3.5 text-emerald-600" />
          <span>Tiết kiệm chi phí</span>
        </button>

        <button
          type="button"
          onClick={onAddCafe}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-amber-300 hover:bg-amber-50 active:scale-[0.97] transition-all"
          title="Thêm một trạm nghỉ chân cà phê Sài Gòn vào chiều"
        >
          <Coffee className="h-3.5 w-3.5 text-amber-600" />
          <span>+ Cà phê chiều</span>
        </button>
      </div>
    </div>
  );
}
