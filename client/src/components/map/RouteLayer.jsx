import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * RouteLayer.jsx — Draws a dashed polyline connecting trip activity coordinates.
 * Author : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
 *
 * This component is a "behaviour component" — it manages a Mapbox GL source
 * + layer and returns null from React.  Include it inside the same component
 * tree that owns the mapboxgl.Map instance.
 *
 * Props:
 *  map         {mapboxgl.Map}   — active Mapbox GL map instance
 *  activities  {Array}          — ordered list of trip_activity objects
 *                                 Each must have: place_latitude, place_longitude
 *  color       {string}         — line colour (default: #3B82F6 blue)
 *  dashed      {boolean}        — draw as dashed line (default: true)
 *  visible     {boolean}        — show/hide the route (default: true)
 */

const SOURCE_ID = 'route-source';
const LAYER_ID  = 'route-layer';

export default function RouteLayer({
  map,
  activities = [],
  color = '#3B82F6',
  dashed = true,
  visible = true,
}) {
  const initialised = useRef(false);

  // ── One-time setup: add source + layer when map is ready ─────────────────
  useEffect(() => {
    if (!map || initialised.current) return;

    const setup = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: buildGeoJSON([]),
        });
      }

      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': color,
            'line-width': 3,
            'line-opacity': 0.75,
            ...(dashed ? { 'line-dasharray': [2, 2] } : {}),
          },
        });
      }

      initialised.current = true;
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.once('load', setup);
    }

    return () => {
      // Cleanup on unmount
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      initialised.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Update route data whenever activities list changes ───────────────────
  useEffect(() => {
    if (!map || !initialised.current) return;

    const updateData = () => {
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(buildGeoJSON(activities));
      }
    };

    if (map.isStyleLoaded() && map.getSource(SOURCE_ID)) {
      updateData();
    } else {
      map.once('load', updateData);
    }
  }, [map, activities]);

  // ── Toggle visibility ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !initialised.current) return;
    const visibility = visible ? 'visible' : 'none';
    if (map.getLayer(LAYER_ID)) {
      map.setLayoutProperty(LAYER_ID, 'visibility', visibility);
    }
  }, [map, visible]);

  // ── Update colour ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !initialised.current) return;
    if (map.getLayer(LAYER_ID)) {
      map.setPaintProperty(LAYER_ID, 'line-color', color);
    }
  }, [map, color]);

  return null; // purely imperative — no DOM output
}

// ── Helper ─────────────────────────────────────────────────────────────────

/**
 * Converts an ordered list of activities into a GeoJSON LineString.
 */
function buildGeoJSON(activities) {
  const coords = activities
    .filter((a) => a.place_latitude && a.place_longitude)
    .map((a) => [a.place_longitude, a.place_latitude]);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
  };
}
