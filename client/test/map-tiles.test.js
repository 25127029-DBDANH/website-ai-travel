import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FAILOVER_ERROR_THRESHOLD,
  FAILOVER_TIMEOUT_MS,
  getTileProviders,
  nextProviderIndex,
  readSavedTileProvider,
  saveTileProvider,
  shouldFailover,
  TILE_PROVIDER_STORAGE_KEY,
  TILE_PROVIDERS
} from '../src/lib/mapTiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC_DIR = path.resolve(__dirname, '../src');

function collectSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

test('TILE_PROVIDERS: default order is Esri -> OSM -> OSM France with valid Esri {z}/{y}/{x} order', () => {
  assert.deepEqual(
    TILE_PROVIDERS.map((p) => p.id),
    ['esri', 'osm', 'osmfr']
  );

  const [esri, osm, osmfr] = TILE_PROVIDERS;
  assert.equal(
    esri.url,
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
  );
  assert.ok(esri.url.includes('{z}/{y}/{x}'), 'Esri URL must place {y} before {x}');
  assert.equal(esri.maxZoom, 19);
  assert.ok(esri.attribution.includes('Esri'));

  assert.equal(osm.url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.equal(osm.maxZoom, 19);
  assert.ok(osm.attribution.includes('https://www.openstreetmap.org/copyright'));

  assert.equal(osmfr.url, 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png');
  assert.equal(osmfr.subdomains, 'abc');
  assert.equal(osmfr.maxZoom, 19);
});

test('getTileProviders: handles absent/present VITE_MAP_TILE_URL and saved session provider priority', () => {
  const withoutCustom = getTileProviders();
  assert.deepEqual(
    withoutCustom.map((p) => p.id),
    ['esri', 'osm', 'osmfr']
  );

  const withBlankCustom = getTileProviders('   ');
  assert.deepEqual(
    withBlankCustom.map((p) => p.id),
    ['esri', 'osm', 'osmfr']
  );

  const customUrl = 'https://tiles.example.com/{z}/{x}/{y}.png';
  const withCustom = getTileProviders(customUrl);
  assert.deepEqual(
    withCustom.map((p) => p.id),
    ['custom', 'esri', 'osm', 'osmfr']
  );
  assert.equal(withCustom[0].url, customUrl);
  assert.equal(withCustom[0].subdomains, undefined);

  const customSubdomainUrl = 'https://{s}.tiles.example.com/{z}/{x}/{y}.png';
  const withCustomSubdomains = getTileProviders(customSubdomainUrl);
  assert.equal(withCustomSubdomains[0].subdomains, 'abc');

  const withPreferred = getTileProviders('', 'osm');
  assert.deepEqual(
    withPreferred.map((p) => p.id),
    ['osm', 'esri', 'osmfr']
  );

  // Unknown preferredId keeps default order
  assert.deepEqual(
    getTileProviders('', 'unknown-provider').map((p) => p.id),
    ['esri', 'osm', 'osmfr']
  );
});

test('shouldFailover: enforces error and timeout thresholds only when zero tiles loaded', () => {
  assert.equal(FAILOVER_ERROR_THRESHOLD, 4);
  assert.equal(FAILOVER_TIMEOUT_MS, 6000);

  // 3 errors -> false
  assert.equal(shouldFailover({ errors: 3, loaded: 0, elapsedMs: 1000 }), false);
  // 4 errors with 0 loaded -> true
  assert.equal(shouldFailover({ errors: 4, loaded: 0, elapsedMs: 1000 }), true);
  // 4 errors with 1 loaded -> false
  assert.equal(shouldFailover({ errors: 4, loaded: 1, elapsedMs: 1000 }), false);
  // 6000 ms with 0 loaded -> true
  assert.equal(shouldFailover({ errors: 0, loaded: 0, elapsedMs: 6000 }), true);
  // 5999 ms with 0 loaded & 0 errors -> false
  assert.equal(shouldFailover({ errors: 0, loaded: 0, elapsedMs: 5999 }), false);
  // 6000 ms with 1 loaded -> false
  assert.equal(shouldFailover({ errors: 0, loaded: 1, elapsedMs: 6000 }), false);
});

test('nextProviderIndex: steps sequentially and returns -1 when exhausted or invalid', () => {
  assert.equal(nextProviderIndex(0, 3), 1);
  assert.equal(nextProviderIndex(1, 3), 2);
  assert.equal(nextProviderIndex(2, 3), -1);
  assert.equal(nextProviderIndex(0, 1), -1);
  assert.equal(nextProviderIndex(-1, 3), -1);
  assert.equal(nextProviderIndex(0, 0), -1);
});

test('sessionStorage helpers read and persist provider id safely', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val))
  };

  assert.equal(readSavedTileProvider(mockStorage), null);
  saveTileProvider('esri', mockStorage);
  assert.equal(store.get(TILE_PROVIDER_STORAGE_KEY), 'esri');
  assert.equal(readSavedTileProvider(mockStorage), 'esri');

  const brokenStorage = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };
  assert.equal(readSavedTileProvider(brokenStorage), null);
  assert.doesNotThrow(() => saveTileProvider('osm', brokenStorage));
});

test('source scan: no cartocdn or openstreetmap.org/?mlat references exist in client/src', () => {
  const files = collectSourceFiles(CLIENT_SRC_DIR);
  assert.ok(files.length > 0);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(CLIENT_SRC_DIR, filePath);

    assert.equal(
      content.toLowerCase().includes('cartocdn'),
      false,
      `Forbidden CartoDB reference found in client/src/${rel}`
    );
    assert.equal(
      content.includes('openstreetmap.org/?mlat'),
      false,
      `Blocked openstreetmap.org/?mlat link found in client/src/${rel}`
    );
  }
});
