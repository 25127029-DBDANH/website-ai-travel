import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword, checkUsername } from '../src/lib/passwordPolicy.js';
import { translations } from '../src/i18n/translations.js';

const ruleOk = (result, id) => result.rules.find((r) => r.id === id)?.ok;

test('checkPassword: 8–14 chars require lowercase and digit; 15+ chars allow any', () => {
  const validShort = checkPassword('abc12345');
  assert.equal(validShort.valid, true);
  assert.equal(ruleOk(validShort, 'length'), true);
  assert.equal(ruleOk(validShort, 'max'), true);
  assert.equal(ruleOk(validShort, 'noUsername'), true);

  const noDigit = checkPassword('abcdefgh');
  assert.equal(noDigit.valid, false);
  assert.equal(ruleOk(noDigit, 'length'), false);
  assert.equal(noDigit.code, 'AUTH_PASSWORD_TOO_WEAK');

  const noLower = checkPassword('ABCDEFGH1');
  assert.equal(noLower.valid, false);
  assert.equal(ruleOk(noLower, 'length'), false);
  assert.equal(noLower.code, 'AUTH_PASSWORD_TOO_WEAK');

  const tooShort = checkPassword('abc1234');
  assert.equal(tooShort.valid, false);
  assert.equal(ruleOk(tooShort, 'length'), false);
  assert.equal(tooShort.code, 'AUTH_PASSWORD_TOO_SHORT');

  const fifteenLetters = checkPassword('abcdefghijklmno');
  assert.equal(fifteenLetters.valid, true);
  assert.equal(ruleOk(fifteenLetters, 'length'), true);

  const fifteenUpper = checkPassword('ABCDEFGHIJKLMNO');
  assert.equal(fifteenUpper.valid, true);
  assert.equal(ruleOk(fifteenUpper, 'length'), true);
});

test('checkPassword: enforces max 64 code points and max 72 UTF-8 bytes with NFC normalization', () => {
  const sixtyFiveChars = checkPassword('a'.repeat(65));
  assert.equal(sixtyFiveChars.valid, false);
  assert.equal(ruleOk(sixtyFiveChars, 'max'), false);
  assert.equal(sixtyFiveChars.code, 'AUTH_PASSWORD_TOO_LONG');

  const thirtyVietnameseAccented = checkPassword('ệ'.repeat(30));
  assert.equal(thirtyVietnameseAccented.valid, false);
  assert.equal(ruleOk(thirtyVietnameseAccented, 'max'), false);
  assert.equal(thirtyVietnameseAccented.code, 'AUTH_PASSWORD_TOO_LONG');

  // NFD decomposed 'e' + combining acute + combining circumflex normalizes to 1 NFC code point ('ệ')
  const nfdSevenChars = 'e\u0302\u0323'.repeat(7);
  assert.equal(checkPassword(nfdSevenChars).valid, false);
});

test('checkPassword: rejects password containing username (case-insensitive)', () => {
  const containsExact = checkPassword('pass_hung_qa1', 'hung_qa');
  assert.equal(containsExact.valid, false);
  assert.equal(ruleOk(containsExact, 'noUsername'), false);
  assert.equal(containsExact.code, 'AUTH_PASSWORD_CONTAINS_USERNAME');

  const containsDifferentCase = checkPassword('MyHUNG_QA1234', 'hung_qa');
  assert.equal(containsDifferentCase.valid, false);
  assert.equal(ruleOk(containsDifferentCase, 'noUsername'), false);

  const withoutUsername = checkPassword('saigon2026', 'hung_qa');
  assert.equal(withoutUsername.valid, true);
  assert.equal(ruleOk(withoutUsername, 'noUsername'), true);
});

test('checkUsername: validates length, characters, edge underscores, and double underscores', () => {
  assert.deepEqual(checkUsername('_abc'), { valid: false, code: 'AUTH_USERNAME_INVALID' });
  assert.deepEqual(checkUsername('abc_'), { valid: false, code: 'AUTH_USERNAME_INVALID' });
  assert.deepEqual(checkUsername('a__b'), { valid: false, code: 'AUTH_USERNAME_INVALID' });
  assert.deepEqual(checkUsername('ab'), { valid: false, code: 'AUTH_USERNAME_INVALID' });
  assert.deepEqual(checkUsername('a'.repeat(31)), { valid: false, code: 'AUTH_USERNAME_INVALID' });
  assert.deepEqual(checkUsername('hung-qa'), { valid: false, code: 'AUTH_USERNAME_INVALID' });

  assert.deepEqual(checkUsername('hung_qa'), { valid: true, code: null });
  assert.deepEqual(checkUsername('abc'), { valid: true, code: null });
  assert.deepEqual(checkUsername('a'.repeat(30)), { valid: true, code: null });
});

test('i18n: all new backend auth error codes exist in both en and vi', () => {
  const requiredCodes = [
    'AUTH_PASSWORD_TOO_SHORT',
    'AUTH_PASSWORD_TOO_WEAK',
    'AUTH_PASSWORD_TOO_LONG',
    'AUTH_PASSWORD_COMMON',
    'AUTH_PASSWORD_CONTAINS_USERNAME',
    'AUTH_USERNAME_INVALID',
    'AUTH_USERNAME_RESERVED'
  ];

  for (const code of requiredCodes) {
    const key = `error.${code}`;
    assert.equal(typeof translations.en[key], 'string', `Missing ${key} in en`);
    assert.ok(translations.en[key].trim().length > 0, `Empty ${key} in en`);
    assert.equal(typeof translations.vi[key], 'string', `Missing ${key} in vi`);
    assert.ok(translations.vi[key].trim().length > 0, `Empty ${key} in vi`);
  }

  assert.match(translations.en['error.AUTH_RATE_LIMITED'], /15 minutes/i);
  assert.match(translations.vi['error.AUTH_RATE_LIMITED'], /15 phút/i);
});
