export const TILE_PROVIDER_STORAGE_KEY = 'saigon_map_tile_provider';
export const FAILOVER_ERROR_THRESHOLD = 4;
export const FAILOVER_TIMEOUT_MS = 6000;

export const TILE_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution:
      'Tiles &copy; Esri — Source: Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
  }),
  Object.freeze({
    id: 'osm',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }),
  Object.freeze({
    id: 'osmfr',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.fr/">OpenStreetMap France</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })
]);

export function getTileProviders(customTileUrl = '', preferredId = null) {
  const trimmed = typeof customTileUrl === 'string' ? customTileUrl.trim() : '';
  let list;

  if (!trimmed) {
    list = [...TILE_PROVIDERS];
  } else {
    const existing = TILE_PROVIDERS.find((provider) => provider.url === trimmed);
    if (existing) {
      list = [existing, ...TILE_PROVIDERS.filter((provider) => provider.id !== existing.id)];
    } else {
      const customProvider = {
        id: 'custom',
        url: trimmed,
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      };
      if (trimmed.includes('{s}')) {
        customProvider.subdomains = 'abc';
      }
      list = [customProvider, ...TILE_PROVIDERS];
    }
  }

  if (typeof preferredId === 'string' && preferredId) {
    const preferredIndex = list.findIndex((provider) => provider.id === preferredId);
    if (preferredIndex > 0) {
      return [
        list[preferredIndex],
        ...list.slice(0, preferredIndex),
        ...list.slice(preferredIndex + 1)
      ];
    }
  }

  return list;
}

export function shouldFailover({ errors = 0, loaded = 0, elapsedMs = 0 } = {}) {
  if (loaded > 0) return false;
  return errors >= FAILOVER_ERROR_THRESHOLD || elapsedMs >= FAILOVER_TIMEOUT_MS;
}

export function nextProviderIndex(current, total) {
  if (!Number.isInteger(current) || !Number.isInteger(total) || current < 0 || total <= 0) {
    return -1;
  }
  const next = current + 1;
  return next < total ? next : -1;
}

export function readSavedTileProvider(storage) {
  try {
    const target = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    return target?.getItem(TILE_PROVIDER_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveTileProvider(providerId, storage) {
  if (!providerId) return;
  try {
    const target = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    target?.setItem(TILE_PROVIDER_STORAGE_KEY, providerId);
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}
