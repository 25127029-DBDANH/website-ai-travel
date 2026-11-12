import { CalendarDays, Check, Search, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';

const STEPS = [
  { key: 'chat.thinking1', Icon: Search },
  { key: 'chat.thinking2', Icon: CalendarDays },
  { key: 'chat.thinking3', Icon: Wallet },
  { key: 'chat.thinking4', Icon: Sparkles }
];

export default function PlanLoading() {
  const { t } = useI18n();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STEPS.length - 1));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50/70 to-white px-4 py-5"
    >
      <p className="text-center font-display text-sm font-extrabold text-slate-900">
        {t('itinerary.generating.title')}
      </p>

      <div className="relative mx-auto mt-4 max-w-sm">
        <span
          aria-hidden="true"
          className="absolute bottom-5 left-[23px] top-5 z-10 w-px bg-slate-200"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-5 left-[23px] top-5 z-10 w-px origin-top bg-gradient-to-b from-brand-500 via-brand-400 to-accent-500 transition-transform duration-700 ease-out-strong"
          style={{ transform: `scaleY(${stage / (STEPS.length - 1)})` }}
        />
        <ol className="relative grid gap-2">
          {STEPS.map(({ key, Icon }, index) => {
            const done = index < stage;
            const active = index === stage;
            return (
              <li
                key={key}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-[background-color,color] duration-200 ease-out-strong',
                  done && 'text-slate-500',
                  active && 'bg-white text-brand-800 shadow-sm',
                  !done && !active && 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'relative z-20 grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                    done && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                    active && 'animate-pulse-soft border-brand-300 bg-brand-50 text-brand-700',
                    !done && !active && 'border-slate-200 bg-white text-slate-300'
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                {t(key)}
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-4 text-center text-[10.5px] font-medium text-slate-500">
        {t('itinerary.generating.hint')}
      </p>
    </div>
  );
}
