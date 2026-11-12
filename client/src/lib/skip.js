const PREFIX = 'hcmc_skip:';
const DAY_MS = 24 * 60 * 60 * 1000;

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function writeRecord(key, record, storage) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(`${PREFIX}${key}`, JSON.stringify(record));
  } catch {
    // Storage may be unavailable in private contexts.
  }
}

export function isSkipped(key, { storage, now = Date.now() } = {}) {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    const raw = target.getItem(`${PREFIX}${key}`);
    if (!raw) return false;
    const record = JSON.parse(raw);
    if (record?.forever) return true;
    return Number(record?.until) > now;
  } catch {
    return false;
  }
}

export function skipForNow(key, days = 7, { storage, now = Date.now() } = {}) {
  writeRecord(key, { until: now + Math.max(1, days) * DAY_MS, forever: false }, storage);
}

export function skipForever(key, { storage } = {}) {
  writeRecord(key, { until: null, forever: true }, storage);
}

export function clearSkip(key, { storage } = {}) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(`${PREFIX}${key}`);
  } catch {
    // Ignore storage failures.
  }
}
