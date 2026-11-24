import { Check, Map, MessageCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';

const STEPS = ['itinerary.empty.step1', 'itinerary.empty.step2', 'itinerary.empty.step3'];

export default function EmptyItinerary({ status }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">
        <Map className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
      </div>

      <h3 className="mt-4 font-display text-lg font-extrabold text-slate-900">
        {t('itinerary.empty.title')}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-600">
        {t('itinerary.empty.body')}
      </p>

      {status === 'asking' && (
        <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t('itinerary.earlyNote')}
        </p>
      )}

      <ol className="mx-auto mt-5 flex max-w-sm flex-col gap-2 text-left">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-xs font-medium text-slate-700">
              {index + 1}. {t(step)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
