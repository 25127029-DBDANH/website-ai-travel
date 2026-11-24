import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap({
  active,
  containerRef,
  onClose,
  initialFocusRef,
  pauseEscape = false,
  pauseTrap = false
}) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!pauseEscape) onClose?.();
        return;
      }
      if (event.key !== 'Tab' || pauseTrap) return;
      const node = containerRef.current;
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
  }, [active, containerRef, onClose, pauseEscape, pauseTrap]);

  useEffect(() => {
    if (!active) return undefined;
    previouslyFocused.current = document.activeElement;
    const node = containerRef.current;
    const target = initialFocusRef?.current ?? node?.querySelector(FOCUSABLE) ?? node;
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
  }, [active, containerRef, initialFocusRef]);
}
