import test from 'node:test';
import assert from 'node:assert/strict';

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

const { getSessionId } = await import('../src/lib/auth.js');
const { api, ApiError, setUseBackend } = await import('../src/lib/api.js');
const { translateApiError } = await import('../src/lib/errors.js');
const { translations } = await import('../src/i18n/translations.js');

test('loginWithGoogle posts id_token to /api/v1/auth/google with x-session-id when backend is enabled', async () => {
  globalThis.localStorage.clear();
  setUseBackend(true);

  const expectedSessionId = getSessionId();
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'u-google-1', username: 'traveler', email: 'traveler@example.com', has_password: false },
        token: 'jwt-google-token',
        claimed_trips: 2,
      }),
    };
  };

  try {
    const result = await api.loginWithGoogle('tok');
    assert.equal(calls.length, 1);

    const [{ url, options }] = calls;
    assert.ok(url.endsWith('/api/v1/auth/google'), `unexpected url: ${url}`);
    assert.equal(options.method, 'POST');
    assert.equal(options.body, '{"id_token":"tok"}');
    assert.equal(options.headers['x-session-id'], expectedSessionId);
    assert.equal(result.token, 'jwt-google-token');
    assert.equal(result.claimed_trips, 2);
  } finally {
    globalThis.fetch = originalFetch;
    setUseBackend(null);
  }
});

test('loginWithGoogle rejects empty token with AUTH_GOOGLE_INVALID without calling fetch', async () => {
  globalThis.localStorage.clear();
  setUseBackend(true);

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch should not be called');
  };

  try {
    for (const invalidToken of ['', '   ', null, undefined]) {
      await assert.rejects(
        () => api.loginWithGoogle(invalidToken),
        (err) => err instanceof ApiError && err.code === 'AUTH_GOOGLE_INVALID' && err.status === 400
      );
    }
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setUseBackend(null);
  }
});

test('loginWithGoogle throws GOOGLE_NOT_CONFIGURED when backend is disabled', async () => {
  globalThis.localStorage.clear();
  setUseBackend(false);

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch should not be called');
  };

  try {
    await assert.rejects(
      () => api.loginWithGoogle('tok'),
      (err) => err instanceof ApiError && err.code === 'GOOGLE_NOT_CONFIGURED'
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setUseBackend(null);
  }
});

test('translateApiError resolves Google auth error codes in both vi and en', () => {
  for (const lang of ['vi', 'en']) {
    const t = (key) => translations[lang][key] ?? key;
    for (const code of ['AUTH_GOOGLE_INVALID', 'AUTH_GOOGLE_NOT_CONFIGURED', 'GOOGLE_NOT_CONFIGURED']) {
      const message = translateApiError(t, new ApiError('raw', code, 400));
      assert.equal(message, translations[lang][`error.${code}`]);
      assert.notEqual(message, translations[lang]['error.default']);
    }
  }
});
