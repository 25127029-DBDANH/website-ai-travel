import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  detectPlatform,
  GOOGLE_MAPS_LOGO,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  googlePlayStoreUrl,
  iosAppStoreUrl,
  RIDE_APPS,
  rideAppLaunchPlan,
  rideDestinationText
} from '../src/lib/externalApps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC_DIR = path.resolve(__dirname, '../src');
const CLIENT_PUBLIC_DIR = path.resolve(__dirname, '../public');

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

test('detectPlatform: handles iPhone, iPadOS 13+ (Mac UA + touch), Android, macOS, Windows, and empty strings', () => {
  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      5
    ),
    'ios'
  );

  // iPadOS 13+ sends Macintosh UA with maxTouchPoints > 1
  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      5
    ),
    'ios'
  );

  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
      5
    ),
    'android'
  );

  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      0
    ),
    'mac'
  );
  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      0
    ),
    'mac'
  );

  assert.equal(
    detectPlatform(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
      0
    ),
    'windows'
  );

  assert.equal(detectPlatform('', 0), 'other');
  assert.equal(detectPlatform('   ', 5), 'other');
  assert.equal(detectPlatform(null, 0), 'other');
  assert.equal(detectPlatform('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/124.0', 0), 'other');
});

test('googleMapsDirectionsUrl & googleMapsSearchUrl: coordinates, Vietnamese encoding, travelmode mapping, and invalid coord fallback', () => {
  assert.equal(
    googleMapsDirectionsUrl({
      lat: 10.777,
      lng: 106.6953,
      name: 'Dinh Độc Lập',
      transportMode: 'walk'
    }),
    'https://www.google.com/maps/dir/?api=1&destination=10.777,106.6953&travelmode=walking'
  );

  assert.equal(
    googleMapsDirectionsUrl({
      lat: 10.777,
      lng: 106.6953,
      transportMode: 'public'
    }),
    'https://www.google.com/maps/dir/?api=1&destination=10.777,106.6953&travelmode=transit'
  );

  assert.equal(
    googleMapsDirectionsUrl({
      lat: 10.777,
      lng: 106.6953,
      transportMode: 'grab_car'
    }),
    'https://www.google.com/maps/dir/?api=1&destination=10.777,106.6953&travelmode=driving'
  );

  assert.equal(
    googleMapsDirectionsUrl({
      lat: 10.777,
      lng: 106.6953,
      transportMode: 'grab_bike'
    }),
    'https://www.google.com/maps/dir/?api=1&destination=10.777,106.6953&travelmode=two-wheeler'
  );

  // Missing coordinates -> encodes Vietnamese name + address
  const expectedEncoded = encodeURIComponent('Nhà thờ Đức Bà, 01 Công xã Paris, Quận 1');
  assert.equal(
    googleMapsDirectionsUrl({
      name: 'Nhà thờ Đức Bà',
      address: '01 Công xã Paris, Quận 1',
      transportMode: 'walk'
    }),
    `https://www.google.com/maps/dir/?api=1&destination=${expectedEncoded}&travelmode=walking`
  );

  // Out-of-range / invalid coordinates -> falls back to encoded text
  assert.equal(
    googleMapsDirectionsUrl({
      lat: 95,
      lng: 200,
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi, Quận 1',
      transportMode: 'grab_car'
    }),
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Chợ Bến Thành, Lê Lợi, Quận 1')}&travelmode=driving`
  );

  assert.equal(googleMapsDirectionsUrl({}), null);

  // googleMapsSearchUrl
  assert.equal(
    googleMapsSearchUrl({ lat: 10.7798, lng: 106.699, name: 'Nhà thờ Đức Bà' }),
    'https://www.google.com/maps/search/?api=1&query=10.7798,106.699'
  );
  assert.equal(
    googleMapsSearchUrl({ lat: 'invalid', lng: null, name: 'Bưu điện Trung tâm Sài Gòn', address: 'Quận 1' }),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Bưu điện Trung tâm Sài Gòn, Quận 1')}`
  );
  assert.equal(googleMapsSearchUrl({ lat: -99, lng: 106.7 }), null);
});

