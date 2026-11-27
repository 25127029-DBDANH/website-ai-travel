import { checkPassword } from './passwordPolicy.js';

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const RECOVERY_CODE_LENGTH = 12;

const RECOVERY_CODE_RE = /^[0-9A-HJKMNP-TV-Z]{12}$/;

/**
 * Strip hyphens and whitespace and uppercase a recovery code for comparison/submission.
 */
export function normalizeRecoveryCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

/**
 * Format user input into XXXX-XXXX-XXXX as they type (uppercased, hyphens auto-inserted).
 */
export function formatRecoveryCode(value) {
  const cleaned = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, RECOVERY_CODE_LENGTH);

  const groups = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }
  return groups.join('-');
}

/**
 * Check whether a recovery code has 12 valid Crockford Base32 characters (excludes I, L, O, U).
 */
export function isValidRecoveryCode(value) {
  return RECOVERY_CODE_RE.test(normalizeRecoveryCode(value));
}

/**
 * Generate a formatted 12-character Crockford Base32 recovery code for offline mock mode.
 */
export function generateMockRecoveryCode() {
  const bytes = new Uint8Array(RECOVERY_CODE_LENGTH);
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let raw = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
    raw += CROCKFORD_ALPHABET[bytes[i] % CROCKFORD_ALPHABET.length];
  }
  return formatRecoveryCode(raw);
}

/**
 * Check whether two password inputs match.
 */
export function passwordsMatch(password, confirmPassword) {
  return typeof password === 'string' && password.length > 0 && password === confirmPassword;
}

/**
 * Validate new password + confirm password fields against password policy and equality.
 */
export function validatePasswordResetForm({ newPassword, confirmPassword, username = '' } = {}) {
  const next = String(newPassword ?? '');
  const confirm = String(confirmPassword ?? '');

  if (!next) {
    return { valid: false, field: 'newPassword', code: 'VALIDATION_ERROR' };
  }

  const check = checkPassword(next, username);
  if (!check.valid) {
    return { valid: false, field: 'newPassword', code: check.code };
  }

  if (next !== confirm) {
    return { valid: false, field: 'confirmPassword', code: 'PASSWORD_MISMATCH' };
  }

  return { valid: true, field: null, code: null };
}

/**
 * Guard for Vietnamese and CJK IME composition on keyboard events.
 */
export function isImeComposing(event) {
  return Boolean(
    event?.isComposing ||
      event?.nativeEvent?.isComposing ||
      event?.keyCode === 229 ||
      event?.nativeEvent?.keyCode === 229
  );
}

export function blockImeEnter(event) {
  if (event?.key === 'Enter' && isImeComposing(event)) {
    event.preventDefault();
  }
}

export function buildRecoveryCodeFilename(username = '') {
  const safeUser = String(username ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  return safeUser
    ? `saigon-guide-recovery-code-${safeUser}.txt`
    : 'saigon-guide-recovery-code.txt';
}

export function buildRecoveryCodeFileContent(code, username = '') {
  const formatted = formatRecoveryCode(code) || String(code || '').trim();
  const lines = [
    'Sài Gòn Guide — Recovery Code / Mã khôi phục mật khẩu',
    '====================================================',
    ...(username ? [`Username / Tên đăng nhập: ${username}`] : []),
    `Recovery Code / Mã khôi phục: ${formatted}`,
    '',
    'Keep this code in a safe place. It is shown only once and can be used to reset your password.',
    'Hãy lưu mã này ở nơi an toàn. Mã chỉ hiện một lần và dùng để đặt lại mật khẩu nếu bạn quên.'
  ];
  return `${lines.join('\n')}\n`;
}
