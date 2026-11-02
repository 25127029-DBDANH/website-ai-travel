import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';
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

export default function TripMap({ stops = [], activeDay = 1, focusRequest = null, className }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
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
      scrollWheelZoom: false,
      zoomControl: true
    }).setView(HCMC_CENTER, 13);

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION
    }).addTo(map);

    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
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
      const icon = L.divIcon({
        className: 'trip-map-marker',
        html: `<span class="trip-map-pin">${order}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = L.marker(latlng, {
        icon,
        title: stop.place_name,
        alt: stop.place_name
      }).addTo(map);

      marker.on('click', () => {
        document
          .getElementById(`stop-${activeDay}-${order}`)
          ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      });
      markersRef.current.push({
        key: `${stop.day_number ?? activeDay}-${order}`,
        marker,
        latlng
      });
    }

    if (points.length > 1) {
      polylineRef.current = L.polyline(
        points.map(({ latlng }) => latlng),
        { className: 'route-draw', color: '#2563eb', weight: 3, opacity: 0.8 }
      ).addTo(map);
    }

    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }, [points, activeDay, collapsed, hasPoints, reduced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!focusRequest || collapsed || !map) return undefined;
    if (focusHandledRef.current === focusRequest.token) return undefined;

    const entry = markersRef.current.find(({ key }) => key === focusRequest.key);
    if (!entry) return undefined;

    // Panel có thể vừa hiện từ tab ẩn: Leaflet còn cache size 0 nên flyTo sẽ NaN.
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
    const timer = window.setTimeout(() => {
      pin?.classList.remove('trip-map-pin--active');
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [focusRequest, collapsed, reduced]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        'isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm',
        className
      )}
      aria-label={t('itinerary.map.title')}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <MapIcon className="h-3.5 w-3.5 text-brand-600" />
          {t('itinerary.map.title')}
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
            {t('itinerary.map.pins', { count: points.length })}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 transition-[transform,border-color,color] duration-200 ease-out-strong hover:border-slate-300 hover:text-slate-800 active:scale-[0.97]"
        >
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {collapsed ? t('itinerary.map.expand') : t('itinerary.map.collapse')}
        </button>
      </div>

      {!collapsed &&
        (points.length === 0 ? (
          <p className="border-t border-dashed border-slate-200 px-3 py-6 text-center text-[11px] font-semibold text-slate-500">
            {t('itinerary.map.empty')}
          </p>
        ) : (
          <div
            ref={containerRef}
            role="region"
            aria-label={t('itinerary.map.title')}
            className="h-40 w-full border-t border-slate-200 sm:h-56"
          />
        ))}
    </section>
  );
}
