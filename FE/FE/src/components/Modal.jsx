import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, children, footer, className }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!node.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    const target = node?.querySelector(FOCUSABLE) ?? node;
    target?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
      previouslyFocused.current = null;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="absolute inset-0 cursor-default"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: 40, scale: 0.96 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.98 }}
            transition={
              reduced
                ? { duration: 0.12 }
                : { type: 'spring', stiffness: 380, damping: 32 }
            }
            className={cn(
              'relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:pb-0',
              className
            )}
          >
            {/* Thanh kéo Bottom Sheet giả lập trên mobile */}
            <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />

            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3 sm:px-6 sm:pt-6">
              <h2 id={titleId} className="font-display text-lg font-extrabold text-slate-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="touch-target -mr-1.5 -mt-1.5 grid shrink-0 place-items-center rounded-full p-1.5 text-slate-500 transition-[color,background-color] duration-150 ease-out-strong hover:bg-slate-100 hover:text-slate-700 active:scale-[0.97]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="scrollbar-thin mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6 sm:pb-6"
            >
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 px-5 pb-3 sm:px-6 sm:pb-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
