import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';

export default function Toast({ message, tone = 'error', onClose }) {
  const { t } = useI18n();

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-24 right-4 z-[70] flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-soft animate-fade-up lg:bottom-6 lg:right-6',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="touch-target -m-1 grid shrink-0 place-items-center rounded-lg p-1.5 opacity-60 transition-[transform,opacity,background-color] duration-200 ease-out-strong hover:bg-black/5 hover:opacity-100 active:scale-90"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
