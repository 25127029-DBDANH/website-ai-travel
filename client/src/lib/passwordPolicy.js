const encoder = new TextEncoder();

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PASSPHRASE_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_BYTES = 72;

const USERNAME_CHAR_RE = /^[A-Za-z0-9_]+$/;
const LOWERCASE_RE = /\p{Ll}/u;
const DIGIT_RE = /[0-9]/;

export function checkPassword(password, username = '') {
  const pw = String(password ?? '').normalize('NFC');
  const user = String(username ?? '').normalize('NFC').trim();

  const charCount = [...pw].length;
  const byteCount = encoder.encode(pw).length;

  const hasLowerAndDigit = LOWERCASE_RE.test(pw) && DIGIT_RE.test(pw);
  const lengthOk =
    charCount >= PASSWORD_PASSPHRASE_LENGTH ||
    (charCount >= PASSWORD_MIN_LENGTH && hasLowerAndDigit);
  const maxOk = charCount <= PASSWORD_MAX_LENGTH && byteCount <= PASSWORD_MAX_BYTES;
  const noUsernameOk =
    user.length === 0 || !pw.toLowerCase().includes(user.toLowerCase());

  const rules = [
    { id: 'length', ok: lengthOk },
    { id: 'max', ok: maxOk },
    { id: 'noUsername', ok: noUsernameOk }
  ];

  let code = null;
  if (!maxOk) {
    code = 'AUTH_PASSWORD_TOO_LONG';
  } else if (charCount < PASSWORD_MIN_LENGTH) {
    code = 'AUTH_PASSWORD_TOO_SHORT';
  } else if (!lengthOk) {
    code = 'AUTH_PASSWORD_TOO_WEAK';
  } else if (!noUsernameOk) {
    code = 'AUTH_PASSWORD_CONTAINS_USERNAME';
  }

  return {
    valid: lengthOk && maxOk && noUsernameOk,
    code,
    rules
  };
}

export function checkUsername(username) {
  const value = String(username ?? '').normalize('NFC');
  const valid =
    value.length >= 3 &&
    value.length <= 30 &&
    USERNAME_CHAR_RE.test(value) &&
    !value.startsWith('_') &&
    !value.endsWith('_') &&
    !value.includes('__');

  return {
    valid,
    code: valid ? null : 'AUTH_USERNAME_INVALID'
  };
}
