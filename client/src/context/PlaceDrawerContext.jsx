import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import PlaceDrawer from '../components/place/PlaceDrawer.jsx';
import { api } from '../lib/api.js';
import {
  mergePlace,
  namesMatch,
  normalizePlace,
  pickNearby
} from '../lib/placeDetail.js';

const PlaceDrawerContext = createContext(null);

function findExactMatchByName(queryName, results) {
  if (!queryName || !Array.isArray(results)) return null;
  return (
    results.find(
      (candidate) =>
        namesMatch(queryName, candidate?.name_vi) ||
        namesMatch(queryName, candidate?.name) ||
        namesMatch(queryName, candidate?.place_name)
    ) || null
  );
}

function buildEntry({ entryKey, id, seed, rawStop, actions }) {
  const normalizedSeed = seed ? normalizePlace(seed) : null;
  const resolvedId =
    id !== null && id !== undefined && String(id).trim() !== ''
      ? String(id).trim()
      : normalizedSeed?.id || null;

  return {
    entryKey,
    id: resolvedId,
    seed: normalizedSeed,
    rawStop: rawStop || null,
    detail: null,
    place: normalizedSeed,
    loadingDetail: Boolean(resolvedId || normalizedSeed?.name || normalizedSeed?.nameVi),
    fetchedDetail: false,
    detailError: false,
    notFound: false,
    nearby: [],
    loadingNearby: false,
    fetchedNearby: false,
    actions: actions || null
  };
}

