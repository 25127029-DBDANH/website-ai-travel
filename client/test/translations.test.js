import test from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/i18n/translations.js';

test('i18n: translations has matching keys between vi and en', () => {
  const viKeys = Object.keys(translations.vi).sort();
  const enKeys = Object.keys(translations.en).sort();

  const missingInEn = viKeys.filter((k) => !(k in translations.en));
  const missingInVi = enKeys.filter((k) => !(k in translations.vi));

  assert.deepEqual(missingInEn, [], `Keys in VI but missing in EN: ${missingInEn.join(', ')}`);
  assert.deepEqual(missingInVi, [], `Keys in EN but missing in VI: ${missingInVi.join(', ')}`);
});

test('i18n: interpolation placeholders match between vi and en', () => {
  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;

  for (const key of Object.keys(translations.vi)) {
    const viText = translations.vi[key];
    const enText = translations.en[key];

    const viMatches = [...viText.matchAll(placeholderRegex)].map((m) => m[1]).sort();
    const enMatches = [...enText.matchAll(placeholderRegex)].map((m) => m[1]).sort();

    assert.deepEqual(
      viMatches,
      enMatches,
      `Placeholder mismatch in key "${key}": VI has [${viMatches.join(', ')}], EN has [${enMatches.join(', ')}]`
    );
  }
});

test('i18n: eliminates robotic/AI clichés and adheres to natural human tone', () => {
  const vi = translations.vi;

  const roboticPhrases = [
    'Trợ lý lịch trình AI',
    'Trợ lý du lịch AI',
    'AI sẽ tìm địa điểm thật',
    'tôn trọng giờ mở cửa',
    'Vận hành bởi Gemini',
    'hỏi một câu thông minh',
    'tìm địa điểm đã xác thực',
    'ngôn ngữ đời thường',
    'Chúng tôi hiểu được',
    'Điểm biên tập',
    'không làm bạn bất ngờ'
  ];

  for (const phrase of roboticPhrases) {
    const foundIn = Object.entries(vi).filter(([, val]) => typeof val === 'string' && val.includes(phrase));
    assert.equal(
      foundIn.length,
      0,
      `Robotic phrase "${phrase}" still exists in keys: ${foundIn.map(([k]) => k).join(', ')}`
    );
  }

  // Verify key humanized phrases are present
  assert.match(vi['brand.tagline'], /bạn đồng hành/i);
  assert.match(vi['form.sentence.parsed'], /tụi mình|nắm được/i);
  assert.match(vi['itinerary.card.editorScore'], /chọn lọc|yêu thích/i);
});

