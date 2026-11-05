import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';

const STAGES = ['chat.thinking1', 'chat.thinking2', 'chat.thinking3', 'chat.thinking4'];

export default function ThinkingIndicator() {
  const { t } = useI18n();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex items-end gap-2.5 animate-fade-up">
      <span className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm">
        <MapPin className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand-500"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
          <span
            key={t(STAGES[stage])}
            className="ml-2 text-xs font-semibold text-slate-500 animate-fade-up"
          >
            {t(STAGES[stage])}
          </span>
        </div>
        <div className="mt-2.5 h-1 w-44 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 transition-[width] duration-700 ease-out-strong"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
