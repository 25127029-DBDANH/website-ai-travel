import { Check, Copy, ExternalLink, MapPin, Smartphone, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { api, isBackendEnabled } from '../../lib/api.js';
import {
  detectPlatform,
  GOOGLE_MAPS_LOGO,
  googleMapsDirectionsUrl,
  googlePlayStoreUrl,
  iosAppStoreUrl,
  RIDE_APPS,
  rideAppLaunchPlan,
  rideDestinationText
} from '../../lib/externalApps.js';
import { formatVnd } from '../../lib/format.js';

function resolveValidCoords(point) {
  if (!point || typeof point !== 'object') return null;
  const rawLat = point.latitude ?? point.lat;
  const rawLng = point.longitude ?? point.lng;
  if (
    rawLat === null ||
    rawLat === undefined ||
    rawLat === '' ||
    typeof rawLat === 'boolean' ||
    rawLng === null ||
    rawLng === undefined ||
    rawLng === '' ||
    typeof rawLng === 'boolean'
  ) {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Màu lấy đúng từ file logo chính hãng (client/public/images/brands/*): Grab #00B14F,
// Xanh SM #28BDBF, Be #0A60B0. Màu chữ chọn theo tương phản WCAG AA ≥ 4.5:1
// (chữ trắng trên Grab/Xanh SM chỉ đạt 2.84 / 2.30 nên dùng chữ đậm #0F172A).
const BRAND_STYLES = {
  grab: {
    border: 'border-[#00B14F]/50',
    bg: 'bg-[#00B14F]/10',
    btn: 'bg-[#00B14F] text-slate-900 hover:brightness-95'
  },
  xanhsm: {
    border: 'border-[#28BDBF]/60',
    bg: 'bg-[#28BDBF]/10',
    btn: 'bg-[#28BDBF] text-slate-900 hover:brightness-95'
  },
  be: {
    border: 'border-[#0A60B0]/50',
    bg: 'bg-[#0A60B0]/10',
    btn: 'bg-[#0A60B0] text-white hover:brightness-110'
  }
};

export default function RidePickerModal({
  stop,
  originStop = null,
  isOpen,
  onClose,
  transportMode,
  platformOverride
}) {
  const { lang, t } = useI18n();
  const titleId = useId();
  const [selectedService, setSelectedService] = useState('grab');
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copied' | 'manual'
  const [estimateState, setEstimateState] = useState({ status: 'idle', data: null });
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const manualInputRef = useRef(null);

  const platform = useMemo(() => {
    if (platformOverride) return platformOverride;
    return detectPlatform(
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
      typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0
    );
  }, [platformOverride]);

  const stopKey = `${stop?.place_id || stop?.place_name || ''}-${stop?.address || ''}`;
  const originKey = `${originStop?.place_id || originStop?.place_name || ''}-${originStop?.latitude ?? ''},${originStop?.longitude ?? ''}`;
  const active = Boolean(isOpen && stop);

  useEffect(() => {
    setCopyState('idle');
  }, [isOpen, stopKey]);

  useEffect(() => {
    if (!active) {
      setEstimateState({ status: 'idle', data: null });
      return;
    }

    const originCoords = resolveValidCoords(originStop);
    const destCoords = resolveValidCoords(stop);
    const samePoint =
      originCoords &&
      destCoords &&
      Math.abs(originCoords.lat - destCoords.lat) < 1e-6 &&
      Math.abs(originCoords.lng - destCoords.lng) < 1e-6;

    if (!originCoords || !destCoords || samePoint) {
      setEstimateState({ status: 'unavailable', data: null });
      return;
    }

    if (typeof api.estimateTransit !== 'function') {
      setEstimateState({ status: 'unavailable', data: null });
      return;
    }

    let cancelled = false;
    setEstimateState({ status: 'loading', data: null });

    api
      .estimateTransit({
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destLat: destCoords.lat,
        destLng: destCoords.lng,
        isRaining: Boolean(stop.transit_info?.is_rain_mode)
      })
      .then((res) => {
        if (cancelled) return;
        if (res && Number.isFinite(Number(res.distance_km))) {
          setEstimateState({ status: 'ready', data: res });
        } else {
          setEstimateState({ status: 'error', data: null });
        }
      })
      .catch(() => {
        if (!cancelled) setEstimateState({ status: 'error', data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [active, stopKey, originKey, isBackendEnabled()]);

  useFocusTrap({
    active,
    containerRef: panelRef,
    onClose,
    initialFocusRef: closeBtnRef
  });

  useEffect(() => {
    if (copyState === 'manual' && manualInputRef.current) {
      manualInputRef.current.focus();
      manualInputRef.current.select();
    }
  }, [copyState]);

  if (!active) return null;

  const estimateData = estimateState.status === 'ready' ? estimateState.data : null;
  const hasEstimate = Boolean(estimateData);
  const estimatedFare = estimateData?.estimated_fare_vnd;
  const estimatedMin = estimateData?.duration_min;
  const distanceKm = estimateData?.distance_km;
  const providerById = new Map(
    (estimateData?.providers || []).map((p) => [p.id, p])
  );

  const destinationText = rideDestinationText(stop);
  const selectedApp = RIDE_APPS.find((app) => app.id === selectedService) || RIDE_APPS[0];
  const selectedPlan = rideAppLaunchPlan(selectedApp.id, platform);
  const isDesktop = selectedPlan.kind === 'desktop';

  const directionsUrl = googleMapsDirectionsUrl({
    lat: stop.latitude ?? stop.lat,
    lng: stop.longitude ?? stop.lng,
    name: stop.place_name || stop.name,
    address: stop.address,
    transportMode: transportMode || stop.transit_info?.mode
  });

  const copyDestinationInClick = () => {
    if (!destinationText) return;
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      try {
        navigator.clipboard
          .writeText(destinationText)
          .then(() => {
            setCopyState('copied');
          })
          .catch(() => {
            setCopyState('manual');
          });
      } catch {
        setCopyState('manual');
      }
    } else {
      setCopyState('manual');
    }
  };

  const formattedFare = hasEstimate ? formatVnd(estimatedFare, lang) : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="modal-panel relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-soft outline-none sm:p-6"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 pr-10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="font-display text-base font-extrabold text-slate-900 sm:text-lg">
              {t('ride.modalTitle')}
            </h3>
            <p className="text-xs text-slate-600">{t('ride.modalSubtitle')}</p>
          </div>
        </div>

        {/* Thông tin điểm đến & Ước tính cước của ứng dụng */}
        <div className="mt-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-600">
                {t('ride.destinationLabel')}
              </span>
              <p
                title={stop.place_name || stop.name}
                className="truncate font-display text-sm font-bold text-slate-900"
              >
                {stop.place_name || stop.name}
              </p>
              {stop.address ? (
                <p title={stop.address} className="line-clamp-1 text-xs text-slate-600">
                  {stop.address}
                </p>
              ) : null}
            </div>
          </div>

          {hasEstimate ? (
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-slate-700">
              <span className="tabular-nums">
                {t('ride.tripEstimateMeta', { km: distanceKm, min: estimatedMin })}
              </span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                {lang === 'vi' ? `Giá ước tính: ~${formattedFare}` : t('ride.estimatedFare', { fare: formattedFare })}
              </span>
            </div>
          ) : null}
        </div>

        {/* Toast sao chép thành công */}
        {copyState === 'copied' ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-900"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>{t('ride.copiedToast')}</span>
          </div>
        ) : null}

        {/* Ô chọn & sao chép thủ công khi Clipboard API lỗi / không khả dụng */}
        {copyState === 'manual' && destinationText ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
          >
            <label htmlFor="ride-manual-copy-input" className="block font-semibold">
              {t('ride.manualCopyHint')}
            </label>
            <input
              id="ride-manual-copy-input"
              ref={manualInputRef}
              type="text"
              readOnly
              value={destinationText}
              aria-label={t('ride.manualCopyLabel')}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.target.select()}
              className="mt-1.5 w-full select-all rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-slate-900 outline-none focus:border-brand-500"
            />
          </div>
        ) : null}

        {/* 3 LỰA CHỌN: GRAB · XANH SM · BE */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-bold text-slate-600">{t('ride.selectProvider')}</p>

          {RIDE_APPS.map((app) => {
            const isSelected = selectedService === app.id;
            const style = BRAND_STYLES[app.id] || BRAND_STYLES.grab;
            const plan = rideAppLaunchPlan(app.id, platform);
            const live = providerById.get(app.id);

            return (
              <div
                key={app.id}
                className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors ${
                  isSelected
                    ? `${style.border} ${style.bg}`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedService(app.id)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-2 py-1.5">
                      <img
                        src={app.logo}
                        alt={app.name}
                        width="80"
                        height="28"
                        decoding="async"
                        className="h-6 max-w-full object-contain sm:h-7"
                      />
                    </span>

                    <span className="min-w-0">
                      <span className="block font-display text-sm font-bold text-slate-900">{app.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {t(`ride.vehicles.${app.id}`)}
                      </span>
                      {live ? (
                        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                          {live.bike_type}: ~{formatVnd(live.bike_fare_vnd, lang)} · {live.car_type}: ~
                          {formatVnd(live.car_fare_vnd, lang)}{' '}
                          <span className="font-sans font-normal text-slate-600">
                            ({lang === 'vi' ? 'Giá ước tính' : t('ride.estimatedBadge')})
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {plan.kind === 'desktop' || !plan.href ? (
                    <span
                      aria-hidden="true"
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>

                {plan.kind !== 'desktop' && plan.href ? (
                  <a
                    href={plan.href}
                    rel="noopener noreferrer"
                    onClick={() => {
                      setSelectedService(app.id);
                      copyDestinationInClick();
                    }}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-[filter,transform] active:scale-95 ${style.btn}`}
                  >
                    <span>{t('ride.openApp', { name: app.name })}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Khối hướng dẫn riêng cho Desktop (macOS / Windows / Linux) */}
        {isDesktop ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-bold text-slate-900 sm:text-sm">
                  {t('ride.desktopOnlyTitle')}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {t('ride.desktopOnlyBody', { name: selectedApp.name })}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyDestinationInClick}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98]"
              >
                {copyState === 'copied' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                )}
                <span>
                  {copyState === 'copied' ? t('ride.copiedShort') : t('ride.copyDestination')}
                </span>
              </button>

              <a
                href={iosAppStoreUrl(selectedApp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <span>
                  {selectedApp.name} · {t('ride.appStore')}
                </span>
                <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden="true" />
              </a>

              <a
                href={googlePlayStoreUrl(selectedApp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                <span>
                  {selectedApp.name} · {t('ride.googlePlay')}
                </span>
                <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden="true" />
              </a>

              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#1A73E8] shadow-sm transition-colors hover:border-[#1A73E8]/50 hover:bg-[#1A73E8]/5 active:scale-[0.98]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white p-0.5">
                    <img
                      src={GOOGLE_MAPS_LOGO}
                      alt=""
                      aria-hidden="true"
                      className="h-3.5 w-3.5 object-contain"
                    />
                  </span>
                  <span>{t('ride.googleMapsDirections')}</span>
                  <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Nút hành động cuối modal */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-4 !py-2 text-xs"
          >
            {t('common.close')}
          </button>

          {!isDesktop && selectedPlan.href ? (
            <a
              href={selectedPlan.href}
              rel="noopener noreferrer"
              onClick={copyDestinationInClick}
              className="btn-primary !px-5 !py-2 text-xs"
            >
              <span>{t('ride.openApp', { name: selectedApp.name })}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
