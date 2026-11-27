import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

globalThis.localStorage = createMemoryStorage();

const {
  normalizeRecoveryCode,
  formatRecoveryCode,
  isValidRecoveryCode,
  generateMockRecoveryCode,
  passwordsMatch,
  validatePasswordResetForm,
  isImeComposing,
  blockImeEnter,
  buildRecoveryCodeFileContent,
} = await import('../src/lib/recoveryCode.js');
const { api, ApiError, setUseBackend } = await import('../src/lib/api.js');
const { translateApiError } = await import('../src/lib/errors.js');
const { translations } = await import('../src/i18n/translations.js');

function withMockEnv(run) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const storage = createMemoryStorage();
  const events = [];

  globalThis.localStorage = storage;
  globalThis.window = {
    localStorage: storage,
    dispatchEvent: (event) => {
      events.push(event.type);
      return true;
    },
  };

  return Promise.resolve()
    .then(() => run({ storage, events }))
    .finally(() => {
      globalThis.fetch = originalFetch;
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
      setUseBackend(null);
    });
}

test('recoveryCode: normalize, format while typing, and Crockford Base32 validation', () => {
  assert.equal(normalizeRecoveryCode(' abcd-1234-efgh '), 'ABCD1234EFGH');
  assert.equal(normalizeRecoveryCode('a1b2 - c3d4 - e5f6'), 'A1B2C3D4E5F6');

  assert.equal(formatRecoveryCode('abcd'), 'ABCD');
  assert.equal(formatRecoveryCode('abcd1'), 'ABCD-1');
  assert.equal(formatRecoveryCode('abcd1234efgh'), 'ABCD-1234-EFGH');
  assert.equal(formatRecoveryCode('ab-cd 1234 efgh999'), 'ABCD-1234-EFGH');

  // Valid Crockford Base32 (no I, L, O, U)
  assert.equal(isValidRecoveryCode('ABCD-2345-EFGH'), true);
  assert.equal(isValidRecoveryCode('abcd2345efgh'), true);

  // Invalid length or excluded letters I, L, O, U
  assert.equal(isValidRecoveryCode('ABCD-2345-EFG'), false);
  assert.equal(isValidRecoveryCode('IBCD-2345-EFGH'), false);
  assert.equal(isValidRecoveryCode('LBCD-2345-EFGH'), false);
  assert.equal(isValidRecoveryCode('OBCD-2345-EFGH'), false);
  assert.equal(isValidRecoveryCode('UBCD-2345-EFGH'), false);

  const mockCode = generateMockRecoveryCode();
  assert.match(mockCode, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(isValidRecoveryCode(mockCode), true);

  const txt = buildRecoveryCodeFileContent(mockCode, 'traveler_1');
  assert.ok(txt.includes(mockCode));
  assert.ok(txt.includes('traveler_1'));
});

test('recoveryCode: IME Enter guard ignores composing events and keyCode 229', () => {
  let prevented = 0;
  const preventDefault = () => {
    prevented += 1;
  };

  assert.equal(isImeComposing({ isComposing: true }), true);
  assert.equal(isImeComposing({ keyCode: 229 }), true);
  assert.equal(isImeComposing({ nativeEvent: { isComposing: true } }), true);
  assert.equal(isImeComposing({ isComposing: false, keyCode: 13 }), false);

  blockImeEnter({ key: 'Enter', isComposing: true, preventDefault });
  blockImeEnter({ key: 'Enter', keyCode: 229, preventDefault });
  assert.equal(prevented, 2);

  blockImeEnter({ key: 'Enter', isComposing: false, keyCode: 13, preventDefault });
  assert.equal(prevented, 2);
});

test('validatePasswordResetForm & passwordsMatch check equality and password policy', () => {
  assert.equal(passwordsMatch('saigon2026', 'saigon2026'), true);
  assert.equal(passwordsMatch('saigon2026', 'saigon2027'), false);
  assert.equal(passwordsMatch('', ''), false);

  assert.deepEqual(
    validatePasswordResetForm({ newPassword: 'saigon2026', confirmPassword: 'saigon2026', username: 'hung_qa' }),
    { valid: true, field: null, code: null }
  );

  assert.deepEqual(
    validatePasswordResetForm({ newPassword: 'saigon2026', confirmPassword: 'different1', username: 'hung_qa' }),
    { valid: false, field: 'confirmPassword', code: 'PASSWORD_MISMATCH' }
  );

  assert.deepEqual(
    validatePasswordResetForm({ newPassword: 'short1', confirmPassword: 'short1' }),
    { valid: false, field: 'newPassword', code: 'AUTH_PASSWORD_TOO_SHORT' }
  );

  assert.deepEqual(
    validatePasswordResetForm({ newPassword: 'my_hung_qa123', confirmPassword: 'my_hung_qa123', username: 'hung_qa' }),
    { valid: false, field: 'newPassword', code: 'AUTH_PASSWORD_CONTAINS_USERNAME' }
  );
});

test('api password recovery endpoints call exact contract URLs and bodies', async () => {
  await withMockEnv(async ({ storage }) => {
    setUseBackend(true);
    storage.setItem('hcmc_auth_token', 'jwt-auth-1');

    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      if (url.endsWith('/api/v1/auth/config')) {
        return { ok: true, status: 200, json: async () => ({ email_recovery_enabled: true }) };
      }
      if (url.endsWith('/api/v1/auth/reset-password/recovery-code')) {
        return { ok: true, status: 200, json: async () => ({ success: true, recovery_code: 'ABCD-2345-EFGH' }) };
      }
      if (url.endsWith('/api/v1/auth/recovery-code')) {
        return { ok: true, status: 200, json: async () => ({ recovery_code: 'WXYZ-6789-ABCD' }) };
      }
      if (url.endsWith('/api/v1/auth/email')) {
        return { ok: true, status: 200, json: async () => ({ email: 'u@example.com', email_verified: false }) };
      }
      if (url.endsWith('/api/v1/auth/email/verify')) {
        return { ok: true, status: 200, json: async () => ({ email_verified: true }) };
      }
      if (url.endsWith('/api/v1/auth/forgot-password')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      if (url.endsWith('/api/v1/auth/reset-password')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const cfg = await api.getAuthConfig();
    assert.deepEqual(cfg, { email_recovery_enabled: true });

    const resetCodeRes = await api.resetWithRecoveryCode({
      username: 'hung_qa',
      recovery_code: 'AAAA-BBBB-CCCC',
      new_password: 'newPassword1',
    });
    assert.equal(resetCodeRes.success, true);
    assert.equal(resetCodeRes.recovery_code, 'ABCD-2345-EFGH');

    const regenRes = await api.regenerateRecoveryCode({ current_password: 'oldPassword1' });
    assert.equal(regenRes.recovery_code, 'WXYZ-6789-ABCD');

    const addEmailRes = await api.addEmail({ email: 'u@example.com' });
    assert.equal(addEmailRes.email_verified, false);

    const verifyRes = await api.verifyEmail({ code: '123456' });
    assert.equal(verifyRes.email_verified, true);

    const forgotRes = await api.forgotPassword({ email: 'u@example.com' });
    assert.equal(forgotRes.success, true);

    const resetPwRes = await api.resetPassword({ token: 'tok-xyz', new_password: 'newPassword1' });
    assert.equal(resetPwRes.success, true);

    assert.equal(calls.length, 7);

    assert.ok(calls[0].url.endsWith('/api/v1/auth/config'));
    assert.equal(calls[0].options.method, 'GET');

    assert.ok(calls[1].url.endsWith('/api/v1/auth/reset-password/recovery-code'));
    assert.equal(calls[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].options.body), {
      username: 'hung_qa',
      recovery_code: 'AAAA-BBBB-CCCC',
      new_password: 'newPassword1',
    });

    assert.ok(calls[2].url.endsWith('/api/v1/auth/recovery-code'));
    assert.equal(calls[2].options.method, 'POST');
    assert.equal(calls[2].options.headers['Authorization'], 'Bearer jwt-auth-1');
    assert.deepEqual(JSON.parse(calls[2].options.body), { current_password: 'oldPassword1' });

    assert.ok(calls[3].url.endsWith('/api/v1/auth/email'));
    assert.equal(calls[3].options.method, 'POST');
    assert.equal(calls[3].options.headers['Authorization'], 'Bearer jwt-auth-1');
    assert.deepEqual(JSON.parse(calls[3].options.body), { email: 'u@example.com' });

    assert.ok(calls[4].url.endsWith('/api/v1/auth/email/verify'));
    assert.equal(calls[4].options.method, 'POST');
    assert.equal(calls[4].options.headers['Authorization'], 'Bearer jwt-auth-1');
    assert.deepEqual(JSON.parse(calls[4].options.body), { code: '123456' });

    assert.ok(calls[5].url.endsWith('/api/v1/auth/forgot-password'));
    assert.equal(calls[5].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[5].options.body), { email: 'u@example.com' });

    assert.ok(calls[6].url.endsWith('/api/v1/auth/reset-password'));
    assert.equal(calls[6].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[6].options.body), {
      token: 'tok-xyz',
      new_password: 'newPassword1',
    });
  });
});

