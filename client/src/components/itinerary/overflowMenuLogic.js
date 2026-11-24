/**
 * Pure keyboard navigation helpers for OverflowMenu.
 * Kept framework-free so menu navigation can be unit tested directly with node:test.
 */

export function getEnabledIndices(items = []) {
  const indices = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item && !item.disabled && item.type !== 'divider') {
      indices.push(i);
    }
  }
  return indices;
}

export function getNextMenuIndex(items = [], currentIndex = -1, direction = 'next') {
  const enabled = getEnabledIndices(items);
  if (enabled.length === 0) return -1;

  if (direction === 'first') return enabled[0];
  if (direction === 'last') return enabled[enabled.length - 1];

  const pos = enabled.indexOf(currentIndex);
  if (direction === 'next') {
    if (pos === -1) return enabled[0];
    return enabled[(pos + 1) % enabled.length];
  }

  if (direction === 'prev') {
    if (pos === -1) return enabled[enabled.length - 1];
    return enabled[(pos - 1 + enabled.length) % enabled.length];
  }

  return enabled[0];
}

export function resolveTriggerKeyAction(key, isOpen) {
  if (key === 'Escape' && isOpen) return 'close-focus-trigger';
  if (key === 'ArrowDown') return isOpen ? 'focus-first' : 'open-first';
  if (key === 'ArrowUp') return isOpen ? 'focus-last' : 'open-last';
  if (key === 'Enter' || key === ' ') return isOpen ? 'close-focus-trigger' : 'open-first';
  return null;
}

export function resolveMenuKeyAction(key) {
  switch (key) {
    case 'ArrowDown':
      return 'move-next';
    case 'ArrowUp':
      return 'move-prev';
    case 'Home':
      return 'move-first';
    case 'End':
      return 'move-last';
    case 'Escape':
      return 'close-focus-trigger';
    case 'Tab':
      return 'close';
    default:
      return null;
  }
}
