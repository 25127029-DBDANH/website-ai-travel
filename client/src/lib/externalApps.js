export const GOOGLE_MAPS_LOGO = '/images/brands/google-maps.svg';

export const RIDE_APPS = [
  {
    id: 'grab',
    name: 'Grab',
    logo: '/images/brands/grab.svg',
    iosAppStoreId: '647268330',
    androidPackage: 'com.grabtaxi.passenger'
  },
  {
    id: 'xanhsm',
    name: 'Xanh SM',
    logo: '/images/brands/xanh-sm.svg',
    iosAppStoreId: '6446425595',
    androidPackage: 'com.gsm.customer'
  },
  {
    id: 'be',
    name: 'Be',
    logo: '/images/brands/be.png',
    iosAppStoreId: '1440565902',
    androidPackage: 'xyz.be.customer'
  }
];

const TRANSPORT_MODE_MAP = {
  walk: 'walking',
  public: 'transit',
  grab_car: 'driving',
  grab_bike: 'two-wheeler',
  walking: 'walking',
  transit: 'transit',
  driving: 'driving',
  'two-wheeler': 'two-wheeler',
  bicycling: 'bicycling'
};

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCoord(value, min, max) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
}

function resolveCoords(lat, lng) {
  const validLat = parseCoord(lat, -90, 90);
  const validLng = parseCoord(lng, -180, 180);
  if (validLat === null || validLng === null) return null;
  return { lat: validLat, lng: validLng };
}

function buildTextQuery(name, address) {
  return [cleanText(name), cleanText(address)].filter(Boolean).join(', ');
}

export function detectPlatform(userAgent = '', maxTouchPoints = 0) {
  const ua = typeof userAgent === 'string' ? userAgent.trim() : '';
  if (!ua) return 'other';

  const touchPoints = Number(maxTouchPoints) || 0;

  if (/android/i.test(ua)) {
    return 'android';
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return 'ios';
  }
  if (/macintosh|mac os x/i.test(ua)) {
    return touchPoints > 1 ? 'ios' : 'mac';
  }
  if (/windows|win32|win64/i.test(ua)) {
    return 'windows';
  }
  return 'other';
}

export function resolveTravelMode(transportMode) {
  const key = cleanText(transportMode).toLowerCase();
  return TRANSPORT_MODE_MAP[key] || 'driving';
}

export function googleMapsDirectionsUrl({ lat, lng, name, address, transportMode } = {}) {
  const coords = resolveCoords(lat, lng);
  const textQuery = buildTextQuery(name, address);

  let destination = '';
  if (coords) {
    destination = `${coords.lat},${coords.lng}`;
  } else if (textQuery) {
    destination = encodeURIComponent(textQuery);
  } else {
    return null;
  }

  const travelMode = resolveTravelMode(transportMode);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`;
}

export function googleMapsSearchUrl({ lat, lng, name, address } = {}) {
  const coords = resolveCoords(lat, lng);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }

  const textQuery = buildTextQuery(name, address);
  if (textQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(textQuery)}`;
  }

  return null;
}

export function findRideApp(appId) {
  const normalized = cleanText(appId).toLowerCase().replace(/[-_]/g, '');
  return RIDE_APPS.find((app) => app.id === normalized) || null;
}

export function iosAppStoreUrl(appOrId) {
  const app = typeof appOrId === 'string' ? findRideApp(appOrId) : appOrId;
  if (!app?.iosAppStoreId) return null;
  const numericId = String(app.iosAppStoreId).replace(/^id/i, '');
  return `https://apps.apple.com/app/id${numericId}`;
}

export function googlePlayStoreUrl(appOrId) {
  const app = typeof appOrId === 'string' ? findRideApp(appOrId) : appOrId;
  if (!app?.androidPackage) return null;
  return `https://play.google.com/store/apps/details?id=${app.androidPackage}`;
}

export function rideAppLaunchPlan(appId, platform) {
  const app = findRideApp(appId);
  if (!app) {
    return { kind: 'desktop', href: null };
  }

  if (platform === 'android') {
    const playUrl = googlePlayStoreUrl(app);
    return {
      kind: 'intent',
      href: `intent://#Intent;package=${app.androidPackage};S.browser_fallback_url=${encodeURIComponent(playUrl)};end`
    };
  }

  if (platform === 'ios') {
    return {
      kind: 'app-store',
      href: iosAppStoreUrl(app)
    };
  }

  return {
    kind: 'desktop',
    href: null
  };
}

export function rideDestinationText(stop) {
  if (!stop || typeof stop !== 'object') return '';
  const name = cleanText(stop.place_name || stop.nameVi || stop.name_vi || stop.name);
  const address = cleanText(stop.address);
  return [name, address].filter(Boolean).join(', ');
}
