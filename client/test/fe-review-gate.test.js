// T-056: FE review gate regression tests (IME guard, modal a11y, composite animations, map stability).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSrc = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

test('ExpenseTrackerView guards Enter keydown with isImeComposing', () => {
  const src = readSrc('components/companion/ExpenseTrackerView.jsx');
  assert.ok(src.includes('isImeComposing'), 'ExpenseTrackerView must import and use isImeComposing');
  assert.match(src, /key === 'Enter'[\s\S]{0,120}isImeComposing\(e\)/);
});

test('in-scope modals trap focus and expose aria-labelledby without non-keyboard div buttons', () => {
  const ride = readSrc('components/common/RidePickerModal.jsx');
  const concept = readSrc('components/tripForm/ConceptDialog.jsx');
  const wait = readSrc('components/tripForm/AiWaitingPanel.jsx');

  for (const [name, src] of [
    ['RidePickerModal', ride],
    ['ConceptDialog', concept],
    ['AiWaitingPanel', wait]
  ]) {
    assert.ok(src.includes('useFocusTrap('), `${name} must trap focus via useFocusTrap`);
    assert.ok(src.includes('aria-labelledby='), `${name} must provide aria-labelledby`);
  }

  // RidePickerModal provider cards must use semantic <button aria-pressed>, not clickable <div>
  assert.equal(/<div[\s\S]{0,160}onClick=\{\(\)\s*=>\s*setSelectedService/.test(ride), false);
  assert.ok(ride.includes('aria-pressed={isSelected}'));
  // Brand styles remain untouched
  assert.ok(ride.includes('#00B14F') && ride.includes('#28BDBF') && ride.includes('#0A60B0'));
});

test('in-scope files avoid transition-all and layout-animating progress bars', () => {
  const files = [
    'components/TripForm.jsx',
    'components/tripForm/TripIntro.jsx',
    'components/tripForm/StepWhenWhere.jsx',
    'components/tripForm/StepWho.jsx',
    'components/tripForm/StepVibe.jsx',
    'components/tripForm/StepFinetune.jsx',
    'components/tripForm/TripSummary.jsx',
    'components/tripForm/AiWaitingPanel.jsx',
    'components/tripForm/ConceptDialog.jsx',
    'components/tripForm/WizardProgress.jsx',
    'components/common/RidePickerModal.jsx',
    'components/companion/LiveCompanionView.jsx',
    'components/place/PlaceDrawer.jsx',
    'components/itinerary/TripMap.jsx',
    'components/itinerary/TimelineItem.jsx'
  ];

  for (const rel of files) {
    const src = readSrc(rel);
    assert.equal(src.includes('transition-all'), false, `transition-all found in ${rel}`);
    assert.equal(src.includes('transition-[width]'), false, `transition-[width] found in ${rel}`);
  }
});

test('TripMap escapes popup HTML and keeps onOpenDetail out of marker-rebuild effect deps', () => {
  const map = readSrc('components/itinerary/TripMap.jsx');
  assert.ok(map.includes('function escapeHtml('));
  assert.ok(map.includes('onOpenDetailRef'));
  assert.equal(
    /\[points,\s*activeDay,\s*collapsed,\s*hasPoints,\s*reduced,\s*lang,\s*onOpenDetail/.test(map),
    false,
    'onOpenDetail in marker-rebuild deps tears down markers on parent re-renders'
  );
});
