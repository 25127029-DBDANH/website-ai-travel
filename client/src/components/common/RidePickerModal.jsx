import {
  Bike,
  Car,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Navigation,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { formatVnd } from '../../lib/format.js';

export const RIDE_SERVICES = [
  {
    id: 'grab',
    name: 'Grab',
    title: 'Grab (GrabBike / GrabCar)',
    description: 'Ứng dụng gọi xe phổ biến nhất, đón nhanh trong 2-3 phút.',
    colorText: 'text-emerald-700',
    colorBorder: 'border-emerald-300',
    colorBg: 'bg-emerald-50',
    colorBtn: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'Phổ biến nhất',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    vehicles: ['GrabBike', 'GrabCar 4-7 chỗ'],
    promoText: 'Nhiều mã giảm giá cho khách du lịch'
  },
  {
    id: 'xanhsm',
    name: 'Xanh SM',
    title: 'Xanh SM (Xe điện VinFast)',
    description: '100% taxi & xe máy điện VinFast êm ái, không mùi xăng, bảo vệ môi trường.',
    colorText: 'text-teal-700',
    colorBorder: 'border-teal-300',
    colorBg: 'bg-teal-50',
    colorBtn: 'bg-teal-600 hover:bg-teal-700',
    badge: 'Xe điện êm ái',
    badgeClass: 'bg-teal-100 text-teal-800',
    vehicles: ['Xanh SM Bike', 'Taxi điện VinFast VF5 / VF8'],
    promoText: 'Ưu đãi đặc biệt giảm 20% tuyến trung tâm Sài Gòn'
  },
  {
    id: 'be',
    name: 'Be',
    title: 'Be (BeBike / BeCar)',
    description: 'Nền tảng đặt xe Việt Nam với giá cước cạnh tranh và nhiều ưu đãi.',
    colorText: 'text-amber-800',
    colorBorder: 'border-amber-300',
    colorBg: 'bg-amber-50',
    colorBtn: 'bg-amber-600 hover:bg-amber-700',
    badge: 'Cước phí tiết kiệm',
    badgeClass: 'bg-amber-100 text-amber-900',
    vehicles: ['beBike', 'beCar 4-7 chỗ'],
    promoText: 'Nhiều voucher giờ cao điểm Sài Gòn'
  }
];

export function openRideApp(serviceId, stop) {
  if (!stop) return;
  const name = stop.place_name || 'Điểm đến TP.HCM';
  const addr = stop.address || 'TP. Hồ Chí Minh';
  const lat = Number(stop.latitude) || 10.7769;
  const lng = Number(stop.longitude) || 106.7009;
  const encName = encodeURIComponent(name);
  const encAddr = encodeURIComponent(addr);

  if (serviceId === 'grab') {
    const appUrl = `grab://open?screenType=BOOKING&dropoffLatitude=${lat}&dropoffLongitude=${lng}&dropoffName=${encName}&dropoffAddress=${encAddr}`;
    const webFallback = `https://r.grab.com/transport?dropoff_lat=${lat}&dropoff_lng=${lng}&dropoff_name=${encName}`;
    window.location.href = appUrl;
    setTimeout(() => {
      window.open(webFallback, '_blank');
    }, 1200);
  } else if (serviceId === 'xanhsm') {
    const appUrl = `xanhsm://booking?lat=${lat}&lng=${lng}&destination=${encName}`;
    const webFallback = `https://www.xanhsm.com/`;
    window.location.href = appUrl;
    setTimeout(() => {
      window.open(webFallback, '_blank');
    }, 1200);
  } else if (serviceId === 'be') {
    const appUrl = `be://booking?destination_lat=${lat}&destination_lng=${lng}&destination_name=${encName}`;
    const webFallback = `https://be.com.vn/`;
    window.location.href = appUrl;
    setTimeout(() => {
      window.open(webFallback, '_blank');
    }, 1200);
  }
}

export default function RidePickerModal({
  stop,
  isOpen,
  onClose
}) {
  const { lang } = useI18n();
  const [selectedService, setSelectedService] = useState('grab');
  const [openingToast, setOpeningToast] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !stop) return null;

  const estimatedFare = stop.transit_info?.estimated_fare_vnd || 25000;
  const estimatedMin = stop.transit_info?.duration_min || 15;
  const distanceKm = stop.transit_info?.distance_km || 1.2;

  const handleLaunchRide = (serviceId) => {
    const serv = RIDE_SERVICES.find((s) => s.id === serviceId) || RIDE_SERVICES[0];
    setOpeningToast(`Đang kết nối ứng dụng ${serv.name} với điểm đến "${stop.place_name}"...`);
    openRideApp(serviceId, stop);
    setTimeout(() => {
      setOpeningToast(null);
      onClose();
    }, 2200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scale-up"
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-600 text-white shadow-sm">
            <Bike className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900">
              {lang === 'vi' ? 'Chọn ứng dụng đặt xe di chuyển' : 'Choose Ride Service'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'vi' ? 'Hỗ trợ 3 ứng dụng gọi xe phổ biến nhất tại TP.HCM' : 'Pick from the 3 most popular ride apps in Saigon'}
            </p>
          </div>
        </div>

        {/* Thông tin điểm đến & Ước tính cước */}
        <div className="mt-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {lang === 'vi' ? 'Điểm đến dự kiến' : 'Destination'}
              </span>
              <p className="truncate font-display text-sm font-extrabold text-slate-900">
                {stop.place_name}
              </p>
              {stop.address && (
                <p className="line-clamp-1 text-[11px] text-slate-500">
                  {stop.address}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[11.5px] font-bold text-slate-700">
            <span>Lộ trình dự tính: ~{distanceKm} km · ~{estimatedMin} phút</span>
            <span className="font-mono font-extrabold text-emerald-700">
              Cước ước tính: ~{formatVnd(estimatedFare, lang)}
            </span>
          </div>
        </div>

        {openingToast && (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-900 animate-fade-in">
            🚀 {openingToast}
          </div>
        )}

        {/* 3 LỰA CHỌN: GRAB - XANH SM - BE */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {lang === 'vi' ? 'Bấm vào ứng dụng bạn muốn sử dụng:' : 'Select ride-hailing app:'}
          </p>

          {RIDE_SERVICES.map((serv) => {
            const isSelected = selectedService === serv.id;
            return (
              <div
                key={serv.id}
                onClick={() => setSelectedService(serv.id)}
                className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
                  isSelected
                    ? `${serv.colorBorder} ${serv.colorBg} ring-2 ring-emerald-300/60 shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Icon ứng dụng */}
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-xs ${
                      serv.id === 'grab'
                        ? 'bg-emerald-600'
                        : serv.id === 'xanhsm'
                        ? 'bg-teal-600'
                        : 'bg-amber-500'
                    }`}
                  >
                    {serv.id === 'xanhsm' ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Bike className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-extrabold text-slate-900">
                        {serv.title}
                      </h4>
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${serv.badgeClass}`}>
                        {serv.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                      {serv.description}
                    </p>
                    <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">
                      ⚡ {serv.promoText}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchRide(serv.id);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold text-white shadow-xs transition-all active:scale-95 ${serv.colorBtn}`}
                >
                  <span>Mở {serv.name}</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Nút hành động chính */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>

          <button
            type="button"
            onClick={() => handleLaunchRide(selectedService)}
            className="btn-primary !py-2 !px-5 text-xs font-extrabold shadow-sm"
          >
            <span>
              {lang === 'vi'
                ? `Mở ngay ${RIDE_SERVICES.find((s) => s.id === selectedService)?.name}`
                : `Launch ${selectedService}`}
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
