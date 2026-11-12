import {
  Award,
  Calendar,
  Camera,
  Check,
  Copy,
  Download,
  Flame,
  Heart,
  MapPin,
  Share2,
  Sparkles,
  Utensils,
  Wallet,
  X
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { formatVnd } from '../../lib/format.js';

export default function TripRecapModal({ trip, items = [], onClose }) {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const dayCount = Number(trip?.days) || 1;
  const placeCount = items.length;
  const totalCost = items.reduce((sum, it) => sum + Number(it.estimated_cost || 0), 0);
  const foodCount = items.filter((it) => it.category === 'food' || it.category === 'cafe').length;

  // Ưu tiên hiển thị chính các bức ảnh check-in do người dùng chụp thực tế!
  const userCheckinPhotos = items.filter((it) => it.checkin_photo).map((it) => it.checkin_photo);
  const catalogPhotos = items.filter((it) => it.photo_url).map((it) => assetUrl(it.photo_url));
  const topPhotos = [...userCheckinPhotos, ...catalogPhotos].slice(0, 4);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCard = () => {
    setDownloading(true);
    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `recap-saigon-${trip?.id || 'chuyen-di'}.png`;
      link.href = topPhotos[0] || '/images/independence-palace.jpg';
      link.click();
      setDownloading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl animate-scale-up">
        {/* Header của modal */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-amber-300">
              {lang === 'vi' ? 'Thẻ ảnh Kỷ niệm Chuyến đi' : 'Trip Recap Card'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* THẺ STORY RECAP 9:16 CỰC ĐẸP */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-5">
          <div
            ref={cardRef}
            className="relative mx-auto overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-5 text-white shadow-2xl ring-1 ring-white/15"
          >
            {/* Background patterns */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl" />

            <div className="relative text-center">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                ★ SÀI GÒN GUIDE RECAP ★
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                {trip?.title || 'Khám phá Sài Gòn'}
              </h2>
              <p className="mt-0.5 text-xs text-brand-200">
                {lang === 'vi' ? `${dayCount} ngày trải nghiệm trọn vẹn văn hóa & ẩm thực` : `${dayCount} days in Ho Chi Minh City`}
              </p>
              {userCheckinPhotos.length > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  <Camera className="h-3 w-3" />
                  <span>{userCheckinPhotos.length} ảnh check-in thực tế</span>
                </div>
              )}
            </div>

            {/* Collage 4 ảnh kỷ niệm */}
            <div className="relative mt-4 grid grid-cols-2 gap-2 overflow-hidden rounded-2xl">
              {topPhotos.slice(0, 4).map((url, i) => (
                <div key={i} className="relative h-24 overflow-hidden rounded-xl bg-slate-800">
                  <img
                    src={url}
                    alt="Kỷ niệm Sài Gòn"
                    className="h-full w-full object-cover"
                  />
                  {userCheckinPhotos.includes(url) && (
                    <span className="absolute bottom-1 right-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white">
                      Ảnh thật 📸
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 4 Con số ấn tượng */}
            <div className="relative mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                <p className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400">
                  <MapPin className="h-3 w-3 text-brand-400" />
                  {lang === 'vi' ? 'ĐIỂM ĐẾN' : 'STOPS'}
                </p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-white">
                  {placeCount} địa điểm
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                <p className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400">
                  <Utensils className="h-3 w-3 text-amber-400" />
                  {lang === 'vi' ? 'ẨM THỰC & CAFE' : 'FOOD & CAFE'}
                </p>
                <p className="mt-0.5 font-display text-lg font-extrabold text-amber-300">
                  {foodCount} món đặc sản
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                <p className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400">
                  <Wallet className="h-3 w-3 text-emerald-400" />
                  {lang === 'vi' ? 'TỔNG CHI TIÊU' : 'TOTAL SPENT'}
                </p>
                <p className="mt-0.5 font-display text-sm font-extrabold text-emerald-300 truncate">
                  {formatVnd(totalCost, lang)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                <p className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400">
                  <Award className="h-3 w-3 text-rose-400" />
                  {lang === 'vi' ? 'DANH HIỆU' : 'BADGE'}
                </p>
                <p className="mt-0.5 font-display text-xs font-extrabold text-rose-300 truncate">
                  Thổ địa Sài Gòn
                </p>
              </div>
            </div>

            {/* Footer của Story card */}
            <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-brand-400" />
                <span>AI Travel Planner · Nhóm 7</span>
              </span>
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-2 border-t border-white/10 bg-slate-950 p-4">
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-secondary flex-1 !py-3 text-xs font-bold text-white border-white/20 bg-white/10 hover:bg-white/20"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Đã sao chép link!' : 'Sao chép link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCard}
            disabled={downloading}
            className="btn-primary flex-1 !py-3 text-xs font-extrabold bg-gradient-to-r from-brand-500 to-amber-500 shadow-glow"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Đang tải ảnh...' : 'Tải thẻ ảnh Story'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
