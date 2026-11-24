import { Check, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export default function WizardProgress({
  steps,
  currentStep,
  maxStepIndex,
  statuses,
  onSelectStep,
  onReset,
  t
}) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStep)
  );
  const currentTitle = t(`form.step.${currentStep}.title`);
  const progressPercent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <nav
      aria-label={t('form.wizard.progressLabel')}
      className="rounded-t-3xl border-b border-slate-200 bg-slate-50/70 px-4 py-3.5 sm:px-6"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-800 sm:hidden">
          {t('form.wizard.mobileProgress', {
            current: currentIndex + 1,
            total: steps.length,
            title: currentTitle
          })}
        </p>
        <p className="hidden text-xs font-bold text-slate-800 sm:block">
          {t('form.wizard.progress', {
            current: currentIndex + 1,
            total: steps.length,
            title: currentTitle
          })}
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

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-200 ease-out-strong"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-3 hidden grid-cols-6 gap-1 sm:grid">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isReached = index <= maxStepIndex;
          const isComplete = isReached && !isCurrent && statuses[step.id] === 'complete';
          const title = t(`form.step.${step.id}.title`);

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!isReached}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => isReached && !isCurrent && onSelectStep(step.id)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors disabled:cursor-not-allowed',
                  isCurrent && 'bg-brand-50 text-brand-700',
                  !isCurrent && isReached && 'text-slate-700 hover:bg-slate-100',
                  !isReached && 'text-slate-400'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold transition-colors',
                    isCurrent && 'bg-brand-600 text-white',
                    isComplete && 'bg-emerald-100 text-emerald-700',
                    !isCurrent && isReached && !isComplete && 'border border-slate-300 bg-white text-slate-700',
                    !isReached && 'border border-slate-200 bg-white text-slate-400'
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className="w-full truncate text-[11px] font-semibold leading-tight">{title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