test('RIDE_APPS & rideAppLaunchPlan: official store IDs, Android intent with encoded Play fallback, iOS App Store, and desktop no-scheme', () => {
  assert.equal(RIDE_APPS.length, 3);

  for (const app of RIDE_APPS) {
    assert.ok(app.id && app.name && app.logo && app.iosAppStoreId && app.androidPackage);
    const logoDiskPath = path.join(CLIENT_PUBLIC_DIR, app.logo.replace(/^\//, ''));
    assert.ok(fs.existsSync(logoDiskPath), `Missing brand logo on disk: ${logoDiskPath}`);
  }
  assert.ok(fs.existsSync(path.join(CLIENT_PUBLIC_DIR, GOOGLE_MAPS_LOGO.replace(/^\//, ''))));

  // Android intent plans
  const grabAndroid = rideAppLaunchPlan('grab', 'android');
  assert.equal(grabAndroid.kind, 'intent');
  assert.ok(grabAndroid.href.startsWith('intent://#Intent;package=com.grabtaxi.passenger;'));
  assert.ok(
    grabAndroid.href.includes(
      `S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.grabtaxi.passenger')};end`
    )
  );

  const xanhAndroid = rideAppLaunchPlan('xanhsm', 'android');
  assert.ok(xanhAndroid.href.includes('package=com.gsm.customer;'));
  assert.ok(xanhAndroid.href.includes(encodeURIComponent(googlePlayStoreUrl('xanhsm'))));

  const beAndroid = rideAppLaunchPlan('be', 'android');
  assert.ok(beAndroid.href.includes('package=xyz.be.customer;'));
  assert.ok(beAndroid.href.includes(encodeURIComponent(googlePlayStoreUrl('be'))));

  // iOS App Store plans
  assert.deepEqual(rideAppLaunchPlan('grab', 'ios'), {
    kind: 'app-store',
    href: 'https://apps.apple.com/app/id647268330'
  });
  assert.deepEqual(rideAppLaunchPlan('xanhsm', 'ios'), {
    kind: 'app-store',
    href: 'https://apps.apple.com/app/id6446425595'
  });
  assert.deepEqual(rideAppLaunchPlan('be', 'ios'), {
    kind: 'app-store',
    href: 'https://apps.apple.com/app/id1440565902'
  });
  assert.equal(iosAppStoreUrl('grab'), 'https://apps.apple.com/app/id647268330');

  // Desktop platforms never return custom schemes
  for (const desktopPlatform of ['mac', 'windows', 'other']) {
    for (const app of RIDE_APPS) {
      const plan = rideAppLaunchPlan(app.id, desktopPlatform);
      assert.equal(plan.kind, 'desktop');
      assert.equal(plan.href, null);
    }
  }
});

test('rideDestinationText: formats place name and address cleanly for clipboard copy', () => {
  assert.equal(
    rideDestinationText({
      place_name: 'Dinh Độc Lập',
      address: '135 Nam Kỳ Khởi Nghĩa, Quận 1'
    }),
    'Dinh Độc Lập, 135 Nam Kỳ Khởi Nghĩa, Quận 1'
  );
  assert.equal(rideDestinationText({ name: 'Chợ Bến Thành' }), 'Chợ Bến Thành');
  assert.equal(rideDestinationText({ address: '02 Công xã Paris, Quận 1' }), '02 Công xã Paris, Quận 1');
  assert.equal(rideDestinationText(null), '');
});

test('source scan: no unofficial ride schemes, popup-blocked setTimeout window.open, or fabricated promo copy remain in client/src', () => {
  const files = collectSourceFiles(CLIENT_SRC_DIR);
  assert.ok(files.length > 0);

  const forbiddenSubstrings = [
    'xanhsm://',
    'be://',
    'r.grab.com',
    'grab://open',
    'openGrabTransport',
    'openRideApp',
    'Ưu đãi đặc biệt giảm 20%',
    'Nhiều mã giảm giá',
    'đón nhanh trong 2-3 phút',
    'Nhiều voucher'
  ];

  const timeoutPopupRegex = /setTimeout\s*\([\s\S]{0,400}?window\.open\s*\(/;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(CLIENT_SRC_DIR, filePath);

    for (const token of forbiddenSubstrings) {
      assert.equal(
        content.includes(token),
        false,
        `Forbidden string "${token}" found in client/src/${rel}`
      );
    }

    assert.equal(
      timeoutPopupRegex.test(content),
      false,
      `Popup-blocked window.open inside setTimeout found in client/src/${rel}`
    );

    assert.equal(
      content.includes('window.open('),
      false,
      `Unexpected window.open() call found in client/src/${rel} (use <a href> instead)`
    );
  }
});
