import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { HCMC_CENTER, HCMC_DEFAULT_ZOOM } from '../../hooks/useMap';

/**
 * MapView.jsx — Interactive Mapbox GL map for HCMC trip itineraries.
 * Author : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
 *
 * Props:
 *  activities  {Array}    — list of trip_activity objects for the selected day
 *  onMarkerClick {fn}     — callback(activity) when a marker is clicked
 *  registerMap {fn}       — receives the mapboxgl.Map instance via useMap hook
 *  addMarker   {fn}       — registers each marker in the parent hook registry
 *  clearMarkers {fn}      — clears all markers before re-rendering
 *  style       {string}   — Mapbox style URL (defaults to streets-v12)
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Colour palette for numbered markers (cycles if > 10 activities)
const MARKER_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F59E0B',
];

export default function MapView({
  activities = [],
  onMarkerClick,
  registerMap,
  addMarker,
  clearMarkers,
  style = 'mapbox://styles/mapbox/streets-v12',
}) {
  const containerRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayerId = 'route-layer';
  const routeSourceId = 'route-source';
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState(style);

  // ── Initialise map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapInstance.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [HCMC_CENTER.lng, HCMC_CENTER.lat],
      zoom: HCMC_DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      setMapLoaded(true);
      // Add empty GeoJSON source for the polyline route
      map.addSource(routeSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: routeLayerId,
        type: 'line',
        source: routeSourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#3B82F6',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.75,
        },
      });
    });

    mapInstance.current = map;
    if (registerMap) registerMap(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers and route when activities change ───────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current) return;
    const map = mapInstance.current;

    // Clear previous markers
    if (clearMarkers) clearMarkers();

    const validActivities = activities.filter(
      (a) => a.place_latitude && a.place_longitude,
    );

    // Draw numbered markers
    validActivities.forEach((activity, idx) => {
      const color = MARKER_COLORS[idx % MARKER_COLORS.length];
      const el = createMarkerElement(idx + 1, color);

      el.addEventListener('click', () => {
        if (onMarkerClick) onMarkerClick(activity);
        // Scroll timeline card into view
        const card = document.getElementById(`activity-card-${activity.id}`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([activity.place_longitude, activity.place_latitude])
        .setPopup(buildSafePopup(activity))
        .addTo(map);

      if (addMarker) addMarker(String(activity.id), marker);
    });

    // Draw polyline route between stops
    if (map.getSource(routeSourceId)) {
      const coords = validActivities.map((a) => [a.place_longitude, a.place_latitude]);
      map.getSource(routeSourceId).setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
      });
    }

    // Auto-fit bounds
    if (validActivities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validActivities.forEach((a) => bounds.extend([a.place_longitude, a.place_latitude]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
    }
  }, [activities, mapLoaded, clearMarkers, addMarker, onMarkerClick]);

  // ── Style switcher ────────────────────────────────────────────────────────
  const handleStyleSwitch = (newStyle) => {
    if (!mapInstance.current) return;
    setMapStyle(newStyle);
    mapInstance.current.setStyle(newStyle);
    // Re-add route source/layer after style change
    mapInstance.current.once('style.load', () => {
      if (!mapInstance.current.getSource(routeSourceId)) {
        mapInstance.current.addSource(routeSourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        mapInstance.current.addLayer({
          id: routeLayerId,
          type: 'line',
          source: routeSourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 3,
            'line-dasharray': [2, 2],
            'line-opacity': 0.75,
          },
        });
      }
    });
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Style switcher toolbar */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-white/90 backdrop-blur rounded-xl shadow px-2 py-1">
        <StyleButton
          label="Đường phố"
          active={mapStyle.includes('streets')}
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/streets-v12')}
        />
        <StyleButton
          label="Vệ tinh"
          active={mapStyle.includes('satellite')}
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/satellite-streets-v12')}
        />
        <StyleButton
          label="Tối giản"
          active={mapStyle.includes('light')}
          onClick={() => handleStyleSwitch('mapbox://styles/mapbox/light-v11')}
        />
      </div>

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm bg-white/80 rounded-xl px-4 py-2 shadow">
            🗺️ Chọn một ngày để xem lộ trình trên bản đồ
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * [Security] Build a Mapbox popup using DOM text nodes instead of setHTML()
 * to prevent XSS.  place_name, start_time, end_time are set via
 * textContent — never interpolated as raw HTML.
 *
 * @param {object} activity — trip_activity object
 * @returns {mapboxgl.Popup}
 */
function buildSafePopup(activity) {
  const container = document.createElement('div');

  const nameEl = document.createElement('div');
  nameEl.className = 'text-sm font-semibold';
  nameEl.textContent = activity.place_name ?? '';   // ← textContent, not innerHTML

  const timeEl = document.createElement('div');
  timeEl.className = 'text-xs text-gray-500';
  // Compose time range safely — no interpolation into HTML
  const dash = document.createTextNode(` \u2013 `);
  const startNode = document.createTextNode(activity.start_time ?? '');
  const endNode   = document.createTextNode(activity.end_time   ?? '');
  timeEl.appendChild(startNode);
  timeEl.appendChild(dash);
  timeEl.appendChild(endNode);

  container.appendChild(nameEl);
  container.appendChild(timeEl);

  return new mapboxgl.Popup({ offset: 25, closeButton: false })
    .setDOMContent(container);
}

/**
 * Creates a DOM element for a numbered map marker.
 * @param {number} number   — display index (1-based)
 * @param {string} color    — hex colour string
 */
function createMarkerElement(number, color) {
  const el = document.createElement('div');
  el.className = 'map-marker';
  el.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${color};
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  const label = document.createElement('span');
  label.style.cssText = `
    transform: rotate(45deg);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    font-family: sans-serif;
    line-height: 1;
  `;
  label.textContent = String(number);
  el.appendChild(label);

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'rotate(-45deg) scale(1.25)';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
  });
  el.addEventListener('mouseleave', () => {
    if (!el.classList.contains('map-marker--active')) {
      el.style.transform = 'rotate(-45deg) scale(1)';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    }
  });

  return el;
}

function StyleButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
