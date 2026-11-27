import { Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { cn } from '../../lib/cn.js';

const PHASE_KEYS = ['form.wait.phase1', 'form.wait.phase2', 'form.wait.phase3'];

// Không có tiến độ thật từ server → ước lượng theo thời gian, tiến dần và không bao giờ báo 100%
// trước khi xong. concept ≈ giai đoạn 1; generate ≈ giai đoạn 2 → 3; save = kết thúc giai đoạn 3.
export function waitingState(stage, elapsedSeconds) {
  const s = Math.max(0, Number(elapsedSeconds) || 0);
  if (stage === 'concept') {
    return { phase: 0, percent: Math.round(4 + 28 * (1 - Math.exp(-s / 12))), etaKey: 'form.wait.etaConcept' };
  }
  if (stage === 'generate') {
    return {
      phase: s < 18 ? 1 : 2,
      percent: Math.round(34 + 58 * (1 - Math.exp(-s / 20))),
      etaKey: 'form.wait.etaGenerate'
    };
  }
  return { phase: 2, percent: 96, etaKey: 'form.wait.etaSave' };
}

function useElapsedSeconds(resetKey) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => clearInterval(timer);
  }, [resetKey]);
  return elapsed;
}

function PhotoStrip({ images, reducedMotion, t }) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    if (reducedMotion || count < 2) return undefined;
    const timer = setInterval(() => setIndex((cur) => (cur + 1) % count), 2800);
    return () => clearInterval(timer);
  }, [reducedMotion, count]);

  if (count === 0) return null;

  if (reducedMotion) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-label={t('form.wait.photosLabel')} role="group">
        {images.slice(0, 3).map((image) => (
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            width="240"
            height="180"
            className="aspect-[4/3] w-full rounded-xl bg-slate-100 object-cover"
          />
        ))}
      </div>
    );
  }

  const current = images[index % count];
  return (
    <figure className="m-0" aria-label={t('form.wait.photosLabel')}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
        <AnimatePresence initial={false}>
          <motion.img
            key={current.src}
            src={current.src}
            alt={current.alt}
            decoding="async"
            width="640"
            height="360"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.5, ease: [0.23, 1, 0.32, 1] }, scale: { duration: 3, ease: 'linear' } }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="truncate font-semibold">{current.alt}</span>
        <span aria-hidden="true" className="flex shrink-0 gap-1">
          {images.map((image, i) => (
            <span
              key={image.src}
              className={cn('h-1.5 w-1.5 rounded-full', i === index % count ? 'bg-brand-600' : 'bg-slate-300')}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

export default function AiWaitingPanel({ stage, images = [], t, headingRef, titleId = 'trip-wait-title' }) {
  const reducedMotion = useReducedMotion();
  const elapsed = useElapsedSeconds(stage);
  const { phase, percent, etaKey } = waitingState(stage, elapsed);
  const activeLabel = t(PHASE_KEYS[phase]);

  return (
    <div className="space-y-4">
      <div>
        <h3
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-lg font-extrabold text-slate-900 outline-none"
        >
          {t('form.wait.title')}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-slate-600">{t(etaKey)}</p>
      </div>

      <div
        role="progressbar"
        aria-label={t('form.wait.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% · ${activeLabel}`}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full w-full origin-left rounded-full bg-brand-600 transition-transform duration-500 ease-out-strong"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>

      <ol className="space-y-2">
        {PHASE_KEYS.map((key, i) => {
          const state = i < phase ? 'done' : i === phase ? 'active' : 'pending';
          return (
            <li
              key={key}
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm',
                state === 'active' && 'border-brand-200 bg-brand-50 font-bold text-brand-800',
                state === 'done' && 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-800',
                state === 'pending' && 'border-slate-200 bg-white text-slate-600'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  state === 'active' && 'bg-brand-600 text-white',
                  state === 'done' && 'bg-emerald-600 text-white',
                  state === 'pending' && 'border border-slate-300 bg-white text-slate-600'
                )}
              >
                {state === 'done' ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : state === 'active' && !reducedMotion ? (
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-white" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0 flex-1">{t(key)}</span>
              <span className="sr-only">
                {t(state === 'done' ? 'form.wait.done' : state === 'active' ? 'form.wait.active' : 'form.wait.pending')}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {activeLabel}
      </p>

      <PhotoStrip images={images} reducedMotion={reducedMotion} t={t} />

      <p className="text-xs text-slate-600">{t('form.wait.keepOpen')}</p>
    </div>
  );
}

// Lớp phủ khi đang gọi concept (trước khi có ConceptDialog).
export function AiWaitingOverlay({ stage, images, t }) {
  const panelRef = useRef(null);
  const headingRef = useRef(null);
  useFocusTrap({
    active: true,
    containerRef: panelRef,
    initialFocusRef: headingRef,
    pauseEscape: true
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-wait-title"
      className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        className="modal-panel max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-soft outline-none sm:p-6"
      >
        <AiWaitingPanel stage={stage} images={images} t={t} headingRef={headingRef} />
      </section>
    </div>
  );
}
