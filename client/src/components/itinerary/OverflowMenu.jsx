import { MoreHorizontal } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn.js';
import {
  getNextMenuIndex,
  resolveMenuKeyAction,
  resolveTriggerKeyAction
} from './overflowMenuLogic.js';

export default function OverflowMenu({
  items = [],
  label = 'Thao tác khác',
  triggerLabel,
  triggerIcon: TriggerIcon = MoreHorizontal,
  align = 'right',
  indicator = false,
  disabled = false,
  buttonClassName,
  menuClassName
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);

  const visibleItems = items.filter(Boolean);

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const openMenu = useCallback(
    (direction = 'first') => {
      const next = getNextMenuIndex(visibleItems, -1, direction);
      setOpen(true);
      setActiveIndex(next);
    },
    [visibleItems]
  );

  // Move DOM focus to active menu item whenever menu opens or activeIndex changes
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = itemRefs.current[activeIndex];
    if (node && typeof node.focus === 'function') {
      node.focus();
    }
  }, [open, activeIndex]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        closeMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, closeMenu]);

  if (visibleItems.length === 0) return null;

  const handleTriggerClick = (event) => {
    event.stopPropagation();
    if (disabled) return;
    if (open) {
      closeMenu(false);
    } else {
      openMenu('first');
    }
  };

  const handleTriggerKeyDown = (event) => {
    const action = resolveTriggerKeyAction(event.key, open);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();

    if (action === 'open-first' || action === 'focus-first') {
      openMenu('first');
    } else if (action === 'open-last' || action === 'focus-last') {
      openMenu('last');
    } else if (action === 'close-focus-trigger') {
      closeMenu(true);
    }
  };

  const handleMenuKeyDown = (event) => {
    const action = resolveMenuKeyAction(event.key);
    if (!action) return;

    if (action === 'close') {
      closeMenu(false);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (action === 'close-focus-trigger') {
      closeMenu(true);
      return;
    }

    const directionMap = {
      'move-next': 'next',
      'move-prev': 'prev',
      'move-first': 'first',
      'move-last': 'last'
    };
    const nextIndex = getNextMenuIndex(visibleItems, activeIndex, directionMap[action]);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  };

  const handleItemSelect = (event, item) => {
    event.stopPropagation();
    if (item.disabled) return;
    closeMenu(true);
    item.onSelect?.(event);
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'relative inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-[background-color,border-color,color,transform] duration-150 ease-out-strong hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-brand-300 bg-brand-50 text-brand-700',
          buttonClassName
        )}
      >
        <TriggerIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {triggerLabel ? <span>{triggerLabel}</span> : null}
        {indicator ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white"
          />
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'absolute top-full z-40 mt-1.5 max-h-72 min-w-[216px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift',
            align === 'left' ? 'left-0' : 'right-0',
            menuClassName
          )}
        >
          {visibleItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.id || `divider-${index}`}
                  role="separator"
                  className="my-1 border-t border-slate-100"
                />
              );
            }

            const Icon = item.icon;
            const sharedClasses = cn(
              'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:bg-slate-100',
              item.disabled
                ? 'cursor-not-allowed text-slate-400'
                : item.tone === 'danger'
                ? 'text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50'
                : item.active
                ? 'bg-brand-50 text-brand-700 hover:bg-brand-100/80'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            );

            const content = (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  {Icon ? (
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        item.disabled
                          ? 'text-slate-300'
                          : item.tone === 'danger'
                          ? 'text-rose-600'
                          : item.active
                          ? 'text-brand-600'
                          : 'text-slate-500'
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      item.active
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </>
            );

            if (item.href && !item.disabled) {
              return (
                <a
                  key={item.id || item.label}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeMenu(true)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={sharedClasses}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.id || item.label}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={Boolean(item.disabled)}
                aria-disabled={item.disabled || undefined}
                onClick={(event) => handleItemSelect(event, item)}
                onMouseEnter={() => !item.disabled && setActiveIndex(index)}
                className={sharedClasses}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
