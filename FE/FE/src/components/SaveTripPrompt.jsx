import { BookmarkPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { isSkipped, skipForNow, skipForever } from '../lib/skip.js';

const SKIP_KEY = 'trip-save-prompt';

export default function SaveTripPrompt({ hasItinerary }) {
  const { t } = useI18n();
  const { user, openAuth } = useAuth();
  const [visible, setVisible] = useState(() => !isSkipped(SKIP_KEY));

  if (user || !visible || !hasItinerary) return null;

  return (
    <section className="mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 lg:mb-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-brand-700">
          <BookmarkPlus className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-brand-900">{t('savePrompt.title')}</p>
          <p className="text-[11px] font-medium leading-snug text-brand-800/80">
            {t('savePrompt.body')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => openAuth('register')}
          className="rounded-full bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-800 active:scale-[0.97]"
        >
          {t('savePrompt.cta')}
        </button>
        <button
          type="button"
          onClick={() => {
            skipForNow(SKIP_KEY, 7);
            setVisible(false);
          }}
          className="rounded-full border border-brand-300 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-700 transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-100 active:scale-[0.97]"
        >
          {t('savePrompt.later')}
        </button>
        <button
          type="button"
          onClick={() => {
            skipForever(SKIP_KEY);
            setVisible(false);
          }}
          className="rounded-full px-2 py-1.5 text-[10.5px] font-semibold text-brand-700/70 underline-offset-2 transition-[transform,color] duration-200 ease-out-strong hover:text-brand-900 hover:underline active:scale-[0.97]"
        >
          {t('savePrompt.never')}
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label={t('skip.close')}
          className="rounded-full p-1.5 text-brand-700/70 transition-[transform,background-color,color] duration-200 ease-out-strong hover:bg-white hover:text-brand-800 active:scale-90"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