export function PlaceDrawerProvider({ children }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stack, setStack] = useState([]);
  const entrySeqRef = useRef(0);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const urlSyncedIdRef = useRef(null);
  const lastPathnameRef = useRef(location.pathname);

  const urlPlaceId = searchParams.get('place');
  const currentEntry = stack.length > 0 ? stack[stack.length - 1] : null;
  const isOpen = stack.length > 0;

  const setPlaceParam = useCallback(
    (nextId, { replace = false } = {}) => {
      setSearchParams(
        (prev) => {
          const current = prev.get('place');
          if (nextId) {
            if (current === nextId) return prev;
            const next = new URLSearchParams(prev);
            next.set('place', nextId);
            return next;
          }
          if (!prev.has('place')) return prev;
          const next = new URLSearchParams(prev);
          next.delete('place');
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const openPlace = useCallback(
    ({ id, seed, actions } = {}) => {
      const entryKey = ++entrySeqRef.current;
      const entry = buildEntry({
        entryKey,
        id,
        seed,
        rawStop: actions?.stop || seed || null,
        actions: actions || null
      });
      setStack([entry]);
      if (entry.id) {
        urlSyncedIdRef.current = entry.id;
        setPlaceParam(entry.id, { replace: false });
      } else {
        urlSyncedIdRef.current = null;
        setPlaceParam(null, { replace: true });
      }
    },
    [setPlaceParam]
  );

  const selectNearby = useCallback(
    (nearbyPlace) => {
      if (!nearbyPlace) return;
      const entryKey = ++entrySeqRef.current;
      const entry = buildEntry({
        entryKey,
        id: nearbyPlace.id,
        seed: nearbyPlace,
        rawStop: null,
        actions: null
      });
      setStack((prev) => [...prev, entry]);
      if (entry.id) {
        urlSyncedIdRef.current = entry.id;
        setPlaceParam(entry.id, { replace: true });
      } else {
        urlSyncedIdRef.current = null;
        setPlaceParam(null, { replace: true });
      }
    },
    [setPlaceParam]
  );

  const goBack = useCallback(() => {
    const prevStack = stackRef.current;
    if (prevStack.length <= 1) return;
    const nextStack = prevStack.slice(0, -1);
    const prevTop = nextStack[nextStack.length - 1];
    setStack(nextStack);
    if (prevTop?.id) {
      urlSyncedIdRef.current = prevTop.id;
      setPlaceParam(prevTop.id, { replace: true });
    } else {
      urlSyncedIdRef.current = null;
      setPlaceParam(null, { replace: true });
    }
  }, [setPlaceParam]);

  const closePlace = useCallback(() => {
    urlSyncedIdRef.current = null;
    setStack([]);
    setPlaceParam(null, { replace: true });
  }, [setPlaceParam]);

  const syncStopItems = useCallback((items, buildActions) => {
    if (!Array.isArray(items) || items.length === 0) return;
    if (!stackRef.current.some((entry) => entry.actions?.stop)) return;

    setStack((prev) => {
      let changed = false;
      const next = prev.map((entry) => {
        const currentStop = entry.actions?.stop;
        if (!currentStop) return entry;
        const updated = items.find(
          (it) =>
            it.day_number === currentStop.day_number &&
            it.order_index === currentStop.order_index
        );
        if (!updated) return entry;
        changed = true;
        const normalizedSeed = normalizePlace(updated);
        const merged = entry.detail ? mergePlace(normalizedSeed, entry.detail) : normalizedSeed;
        return {
          ...entry,
          seed: normalizedSeed,
          rawStop: updated,
          place: merged,
          actions: buildActions(updated)
        };
      });
      return changed ? next : prev;
    });
  }, []);

  // Close drawer cleanly when navigating to a different route without a ?place= query
  useEffect(() => {
    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname;
      if (!searchParams.get('place') && stackRef.current.length > 0) {
        urlSyncedIdRef.current = null;
        setStack([]);
      }
    }
  }, [location.pathname, searchParams]);

  // Sync URL ?place=<id> -> drawer state (deep links + browser Back/Forward)
  useEffect(() => {
    if (urlPlaceId) {
      if (urlPlaceId === urlSyncedIdRef.current) return;
      urlSyncedIdRef.current = urlPlaceId;

      const existingIdx = stackRef.current.findIndex((item) => item.id === urlPlaceId);
      if (existingIdx !== -1) {
        setStack((prev) => prev.slice(0, existingIdx + 1));
        return;
      }

      const entryKey = ++entrySeqRef.current;
      const entry = buildEntry({
        entryKey,
        id: urlPlaceId,
        seed: null,
        rawStop: null,
        actions: null
      });
      setStack([entry]);
    } else if (urlSyncedIdRef.current !== null) {
      urlSyncedIdRef.current = null;
      setStack([]);
    }
  }, [urlPlaceId]);

  const activeEntryKey = currentEntry?.entryKey ?? null;
  const activeFetchedDetail = currentEntry?.fetchedDetail ?? true;

  // Fetch place detail enrichment for the active entry
  useEffect(() => {
    if (!activeEntryKey || activeFetchedDetail) return undefined;
    const entry = stackRef.current.find((item) => item.entryKey === activeEntryKey);
    if (!entry) return undefined;

    const queryName = entry.seed?.nameVi || entry.seed?.name || '';
    if (!entry.id && !queryName) {
      setStack((prev) =>
        prev.map((item) =>
          item.entryKey === activeEntryKey
            ? { ...item, loadingDetail: false, fetchedDetail: true }
            : item
        )
      );
      return undefined;
    }

    let cancelled = false;

    const patchEntry = (patch) => {
      if (cancelled) return;
      setStack((prev) =>
        prev.map((item) => {
          if (item.entryKey !== activeEntryKey) return item;
          const nextDetail = 'detail' in patch ? patch.detail : item.detail;
          const nextPlace = nextDetail
            ? mergePlace(item.seed, nextDetail)
            : item.place;
          return {
            ...item,
            ...patch,
            place: nextPlace
          };
        })
      );
    };

    const run = async () => {
      try {
        if (entry.id) {
          let detail = null;
          let wasNotFound = false;
          try {
            detail = await api.getPlaceDetail(entry.id);
            if (!detail) wasNotFound = true;
          } catch (err) {
            if (err?.status === 404) {
              wasNotFound = true;
            } else {
              throw err;
            }
          }

          if (detail) {
            patchEntry({
              detail,
              loadingDetail: false,
              fetchedDetail: true,
              detailError: false,
              notFound: false
            });
            return;
          }

          // If backend returned 404 for a local id (or local mode missed it), try exact name match
          if (wasNotFound && queryName) {
            try {
              const res = await api.searchPlaces({ q: queryName, limit: 5 });
              const matched = findExactMatchByName(queryName, res?.results);
              patchEntry({
                detail: matched,
                loadingDetail: false,
                fetchedDetail: true,
                detailError: false,
                notFound: false
              });
              return;
            } catch {
              patchEntry({
                loadingDetail: false,
                fetchedDetail: true,
                detailError: false,
                notFound: false
              });
              return;
            }
          }

          patchEntry({
            loadingDetail: false,
            fetchedDetail: true,
            detailError: false,
            notFound: !entry.seed
          });
          return;
        }

        // No id -> search by exact normalized name
        const res = await api.searchPlaces({ q: queryName, limit: 5 });
        const matched = findExactMatchByName(queryName, res?.results);
        patchEntry({
          detail: matched,
          loadingDetail: false,
          fetchedDetail: true,
          detailError: false,
          notFound: false
        });
      } catch {
        patchEntry({
          loadingDetail: false,
          fetchedDetail: true,
          detailError: true,
          notFound: !entry.seed
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeEntryKey, activeFetchedDetail]);

  const activeLat = currentEntry?.place?.lat ?? null;
  const activeLng = currentEntry?.place?.lng ?? null;
  const activePlaceId = currentEntry?.place?.id ?? null;
  const activeFetchedNearby = currentEntry?.fetchedNearby ?? true;

  // Fetch nearby places within 1.5 km once coordinates are available
  useEffect(() => {
    if (!activeEntryKey || activeFetchedNearby || activeLat === null || activeLng === null) {
      return undefined;
    }

    let cancelled = false;

    setStack((prev) =>
      prev.map((item) =>
        item.entryKey === activeEntryKey ? { ...item, loadingNearby: true } : item
      )
    );

    const run = async () => {
      try {
        const res = await api.getNearbyPlaces({
          lat: activeLat,
          lng: activeLng,
          radius_km: 1.5,
          limit: 50
        });
        if (cancelled) return;
        const entry = stackRef.current.find((item) => item.entryKey === activeEntryKey);
        const origin = entry?.place || { id: activePlaceId, lat: activeLat, lng: activeLng };
        const picked = pickNearby(origin, res?.results || [], {
          radiusKm: 1.5,
          limit: 4,
          excludeId: origin.id
        });
        setStack((prev) =>
          prev.map((item) =>
            item.entryKey === activeEntryKey
              ? { ...item, nearby: picked, loadingNearby: false, fetchedNearby: true }
              : item
          )
        );
      } catch {
        if (cancelled) return;
        setStack((prev) =>
          prev.map((item) =>
            item.entryKey === activeEntryKey
              ? { ...item, nearby: [], loadingNearby: false, fetchedNearby: true }
              : item
          )
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeEntryKey, activeFetchedNearby, activeLat, activeLng, activePlaceId]);

  const value = useMemo(
    () => ({
      openPlace,
      closePlace,
      syncStopItems,
      isOpen,
      currentEntry
    }),
    [openPlace, closePlace, syncStopItems, isOpen, currentEntry]
  );

  return (
    <PlaceDrawerContext.Provider value={value}>
      {children}
      <PlaceDrawer
        isOpen={isOpen}
        entry={currentEntry}
        canGoBack={stack.length > 1}
        onBack={goBack}
        onClose={closePlace}
        onSelectNearby={selectNearby}
      />
    </PlaceDrawerContext.Provider>
  );
}

export function useOpenPlace() {
  const context = useContext(PlaceDrawerContext);
  if (!context) throw new Error('useOpenPlace must be used inside PlaceDrawerProvider');
  return context.openPlace;
}

export function usePlaceDrawer() {
  const context = useContext(PlaceDrawerContext);
  if (!context) throw new Error('usePlaceDrawer must be used inside PlaceDrawerProvider');
  return context;
}
