import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnabledIndices,
  getNextMenuIndex,
  resolveMenuKeyAction,
  resolveTriggerKeyAction
} from '../src/components/itinerary/overflowMenuLogic.js';

const SAMPLE_ITEMS = [
  { id: 'accept', label: 'Chốt điểm' },
  { id: 'disabled-item', label: 'Đã khóa', disabled: true },
  { type: 'divider' },
  { id: 'map', label: 'Xem trên bản đồ' },
  { id: 'ride', label: 'Gọi xe' }
];

test('OverflowMenu logic: getEnabledIndices skips disabled items and dividers', () => {
  assert.deepEqual(getEnabledIndices(SAMPLE_ITEMS), [0, 3, 4]);
  assert.deepEqual(getEnabledIndices([]), []);
  assert.deepEqual(
    getEnabledIndices([{ disabled: true }, { type: 'divider' }]),
    []
  );
});

test('OverflowMenu logic: ArrowDown/ArrowUp wrap cleanly across enabled items', () => {
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, -1, 'first'), 0);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, -1, 'last'), 4);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 0, 'next'), 3);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 3, 'next'), 4);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 4, 'next'), 0);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 0, 'prev'), 4);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 4, 'prev'), 3);
  assert.equal(getNextMenuIndex(SAMPLE_ITEMS, 3, 'prev'), 0);
  assert.equal(getNextMenuIndex([{ disabled: true }], 0, 'next'), -1);
});

test('OverflowMenu logic: trigger key bindings open, navigate, and close with focus return', () => {
  assert.equal(resolveTriggerKeyAction('Enter', false), 'open-first');
  assert.equal(resolveTriggerKeyAction(' ', false), 'open-first');
  assert.equal(resolveTriggerKeyAction('ArrowDown', false), 'open-first');
  assert.equal(resolveTriggerKeyAction('ArrowUp', false), 'open-last');
  assert.equal(resolveTriggerKeyAction('Escape', true), 'close-focus-trigger');
  assert.equal(resolveTriggerKeyAction('Escape', false), null);
});

test('OverflowMenu logic: menu list key bindings handle arrows, Home/End, Escape, Tab', () => {
  assert.equal(resolveMenuKeyAction('ArrowDown'), 'move-next');
  assert.equal(resolveMenuKeyAction('ArrowUp'), 'move-prev');
  assert.equal(resolveMenuKeyAction('Home'), 'move-first');
  assert.equal(resolveMenuKeyAction('End'), 'move-last');
  assert.equal(resolveMenuKeyAction('Escape'), 'close-focus-trigger');
  assert.equal(resolveMenuKeyAction('Tab'), 'close');
  assert.equal(resolveMenuKeyAction('a'), null);
});
