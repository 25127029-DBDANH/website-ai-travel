import { Check, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export default function WizardProgress({ steps, currentStep, maxStepIndex, statuses, onSelectStep, onReset, t }) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStep)
  );
  const currentTitle = t(`form.step.${currentStep}.title`);
  const progressPercent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <nav aria-label={t('form.wizard.progressLabel')} className="rounded-t-3xl border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-800">
          {t('form.wizard.progress', { current: currentIndex + 1, total: steps.length, title: currentTitle })}
        </p>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('form.wizard.reset')}</span>
          </button>
        )}
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:hidden" aria-hidden="true">
        <div
          className="h-full w-full origin-left rounded-full bg-brand-600 transition-transform duration-200 ease-out-strong"
          style={{ transform: `scaleX(${progressPercent / 100})` }}
        />
      </div>

      <ol className="mt-3 hidden grid-cols-4 gap-1.5 sm:grid">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const priorComplete = steps.slice(0, index).every((prior) => statuses[prior.id] === 'complete');
          const isReached = index <= maxStepIndex || priorComplete;
          const isComplete = !isCurrent && index <= maxStepIndex && statuses[step.id] === 'complete';
          const title = t(`form.step.${step.id}.title`);

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!isReached}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => isReached && !isCurrent && onSelectStep(step.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed',
                  isCurrent && 'border-brand-200 bg-white text-brand-700',
                  !isCurrent && isReached && 'border-transparent text-slate-700 hover:bg-white',
                  !isReached && 'border-transparent text-slate-400'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors',
                    isCurrent && 'bg-brand-600 text-white',
                    isComplete && 'bg-emerald-100 text-emerald-700',
                    !isCurrent && isReached && !isComplete && 'border border-slate-300 bg-white text-slate-700',
                    !isReached && 'border border-slate-200 bg-white text-slate-400'
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold leading-snug">{title}</span>
                  {step.optional && (
                    <span className="block text-[11px] font-medium leading-snug text-slate-600">
                      {t('form.step.optional')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
