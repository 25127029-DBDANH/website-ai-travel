const TOKEN_KEY = 'hcmc_auth_token';
const SESSION_KEY = 'saigon_guide_session_id';

let memorySessionId = null;

function generateUuidV4() {
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getSessionId() {
  try {
    const storage = globalThis.localStorage;
    if (storage) {
      const existing = storage.getItem(SESSION_KEY);
      if (existing) return existing;
      const created = memorySessionId || generateUuidV4();
      try {
        storage.setItem(SESSION_KEY, created);
      } catch {
        memorySessionId = created;
      }
      return created;
    }
  } catch {
    // Storage unavailable or blocked; fall back to in-memory session ID.
  }
  if (!memorySessionId) {
    memorySessionId = generateUuidV4();
  }
  return memorySessionId;
}

export function getAuthToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Token only lives for this page view if storage is unavailable.
  }
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clean up.
  }
}
