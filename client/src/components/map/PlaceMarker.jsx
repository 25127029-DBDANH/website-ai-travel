import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * PlaceMarker.jsx — Renders a single numbered marker on a Mapbox GL map.
 * Author : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
 *
 * This component is designed to be used inside MapView when you need fine-grained
 * control over individual markers (e.g., in MiniMapCard or standalone place detail).
 *
 * Props:
 *  map         {mapboxgl.Map}  — the active Mapbox map instance
 *  latitude    {number}
 *  longitude   {number}
 *  number      {number}        — display label (1-based order index)
 *  color       {string}        — hex colour
 *  label       {string}        — popup content (place name)
 *  active      {boolean}       — whether this marker should appear highlighted
 *  onClick     {fn}            — callback when marker is clicked
 */

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

export default function PlaceMarker({
  map,
  latitude,
  longitude,
  number = 1,
  color,
  label = '',
  active = false,
  onClick,
}) {
  const markerRef = useRef(null);
  const resolvedColor = color || DEFAULT_COLORS[(number - 1) % DEFAULT_COLORS.length];

  useEffect(() => {
    if (!map || !latitude || !longitude) return;

    // Build DOM element
    const el = document.createElement('div');
    el.className = `map-marker${active ? ' map-marker--active' : ''}`;
    applyMarkerStyles(el, resolvedColor, active);

    const labelSpan = document.createElement('span');
    applyLabelStyles(labelSpan);
    labelSpan.textContent = String(number);
    el.appendChild(labelSpan);

    if (onClick) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', onClick);
    }

    const popup = new mapboxgl.Popup({ offset: 28, closeButton: false })
      .setHTML(`<span class="text-sm font-semibold">${label}</span>`);

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, latitude, longitude, number, resolvedColor, label]);

  // Update active state without re-creating the marker
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    if (active) {
      el.classList.add('map-marker--active');
      el.style.transform = 'rotate(-45deg) scale(1.3)';
      el.style.boxShadow = '0 4px 18px rgba(0,0,0,0.45)';
    } else {
      el.classList.remove('map-marker--active');
      el.style.transform = 'rotate(-45deg) scale(1)';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    }
  }, [active]);

  // This component renders nothing into the React tree — it manages a DOM node.
  return null;
}

// ── Style helpers ─────────────────────────────────────────────────────────

function applyMarkerStyles(el, color, active) {
  el.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg) scale(${active ? 1.3 : 1});
    background: ${color};
    border: 3px solid #fff;
    box-shadow: ${active ? '0 4px 18px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.3)'};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
}

function applyLabelStyles(el) {
  el.style.cssText = `
    transform: rotate(45deg);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    font-family: sans-serif;
    line-height: 1;
    pointer-events: none;
  `;
}