test('api handles 404 gracefully when backend endpoints are not deployed yet', async () => {
  await withMockEnv(async () => {
    setUseBackend(true);
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not Found' }),
    });

    const cfg = await api.getAuthConfig();
    assert.deepEqual(cfg, { email_recovery_enabled: false });

    await assert.rejects(
      () => api.forgotPassword({ email: 'a@b.com' }),
      (err) => err instanceof ApiError && err.code === 'RECOVERY_UNAVAILABLE' && err.status === 404
    );

    await assert.rejects(
      () => api.resetWithRecoveryCode({ username: 'u', recovery_code: 'ABCD-2345-EFGH', new_password: 'newPassword1' }),
      (err) => err instanceof ApiError && err.code === 'RECOVERY_UNAVAILABLE' && err.status === 404
    );
  });
});

test('api.changePassword stores rotated JWT token when backend returns token', async () => {
  await withMockEnv(async ({ storage }) => {
    setUseBackend(true);
    storage.setItem('hcmc_auth_token', 'old-jwt-token');

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, token: 'rotated-jwt-token' }),
    });

    const res = await api.changePassword({
      current_password: 'oldPassword1',
      new_password: 'newPassword1',
    });

    assert.equal(res.token, 'rotated-jwt-token');
    assert.equal(storage.getItem('hcmc_auth_token'), 'rotated-jwt-token');
  });
});

