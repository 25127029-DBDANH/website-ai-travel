const STORAGE_KEY = 'hcmc_session_id';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedSessionId = null;

function fallbackUuid() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getSessionId() {
  if (cachedSessionId) return cachedSessionId;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && UUID_V4.test(stored)) {
      cachedSessionId = stored;
      return cachedSessionId;
    }
  } catch {
    // Fall through to a fresh identifier.
  }

  cachedSessionId = globalThis.crypto?.randomUUID?.() || fallbackUuid();
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedSessionId);
  } catch {
    // Session still works for this page view.
  }
  return cachedSessionId;
}
