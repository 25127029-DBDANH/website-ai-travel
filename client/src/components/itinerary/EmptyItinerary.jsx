import { Check, Map, MessageCircle, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';

const STEPS = ['itinerary.empty.step1', 'itinerary.empty.step2', 'itinerary.empty.step3'];

export default function EmptyItinerary({ status }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center animate-fade-up">
      <div className="relative mx-auto h-24 w-24">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-100 via-white to-accent-100" />
        <span className="absolute inset-3 grid place-items-center rounded-full bg-white text-brand-600 shadow-card">
          <Map className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <span className="absolute -right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-accent-500 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-extrabold text-slate-900">
        {t('itinerary.empty.title')}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
        {t('itinerary.empty.body')}
      </p>

      {status === 'asking' && (
        <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
          <MessageCircle className="h-3.5 w-3.5" />
          {t('itinerary.earlyNote')}
        </p>
      )}

      <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 text-left">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-[11.5px] font-semibold text-slate-600">
              {index + 1}. {t(step)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