test('api mock mode returns sensible recovery defaults when backend is disabled', async () => {
  await withMockEnv(async () => {
    setUseBackend(false);
    const cfg = await api.getAuthConfig();
    assert.deepEqual(cfg, { email_recovery_enabled: false });

    const reg = await api.register({ username: 'mock_user', password: 'Password123' });
    assert.equal(isValidRecoveryCode(reg.recovery_code), true);

    const regen = await api.regenerateRecoveryCode({ current_password: 'Password123' });
    assert.equal(isValidRecoveryCode(regen.recovery_code), true);
  });
});

test('i18n: all password recovery error codes translate in both vi and en', () => {
  const codes = [
    'AUTH_RECOVERY_INVALID',
    'AUTH_RESET_TOKEN_INVALID',
    'AUTH_EMAIL_CODE_INVALID',
    'AUTH_EMAIL_INVALID',
    'EMAIL_DISABLED',
    'AUTH_RATE_LIMITED',
    'RECOVERY_UNAVAILABLE',
    'PASSWORD_MISMATCH',
  ];

  for (const lang of ['vi', 'en']) {
    const t = (key) => translations[lang][key] ?? key;
    for (const code of codes) {
      const msg = translateApiError(t, new ApiError(code, code, 400));
      assert.equal(msg, translations[lang][`error.${code}`], `Missing ${lang} translation for ${code}`);
      assert.notEqual(msg, translations[lang]['error.default']);
    }
  }
});

test('App.jsx declares /forgot-password and /reset-password routes', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const appSource = fs.readFileSync(path.resolve(__dirname, '../src/App.jsx'), 'utf8');

  assert.match(appSource, /path=["']\/forgot-password["']/);
  assert.match(appSource, /path=["']\/reset-password["']/);
  assert.match(appSource, /ForgotPasswordPage/);
  assert.match(appSource, /ResetPasswordPage/);
});
