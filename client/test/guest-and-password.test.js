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

test('api.changePassword posts payload to /api/v1/auth/change-password with Authorization when backend is enabled', async () => {
  await withMockEnv(async ({ storage }) => {
    setUseBackend(true);
    storage.setItem('hcmc_auth_token', 'jwt-change-pw');

    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    };

    const payload = { current_password: 'oldPassword1', new_password: 'newPassword1' };
    const result = await api.changePassword(payload);

    assert.deepEqual(result, { success: true });
    assert.equal(calls.length, 1);
    const [{ url, options }] = calls;
    assert.ok(url.endsWith('/api/v1/auth/change-password'), `unexpected url: ${url}`);
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.headers['Authorization'], 'Bearer jwt-change-pw');
  });
});

test('api.changePassword throws ApiError AUTH_PASSWORD_INVALID on 403 without logging out', async () => {
  await withMockEnv(async ({ storage, events }) => {
    setUseBackend(true);
    storage.setItem('hcmc_auth_token', 'jwt-change-pw');

    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ detail: 'AUTH_PASSWORD_INVALID' }),
    });

    await assert.rejects(
      () => api.changePassword({ current_password: 'wrong', new_password: 'newPassword1' }),
      (err) => err instanceof ApiError && err.code === 'AUTH_PASSWORD_INVALID' && err.status === 403
    );

    assert.equal(storage.getItem('hcmc_auth_token'), 'jwt-change-pw');
    assert.deepEqual(events, []);
  });
});

test('api.changePassword returns mock success without calling fetch when backend is disabled', async () => {
  await withMockEnv(async () => {
    setUseBackend(false);
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error('fetch should not be called');
    };

    const result = await api.changePassword({ current_password: 'old', new_password: 'newPassword1' });
    assert.deepEqual(result, { success: true });
    assert.equal(fetchCalls, 0);
  });
});

test('request 401 without token throws ApiError without emitting hcmc-auth-expired', async () => {
  await withMockEnv(async ({ events }) => {
    setUseBackend(true);

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'AUTH_REQUIRED' }),
    });

    await assert.rejects(
      () => api.listTrips(),
      (err) => err instanceof ApiError && err.code === 'AUTH_REQUIRED' && err.status === 401
    );
    assert.deepEqual(events, []);

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await assert.rejects(
      () => api.listTrips(),
      (err) => err instanceof ApiError && err.code === 'AUTH_REQUIRED' && err.status === 401
    );
    assert.deepEqual(events, []);
  });
});

test('request 401 with token clears auth token and emits hcmc-auth-expired', async () => {
  await withMockEnv(async ({ storage, events }) => {
    setUseBackend(true);
    storage.setItem('hcmc_auth_token', 'jwt-expired-token');

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'AUTH_TOKEN_EXPIRED' }),
    });

    await assert.rejects(
      () => api.getMe(),
      (err) => err instanceof ApiError && err.code === 'AUTH_TOKEN_EXPIRED' && err.status === 401
    );

    assert.equal(storage.getItem('hcmc_auth_token'), null);
    assert.deepEqual(events, ['hcmc-auth-expired']);
  });
});

test('error.TRIP_SESSION_LIMIT_REACHED exists and translates in both vi and en', () => {
  assert.equal(
    translations.vi['error.TRIP_SESSION_LIMIT_REACHED'],
    'Khách chỉ tạo được tối đa 10 chuyến. Hãy đăng ký để lưu thêm.'
  );
  assert.equal(
    translations.en['error.TRIP_SESSION_LIMIT_REACHED'],
    'Guests can create up to 10 trips. Sign up to save more.'
  );

  for (const lang of ['vi', 'en']) {
    const t = (key) => translations[lang][key] ?? key;
    const message = translateApiError(
      t,
      new ApiError('TRIP_SESSION_LIMIT_REACHED', 'TRIP_SESSION_LIMIT_REACHED', 429)
    );
    assert.equal(message, translations[lang]['error.TRIP_SESSION_LIMIT_REACHED']);
    assert.notEqual(message, translations[lang]['error.default']);
  }
});
