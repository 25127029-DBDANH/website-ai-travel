import { useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * useMap.js — Custom hook for controlling the Mapbox GL map instance.
 * Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
 *
 * Features:
 *  - Stores a ref to the mapboxgl.Map instance.
 *  - Provides flyTo / fitBounds helpers.
 *  - Manages marker registry (place_id → marker) for programmatic control.
 *  - Exposes a callback to sync map → timeline scroll (two-way binding).
 */

// TP.HCM city center default coordinates
export const HCMC_CENTER = { lng: 106.6297, lat: 10.8231 };
export const HCMC_DEFAULT_ZOOM = 12;

export function useMap() {
  /** @type {React.MutableRefObject<mapboxgl.Map | null>} */
  const mapRef = useRef(null);

  /** Registry: placeId (string) → mapboxgl.Marker */
  const markersRef = useRef(/** @type {Map<string, mapboxgl.Marker>} */ (new Map()));

  /** Currently highlighted marker id */
  const [activeMarkerId, setActiveMarkerId] = useState(null);

  /**
   * Called by MapView once the map has loaded.
   * @param {mapboxgl.Map} mapInstance
   */
  const registerMap = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
  }, []);

  /**
   * Smoothly fly the camera to a place.
   * @param {{ lat: number, lng: number }} coords
   * @param {number} [zoom]
   */
  const flyToPlace = useCallback((coords, zoom = 15) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [coords.lng, coords.lat],
      zoom,
      speed: 1.4,
      curve: 1.2,
      easing: (t) => t,
    });
  }, []);

  /**
   * Fit map bounds to show all activity coordinates in a day.
   * @param {Array<{ latitude: number, longitude: number }>} activities
   */
  const fitToActivities = useCallback((activities) => {
    if (!mapRef.current || !activities.length) return;
    const bounds = new mapboxgl.LngLatBounds();
    activities.forEach((a) => {
      if (a.longitude && a.latitude) {
        bounds.extend([a.longitude, a.latitude]);
      }
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1200 });
    }
  }, []);

  /**
   * Register a marker in the internal registry.
   * @param {string} placeId
   * @param {mapboxgl.Marker} marker
   */
  const addMarker = useCallback((placeId, marker) => {
    markersRef.current.set(placeId, marker);
  }, []);

  /**
   * Remove and clear all markers from the map & registry.
   */
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    setActiveMarkerId(null);
  }, []);

  /**
   * Highlight a marker (scale up) and dim others.
   * @param {string} placeId
   */
  const highlightMarker = useCallback((placeId) => {
    setActiveMarkerId(placeId);
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === placeId) {
        el.classList.add('map-marker--active');
      } else {
        el.classList.remove('map-marker--active');
      }
    });
  }, []);

  return {
    mapRef,
    registerMap,
    flyToPlace,
    fitToActivities,
    addMarker,
    clearMarkers,
    highlightMarker,
    activeMarkerId,
  };
}
