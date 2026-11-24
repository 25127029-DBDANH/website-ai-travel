import {
  Camera,
  Check,
  Copy,
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';

export default function TripRecapModal({ trip, items = [], onClose }) {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [photoOffset, setPhotoOffset] = useState(0);
  const cardRef = useRef(null);

  const dayCount = Number(trip?.days) || 1;
  const placeCount = items.length;
  const memberCount = Number(trip?.member_count) || (trip?.companion === 'solo' ? 1 : 4);

  // Tính toán chi phí chính xác theo nhóm
  const activitiesCost = items.reduce((sum, it) => sum + Number(it.estimated_cost || 0), 0) * memberCount;
  const transitCost = items.reduce((sum, it) => {
    const fare = Number(it.transit_info?.estimated_fare_vnd || 0);
    return it.transit_info?.mode === 'grab_bike' ? sum + fare * memberCount : sum + fare;
  }, 0);
  const totalCost = activitiesCost + transitCost;
  const foodCount = items.filter((it) => it.category === 'food' || it.category === 'cafe').length;
  const visitedCount = items.filter((it) => it.visited).length;

  // Thu thập danh sách ảnh (ưu tiên ảnh check-in thật của người dùng)
  const allPhotoCandidates = useMemo(() => {
    const list = [];
    // 1. Ảnh check-in thật do người dùng chụp/upload
    items.forEach((it) => {
      if (it.checkin_photo) {
        list.push({
          id: `checkin-${it.place_id}`,
          place_name: it.place_name,
          district: it.district || 'TP.HCM',
          url: it.checkin_photo,
          isUserPhoto: true,
          visited: true,
          time: it.checkin_time || it.time_slot
        });
      }
    });

    // 2. Ảnh địa điểm đã check-in ghé thăm
    items.forEach((it) => {
      if (it.visited && it.photo_url && !it.checkin_photo) {
        list.push({
          id: `visited-${it.place_id}`,
          place_name: it.place_name,
          district: it.district || 'TP.HCM',
          url: assetUrl(it.photo_url),
          isUserPhoto: false,
          visited: true,
          time: it.time_slot
        });
      }
    });

    // 3. Ảnh từ các địa điểm trong lịch trình
    items.forEach((it) => {
      if (!it.visited && it.photo_url) {
        list.push({
          id: `stop-${it.place_id}`,
          place_name: it.place_name,
          district: it.district || 'TP.HCM',
          url: assetUrl(it.photo_url),
          isUserPhoto: false,
          visited: false,
          time: it.time_slot
        });
      }
    });

    // Fallback ảnh đẹp Sài Gòn nếu chưa đủ 4 ảnh
    const fallbacks = [
      { id: 'fb-1', place_name: 'Dinh Độc Lập', district: 'Quận 1', url: '/images/independence-palace.jpg', visited: true },
      { id: 'fb-2', place_name: 'Phở Hoa Pasteur', district: 'Quận 3', url: '/images/pho.png', visited: true },
      { id: 'fb-3', place_name: 'Cà phê Sài Gòn xưa', district: 'Quận 1', url: '/images/cafe.jpg', visited: true },
      { id: 'fb-4', place_name: 'Chợ Bến Thành', district: 'Quận 1', url: '/images/ben_thanh.jpeg', visited: true }
    ];

    return list.length >= 4 ? list : [...list, ...fallbacks.slice(0, 4 - list.length)];
  }, [items]);

  // Chọn 4 ảnh hiển thị theo offset (người dùng có thể shuffle đổi 4 ảnh khác)
  const currentPhotos = useMemo(() => {
    const total = allPhotoCandidates.length;
    if (total <= 4) return allPhotoCandidates.slice(0, 4);
    const start = photoOffset % total;
    const selected = [];
    for (let i = 0; i < 4; i++) {
      selected.push(allPhotoCandidates[(start + i) % total]);
    }
    return selected;
  }, [allPhotoCandidates, photoOffset]);

  const handleShufflePhotos = () => {
    setPhotoOffset((prev) => prev + 1);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // VẼ PHOTOBOOK CAO CẤP VÀ TẢI VỀ DƯỚI DẠNG FILE PNG NÉT CĂNG
  const handleDownloadPhotobook = () => {
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1480;
      const ctx = canvas.getContext('2d');

      // 1. Nền phẳng màu sáng
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1080, 1480);

      // Đường viền khung đơn giản
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, 1016, 1416);

      // 2. Header Photobook
      ctx.textAlign = 'center';

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('SÀI GÒN GUIDE · TP.HCM', 540, 95);

      ctx.fillStyle = '#0f172a';
      ctx.font = '800 42px sans-serif';
      ctx.fillText('TỔNG KẾT CHUYẾN ĐI TP.HCM', 540, 155);

      ctx.fillStyle = '#475569';
      ctx.font = '20px sans-serif';
      const tripSub = `${trip?.title || 'Lịch trình TP.HCM'} · ${dayCount} ngày · ${memberCount} người`;
      ctx.fillText(tripSub, 540, 195);

      // 3. Tải và vẽ 4 ảnh ngay ngắn lên Canvas
      const positions = [
        { x: 80, y: 240, w: 430, h: 360 },
        { x: 570, y: 240, w: 430, h: 360 },
        { x: 80, y: 640, w: 430, h: 360 },
        { x: 570, y: 640, w: 430, h: 360 }
      ];

      const loadImg = (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });

      Promise.all(currentPhotos.map((p) => loadImg(p.url))).then((loadedImgs) => {
        currentPhotos.forEach((photo, idx) => {
          const pos = positions[idx];
          ctx.save();
          ctx.translate(pos.x, pos.y);

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.fillRect(0, 0, pos.w, pos.h);
          ctx.strokeRect(0, 0, pos.w, pos.h);

          const img = loadedImgs[idx];
          if (img) {
            ctx.drawImage(img, 14, 14, pos.w - 28, pos.h - 88);
          } else {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(14, 14, pos.w - 28, pos.h - 88);
          }

          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(photo.place_name, 16, pos.h - 44);

          ctx.fillStyle = '#64748b';
          ctx.font = '15px sans-serif';
          ctx.fillText(`${photo.district}`, 16, pos.h - 18);

          ctx.restore();
        });

        // 4. Thống kê hành trình
        const statsY = 1090;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(80, statsY, 920, 120, 16);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px sans-serif';
        const statsText = `${placeCount} điểm dừng  ·  ${foodCount} quán ăn & cà phê  ·  ${formatVnd(totalCost, 'vi')} (${memberCount} người)`;
        ctx.fillText(statsText, 540, statsY + 54);

        ctx.fillStyle = '#475569';
        ctx.font = '17px sans-serif';
        ctx.fillText(`Đã check-in ${visitedCount}/${placeCount} điểm trong lịch trình`, 540, statsY + 92);

        // 5. Footer
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Sài Gòn Guide © ${new Date().getFullYear()} · TP. Hồ Chí Minh`, 540, 1370);

        // Download PNG
        const link = document.createElement('a');
        link.download = `photobook-saigon-${trip?.id || 'kyniem'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloading(false);
      });
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 animate-fade-in">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft animate-scale-up text-slate-900">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand-600" />
            <h3 className="font-display text-sm font-extrabold text-slate-900">
              {lang === 'vi' ? 'Thẻ ảnh tổng kết chuyến đi' : 'Trip photo summary'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {allPhotoCandidates.length > 4 && (
              <button
                type="button"
                onClick={handleShufflePhotos}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-colors"
                title={lang === 'vi' ? 'Đổi 4 ảnh khác trong danh sách' : 'Switch to 4 other photos'}
              >
                <RefreshCw className="h-3.5 w-3.5 text-brand-600" />
                <span className="hidden sm:inline">{lang === 'vi' ? 'Đổi 4 ảnh khác' : 'Swap photos'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-200/70 text-slate-700 hover:bg-slate-200 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỔNG KẾT ẢNH */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            ref={cardRef}
            className="mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
          >
            <div className="text-center">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                {trip?.title || (lang === 'vi' ? 'Lịch trình TP.HCM' : 'Ho Chi Minh City Trip')}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
                {dayCount} {lang === 'vi' ? 'ngày' : 'days'} · {memberCount} {lang === 'vi' ? 'người' : 'travelers'}
              </p>
            </div>

            {/* Lưới 4 ảnh ngay ngắn */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {currentPhotos.map((photo, index) => (
                <div
                  key={photo.id || index}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
                    <img
                      src={photo.url}
                      alt={photo.place_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />

                    {photo.isUserPhoto && (
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Camera className="h-3 w-3" />
                        <span>{lang === 'vi' ? 'Ảnh check-in' : 'Check-in'}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <h4 className="line-clamp-1 font-display text-xs font-bold text-slate-900 sm:text-sm">
                      {photo.place_name}
                    </h4>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {photo.district}
                      {photo.time ? ` · ${photo.time}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Thống kê thực tế */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  {lang === 'vi' ? 'Điểm dừng' : 'Stops'}
                </span>
                <span className="font-display text-sm font-extrabold text-slate-900">
                  {placeCount} {lang === 'vi' ? 'điểm' : 'places'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  {lang === 'vi' ? 'Ăn uống & cà phê' : 'Food & cafés'}
                </span>
                <span className="font-display text-sm font-extrabold text-slate-900">
                  {foodCount} {lang === 'vi' ? 'quán' : 'spots'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  {lang === 'vi' ? `Chi phí (${memberCount} ng)` : `Cost (${memberCount})`}
                </span>
                <span className="block truncate font-display text-xs font-extrabold text-brand-700 sm:text-sm">
                  {formatVnd(totalCost, lang)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  {lang === 'vi' ? 'Đã check-in' : 'Checked in'}
                </span>
                <span className="font-display text-sm font-extrabold text-emerald-700">
                  {visitedCount}/{placeCount}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Sài Gòn Guide · TP.HCM</span>
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG DƯỚI CHÂN MODAL */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-secondary !px-3.5 !py-2.5 text-xs"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>
                {copied
                  ? lang === 'vi'
                    ? 'Đã chép link'
                    : 'Link copied'
                  : lang === 'vi'
                    ? 'Sao chép link'
                    : 'Copy link'}
              </span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPhotobook}
              disabled={downloading}
              className="btn-primary !px-5 !py-2.5 text-xs font-bold"
            >
              <Download className="h-4 w-4" />
              <span>
                {downloading
                  ? lang === 'vi'
                    ? 'Đang xuất ảnh...'
                    : 'Exporting PNG...'
                  : lang === 'vi'
                    ? 'Tải ảnh tổng kết (PNG)'
                    : 'Download PNG'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
