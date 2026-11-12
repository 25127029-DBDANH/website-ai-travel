import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, Map as MapIcon, Maximize2, Navigation } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
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

export default function TripMap({
  stops = [],
  activeDay = 1,
  focusRequest = null,
  onOpenDetail,
  isPanelMode = false,
  className
}) {
  const { lang, t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const boundsRef = useRef(null);
  const focusHandledRef = useRef(null);

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
    if (collapsed || !hasPoints || !containerRef.current) return undefined;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true
    }).setView(HCMC_CENTER, 13);

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION
    }).addTo(map);

    mapRef.current = map;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    observer.observe(containerRef.current);

    return () => {
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
      const visitedBadge = isVisited ? `<span style="background:#059669;color:#fff;border-radius:4px;padding:1px 5px;font-size:9.5px;font-weight:800;margin-left:4px;">ĐÃ ĐI QUA ✓</span>` : '';
      const popupHtml = `
        <div style="font-family: inherit; min-width: 170px; padding: 2px;">
          <div style="font-size: 10px; font-weight: 700; color: #f59e0b; text-transform: uppercase;">Chặng ${order} · ${stop.time_slot || ''} ${visitedBadge}</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 2px 0 4px;">${stop.place_name}</div>
          <div style="font-size: 11px; color: #64748b;">${stop.district || 'TP.HCM'} · <strong style="color: #2563eb;">${costStr}</strong></div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        document
          .getElementById(`stop-${activeDay}-${order}`)
          ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        
        if (onOpenDetail) {
          onOpenDetail(stop);
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
        { className: 'route-draw', color: '#2563eb', weight: 4, opacity: 0.85, dashArray: '6, 8' }
      ).addTo(map);
    }

    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [points, activeDay, collapsed, hasPoints, reduced, lang, onOpenDetail]);

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
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-100 text-brand-600">
            <MapIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-extrabold text-slate-800">
            {lang === 'vi' ? `Khung 1: Bản đồ Ngày ${activeDay}` : `Day ${activeDay} Map`}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold text-brand-700 ring-1 ring-brand-200">
            {points.length} {lang === 'vi' ? 'điểm đến' : 'stops'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasPoints && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-bold text-slate-600 hover:border-brand-300 hover:text-brand-700"
              title="Căn chỉnh toàn cảnh các điểm trong ngày"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">{lang === 'vi' ? 'Toàn cảnh' : 'Fit'}</span>
            </button>
          )}

          {!isPanelMode && (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-bold text-slate-500 hover:text-slate-800"
            >
              {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Container Leaflet */}
      {!collapsed &&
        (points.length === 0 ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-xs text-slate-400">
            {t('itinerary.map.empty')}
          </div>
        ) : (
          <div
            ref={containerRef}
            role="region"
            aria-label={t('itinerary.map.title')}
            className={cn(
              'w-full transition-all duration-300',
              isPanelMode ? 'flex-1 min-h-[340px] h-full' : 'h-48 sm:h-60'
            )}
          />
        ))}
    </section>
  );
}
