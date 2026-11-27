import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, ChevronDown, ChevronUp, Map as MapIcon, Maximize2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import {
  FAILOVER_TIMEOUT_MS,
  getTileProviders,
  nextProviderIndex,
  readSavedTileProvider,
  saveTileProvider,
  shouldFailover
} from '../../lib/mapTiles.js';

const HCMC_CENTER = [10.7769, 106.7009];

function validCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function toLatLng(stop) {
  const latitude = validCoordinate(stop.latitude, -90, 90);
  const longitude = validCoordinate(stop.longitude, -180, 180);
  return latitude === null || longitude === null ? null : [latitude, longitude];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function TripMap({
  stops = [],
  activeDay = 1,
  focusRequest = null,
  onOpenDetail,
  trafficMode = false,
  isPanelMode = false,
  className
}) {
  const { lang, t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const boundsRef = useRef(null);
  const focusHandledRef = useRef(null);
  const onOpenDetailRef = useRef(onOpenDetail);

  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);

  const points = useMemo(
    () =>
      stops
        .map((stop, index) => ({ stop, latlng: toLatLng(stop), index }))
        .filter((entry) => entry.latlng),
    [stops]
  );
  const hasPoints = points.length > 0;

  useEffect(() => {
    if (focusRequest) setCollapsed(false);
  }, [focusRequest]);

  useEffect(() => {
    if (collapsed || !hasPoints || !containerRef.current) {
      setTilesUnavailable(false);
      return undefined;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true
    }).setView(HCMC_CENTER, 13);

    const providers = getTileProviders(
      import.meta.env.VITE_MAP_TILE_URL,
      readSavedTileProvider()
    );

    let disposed = false;
    let currentLayer = null;
    let currentListeners = null;
    let failoverTimer = null;

    setTilesUnavailable(false);

    const clearFailoverTimer = () => {
      if (failoverTimer !== null) {
        window.clearTimeout(failoverTimer);
        failoverTimer = null;
      }
    };

    const detachCurrentLayer = () => {
      clearFailoverTimer();
      if (currentLayer) {
        if (currentListeners) {
          currentLayer.off('tileload', currentListeners.onTileLoad);
          currentLayer.off('tileerror', currentListeners.onTileError);
          currentListeners = null;
        }
        if (map.hasLayer(currentLayer)) {
          map.removeLayer(currentLayer);
        }
        currentLayer = null;
      }
    };

    const mountProvider = (index) => {
      if (disposed) return;
      detachCurrentLayer();

      const provider = providers[index];
      if (!provider) {
        setTilesUnavailable(true);
        return;
      }

      let errors = 0;
      let loaded = 0;
      let switched = false;
      const startedAt = Date.now();

      const options = {
        maxZoom: provider.maxZoom ?? 19,
        attribution: provider.attribution
      };
      if (provider.subdomains) {
        options.subdomains = provider.subdomains;
      }

      const layer = L.tileLayer(provider.url, options);
      currentLayer = layer;

      const advanceProvider = () => {
        if (disposed || switched || currentLayer !== layer) return;
        switched = true;
        const nextIndex = nextProviderIndex(index, providers.length);
        if (nextIndex === -1) {
          detachCurrentLayer();
          setTilesUnavailable(true);
        } else {
          mountProvider(nextIndex);
        }
      };

      const onTileLoad = () => {
        if (disposed || currentLayer !== layer) return;
        loaded += 1;
        if (loaded === 1) {
          clearFailoverTimer();
          setTilesUnavailable(false);
          saveTileProvider(provider.id);
        }
      };

      const onTileError = () => {
        if (disposed || switched || currentLayer !== layer) return;
        errors += 1;
        const elapsedMs = Date.now() - startedAt;
        if (shouldFailover({ errors, loaded, elapsedMs })) {
          advanceProvider();
        }
      };

      currentListeners = { onTileLoad, onTileError };
      layer.on('tileload', onTileLoad);
      layer.on('tileerror', onTileError);
      layer.addTo(map);

      failoverTimer = window.setTimeout(() => {
        if (disposed || switched || currentLayer !== layer) return;
        const elapsedMs = Math.max(FAILOVER_TIMEOUT_MS, Date.now() - startedAt);
        if (shouldFailover({ errors, loaded, elapsedMs })) {
          advanceProvider();
        }
      }, FAILOVER_TIMEOUT_MS);
    };

    mountProvider(0);

    mapRef.current = map;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    observer.observe(containerRef.current);

    return () => {
      disposed = true;
      detachCurrentLayer();
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      polylineRef.current = null;
    };
  }, [collapsed, hasPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || collapsed) return;

    for (const entry of markersRef.current) entry.marker.remove();
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (points.length === 0) {
      map.setView(HCMC_CENTER, 13);
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const { stop, latlng, index } of points) {
      bounds.extend(latlng);
      const order = stop.order_index ?? index + 1;
      const isAccepted = Boolean(stop.is_accepted);
      const isVisited = Boolean(stop.visited);
      
      const pinContent = isVisited 
        ? '<span style="font-weight:900;font-size:15px;line-height:1;">✓</span>' 
        : order;

      const pinClasses = isVisited
        ? '!bg-emerald-600 !border-white !text-white ring-2 ring-emerald-300 shadow-md shadow-emerald-500/40'
        : (isAccepted ? '!bg-emerald-600 !border-white !text-white' : '');

      const icon = L.divIcon({
        className: 'trip-map-marker',
        html: `<span class="trip-map-pin ${pinClasses}" title="${isVisited ? 'Đã đi qua chặng này ✓' : `Chặng ${order}`}">${pinContent}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const marker = L.marker(latlng, {
        icon,
        title: `${order}. ${stop.place_name}`,
        alt: stop.place_name
      }).addTo(map);

      // Popup thông tin nhanh khi click marker
      const costStr = stop.estimated_cost > 0 ? `${Number(stop.estimated_cost).toLocaleString('vi-VN')} đ` : (lang === 'vi' ? 'Miễn phí' : 'Free');
      const visitedBadge = isVisited ? `<span style="background:#059669;color:#fff;border-radius:4px;padding:1px 5px;font-size:9.5px;font-weight:700;margin-left:4px;">Đã đến</span>` : '';
      const safeName = escapeHtml(stop.place_name);
      const safeDistrict = escapeHtml(stop.district || 'TP.HCM');
      const safeSlot = escapeHtml(stop.time_slot || '');
      const popupHtml = `
        <div style="font-family: inherit; min-width: 170px; padding: 2px;">
          <div style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Điểm ${order} · ${safeSlot} ${visitedBadge}</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 2px 0 4px;">${safeName}</div>
          <div style="font-size: 11px; color: #475569;">${safeDistrict} · <strong style="color: #2563eb;">${escapeHtml(costStr)}</strong></div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        document
          .getElementById(`stop-${activeDay}-${order}`)
          ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        
        if (onOpenDetailRef.current) {
          onOpenDetailRef.current(stop);
        }
      });

      markersRef.current.push({
        key: `${stop.day_number ?? activeDay}-${order}`,
        marker,
        latlng
      });
    }

    boundsRef.current = bounds;

    if (points.length > 1) {
      polylineRef.current = L.polyline(
        points.map(({ latlng }) => latlng),
        {
          className: trafficMode ? 'route-draw-traffic' : 'route-draw',
          color: trafficMode ? '#ea580c' : '#2563eb',
          weight: trafficMode ? 5 : 4,
          opacity: 0.9,
          dashArray: trafficMode ? '8, 6' : '6, 8'
        }
      ).addTo(map);

      if (trafficMode) {
        polylineRef.current.bindPopup(
          `<div style="font-size:12px;font-weight:700;color:#ea580c;padding:2px;">Giờ cao điểm (17h–19h)<br><span style="color:#64748b;font-weight:500;">Đã cộng thêm 20 phút dự phòng kẹt xe</span></div>`
        );
      }
    }

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [points, activeDay, collapsed, hasPoints, reduced, lang, trafficMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!focusRequest || collapsed || !map) return undefined;
    if (focusHandledRef.current === focusRequest.token) return undefined;

    const entry = markersRef.current.find(({ key }) => key === focusRequest.key);
    if (!entry) return undefined;

    map.invalidateSize();
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return undefined;

    focusHandledRef.current = focusRequest.token;
    sectionRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    if (reduced) {
      map.setView(entry.latlng, Math.max(map.getZoom(), 15));
    } else {
      map.flyTo(entry.latlng, Math.max(map.getZoom(), 15), { duration: 0.6 });
    }

    const pin = entry.marker.getElement()?.querySelector('.trip-map-pin');
    pin?.classList.add('trip-map-pin--active');
    entry.marker.openPopup();

    const timer = window.setTimeout(() => {
      pin?.classList.remove('trip-map-pin--active');
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [focusRequest, collapsed, reduced]);

  const handleResetZoom = () => {
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { padding: [36, 36], maxZoom: 15 });
    }
  };

  return (
    <section
      ref={sectionRef}
      className={cn(
        'isolate flex flex-col overflow-hidden bg-white',
        isPanelMode ? 'h-full w-full' : 'rounded-2xl border border-slate-200/80 shadow-sm',
        className
      )}
      aria-label={t('itinerary.map.title')}
    >
      {/* Header bản đồ */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-900">
            {lang === 'vi' ? `Bản đồ Ngày ${activeDay}` : `Day ${activeDay} Map`}
          </span>
          <span className="text-xs tabular-nums text-slate-600">
            · {points.length} {lang === 'vi' ? 'điểm' : 'stops'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasPoints && (
            <button
              type="button"
              onClick={handleResetZoom}
              aria-label={lang === 'vi' ? 'Xem toàn bộ các điểm trong ngày' : 'Fit all stops'}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              title={lang === 'vi' ? 'Xem toàn bộ các điểm trong ngày' : 'Fit all stops'}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{lang === 'vi' ? 'Toàn cảnh' : 'Fit'}</span>
            </button>
          )}

          {!isPanelMode && (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? t('itinerary.map.expand') : t('itinerary.map.collapse')}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* Container Leaflet */}
      {!collapsed &&
        (points.length === 0 ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-xs text-slate-600">
            {t('itinerary.map.empty')}
          </div>
        ) : (
          <div className="relative flex-1 w-full h-full">
            {trafficMode && (
              <div className="pointer-events-none absolute left-2 top-2 z-[400] flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'vi' ? 'Giờ cao điểm (+20 phút)' : 'Rush hour (+20m)'}</span>
              </div>
            )}
            <div
              ref={containerRef}
              role="region"
              aria-label={t('itinerary.map.title')}
              className={cn(
                'w-full',
                isPanelMode ? 'flex-1 min-h-[340px] h-full' : 'h-48 sm:h-60'
              )}
            />
            {tilesUnavailable && (
              <div
                role="status"
                className="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[calc(100%-1rem)]"
              >
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>{t('itinerary.map.tilesUnavailable')}</span>
                </div>
              </div>
            )}
          </div>
        ))}
    </section>
  );
}
