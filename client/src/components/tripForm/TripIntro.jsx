import { ArrowRight, Wand2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { templateImage, TRIP_TEMPLATES } from '../../lib/tripOptions.js';
import { isImeComposing } from '../../lib/tripWizardLogic.js';
import { FieldError } from './controls.jsx';

const SAMPLE_KEYS = ['form.sentence.sample1', 'form.sentence.sample2', 'form.sentence.sample3'];

export default function TripIntro({
  t,
  headingRef,
  onPickTemplate,
  onManual,
  sentence,
  onSentenceChange,
  quickFillError,
  onQuickFill,
  sentenceRef
}) {
  const stayLabel = (district) => {
    const key = { 'Quận 1': 'd1', 'Quận 7': 'd7' }[district];
    return key ? t(`form.stay.${key}.label`) : district;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl font-extrabold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:text-2xl"
        >
          {t('form.intro.title')}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600">{t('form.intro.hint')}</p>
      </header>

      <ul aria-label={t('form.intro.templatesLabel')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRIP_TEMPLATES.map((template) => {
          const title = t(`form.template.${template.key}.title`);
          return (
            <li key={template.key} className="min-w-0">
              <button
                type="button"
                onClick={() => onPickTemplate(template.key)}
                aria-label={t('form.intro.useTemplate', { name: title })}
                className="group flex h-full w-full items-stretch gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-left transition-[border-color,box-shadow,transform] duration-200 ease-out-strong hover:border-brand-300 active:scale-[0.98] sm:flex-col sm:gap-0 sm:p-0 [@media(hover:hover)]:hover:shadow-lift"
              >
                <span className="relative block w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-full sm:rounded-none">
                  <img
                    src={templateImage(template.key)}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    width="800"
                    height="450"
                    className="aspect-square h-full w-full object-cover transition-transform duration-500 ease-out-strong sm:aspect-[16/10] [@media(hover:hover)]:group-hover:scale-[1.03]"
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1 sm:p-3.5">
                  <span className="block font-display text-sm font-extrabold leading-snug text-slate-900">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                    {t(`form.template.${template.key}.desc`)}
                  </span>
                  <span className="mt-1.5 block text-[11px] font-semibold text-brand-700">
                    {t('form.template.meta', {
                      days: t('common.days', { count: template.days }),
                      area: stayLabel(template.district),
                      count: template.interests.length
                    })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label htmlFor="trip-quickfill" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Wand2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          {t('form.intro.sentenceLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={sentenceRef}
            id="trip-quickfill"
            type="text"
            enterKeyHint="go"
            data-skip-enter="true"
            maxLength={500}
            value={sentence}
            onChange={(event) => onSentenceChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || isImeComposing(event)) return;
              event.preventDefault();
              event.stopPropagation();
              onQuickFill();
            }}
            placeholder={t('form.quickFill.placeholder')}
            aria-invalid={Boolean(quickFillError) || undefined}
            aria-describedby={quickFillError ? 'trip-quickfill-error' : 'trip-quickfill-hint'}
            className={cn(
              'input min-w-0 flex-1 bg-white py-2.5 text-base sm:text-sm',
              quickFillError && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            )}
          />
          <button
            type="button"
            onClick={() => onQuickFill()}
            className="btn-secondary min-h-11 shrink-0 border-brand-200 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            {t('form.intro.sentenceApply')}
          </button>
        </div>
        <FieldError id="trip-quickfill-error" message={quickFillError} />
        {!quickFillError && (
          <p id="trip-quickfill-hint" className="mt-1.5 text-xs text-slate-600">
            {t('form.quickFill.hint')}
          </p>
        )}
        <p className="mt-3 text-xs font-semibold text-slate-700">{t('form.intro.samplesLabel')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SAMPLE_KEYS.map((key) => {
            const sample = t(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSentenceChange(sample);
                  onQuickFill(sample);
                }}
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                “{sample}”
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onManual}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-brand-700 underline-offset-4 transition-colors hover:bg-brand-50 hover:underline"
        >
          {t('form.intro.manual')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
