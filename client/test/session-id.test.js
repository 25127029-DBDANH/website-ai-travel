import test from 'node:test';
import assert from 'node:assert/strict';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_KEY = 'saigon_guide_session_id';

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
const { api, setUseBackend } = await import('../src/lib/api.js');

test('getSessionId returns a valid UUID v4 and reuses the same value', () => {
  globalThis.localStorage.clear();

  const first = getSessionId();
  assert.match(first, UUID_V4_RE);
  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), first);

  const second = getSessionId();
  assert.equal(second, first);
});

test('getSessionId falls back to an in-memory UUID v4 when localStorage throws', () => {
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error('Storage disabled');
    },
    setItem() {
      throw new Error('Storage disabled');
    },
    removeItem() {
      throw new Error('Storage disabled');
    },
  };

  try {
    const first = getSessionId();
    assert.match(first, UUID_V4_RE);
    const second = getSessionId();
    assert.equal(second, first);
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test('request sends x-session-id on /api/v1/trips and /api/v1/auth/ but not /api/v1/places or AI', async () => {
  globalThis.localStorage.clear();
  setUseBackend(true);

  const expectedSessionId = getSessionId();
  const captured = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  globalThis.fetch = async (url, options = {}) => {
    captured.push({ url, headers: options.headers || {} });
    if (String(url).includes('/api/v1/trips/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ trip: { id: 'trip-123', title: 'Test' }, itinerary_items: [] }),
      };
    }
    if (String(url).includes('/api/v1/auth/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 'user-1', username: 'tester' } }),
      };
    }
    if (String(url).includes('/api/v1/places/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ total: 0, results: [] }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ summary: 'ok' }),
    };
  };

  try {
    // 1. /api/v1/trips/... without token -> has x-session-id
    await api.getTrip('trip-123');
    const tripCall = captured.at(-1);
    assert.ok(tripCall.url.endsWith('/api/v1/trips/trip-123'));
    assert.equal(tripCall.headers['x-session-id'], expectedSessionId);

    // 2. /api/v1/auth/... with token -> still has x-session-id alongside Authorization
    globalThis.window = { localStorage: globalThis.localStorage };
    globalThis.localStorage.setItem('hcmc_auth_token', 'jwt-test-token');
    await api.getMe();
    const authCall = captured.at(-1);
    assert.ok(authCall.url.endsWith('/api/v1/auth/me'));
    assert.equal(authCall.headers['Authorization'], 'Bearer jwt-test-token');
    assert.equal(authCall.headers['x-session-id'], expectedSessionId);

    // 3. /api/v1/places/... -> NO x-session-id
    await api.searchPlaces({ q: 'Dinh', limit: 5 });
    const placesCall = captured.at(-1);
    assert.ok(placesCall.url.includes('/api/v1/places/search'));
    assert.equal(placesCall.headers['x-session-id'], undefined);
    assert.equal('x-session-id' in placesCall.headers, false);

    // 4. AI endpoint via postAiRequest -> NO x-session-id
    await api.suggestTripConcept({ days: 2 });
    const aiCall = captured.at(-1);
    assert.ok(aiCall.url.endsWith('/api/v1/ai/concept'));
    assert.equal(aiCall.headers['x-session-id'], undefined);
    assert.equal('x-session-id' in aiCall.headers, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
    setUseBackend(null);
  }
});
