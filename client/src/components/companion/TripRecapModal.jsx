import {
  Award,
  Calendar,
  Camera,
  Check,
  Compass,
  Copy,
  Download,
  Flame,
  Heart,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Share2,
  Sparkles,
  Utensils,
  Wallet,
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

      // 1. Nền giấy Kraft / Mỹ thuật Vintage
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1480);
      bgGrad.addColorStop(0, '#fdfbf7');
      bgGrad.addColorStop(1, '#f5efdf');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1480);

      // Đường viền đôi cổ điển
      ctx.strokeStyle = '#c4b59d';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1020, 1420);

      ctx.strokeStyle = '#dfd5c3';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(42, 42, 996, 1396);

      // 2. Header Photobook
      ctx.textAlign = 'center';

      // Stamp badge
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 18px sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('★ SÀI GÒN GUIDE · PHOTOBOOK DU LỊCH KỶ NIỆM ★', 540, 95);

      // Main Title
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 44px sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText('NHẬT KÝ HÀNH TRÌNH SÀI GÒN', 540, 155);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 20px sans-serif';
      const tripSub = `${trip?.title || 'Khám phá TP. Hồ Chí Minh'} · ${dayCount} ngày · ${memberCount} người`;
      ctx.fillText(tripSub, 540, 195);

      // 3. Tải và vẽ 4 ảnh Polaroid lên Canvas
      const positions = [
        { x: 80, y: 235, w: 420, h: 360, rotate: -0.02 },
        { x: 580, y: 245, w: 420, h: 360, rotate: 0.02 },
        { x: 80, y: 635, w: 420, h: 360, rotate: 0.015 },
        { x: 580, y: 625, w: 420, h: 360, rotate: -0.015 }
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
          ctx.translate(pos.x + pos.w / 2, pos.y + pos.h / 2);
          ctx.rotate(pos.rotate);

          // Khung viền ảnh Polaroid trắng
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 8;
          ctx.fillRect(-pos.w / 2, -pos.h / 2, pos.w, pos.h);
          ctx.shadowColor = 'transparent';

          // Ảnh bên trong
          const img = loadedImgs[idx];
          if (img) {
            ctx.drawImage(img, -pos.w / 2 + 16, -pos.h / 2 + 16, pos.w - 32, pos.h - 90);
          } else {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(-pos.w / 2 + 16, -pos.h / 2 + 16, pos.w - 32, pos.h - 90);
          }

          // Caption dưới ảnh
          ctx.textAlign = 'center';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(`✓ ${photo.place_name}`, 0, pos.h / 2 - 45);

          ctx.fillStyle = '#64748b';
          ctx.font = '15px sans-serif';
          ctx.fillText(`${photo.district} · Đã ghé thăm`, 0, pos.h / 2 - 20);

          ctx.restore();
        });

        // 4. Hộp Slogan cảm xúc Sài Gòn
        const sloganY = 1040;
        ctx.fillStyle = '#fffbeb';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(80, sloganY, 920, 160, 24);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 36px serif';
        ctx.fillText('“', 540, sloganY + 45);

        ctx.fillStyle = '#451a03';
        ctx.font = 'italic bold 23px sans-serif';
        ctx.fillText('Sài Gòn Guide — Từng góc phố, vạn kỷ niệm. Chuyến đi khép lại, hồi ức còn mãi.', 540, sloganY + 85);

        ctx.fillStyle = '#92400e';
        ctx.font = '17px sans-serif';
        ctx.fillText('“Dù nắng hay mưa, Sài Gòn vẫn luôn ôm trọn những nụ cười của bạn.”', 540, sloganY + 125);

        // 5. Thống kê hành trình
        const statsY = 1240;
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 18px sans-serif';
        const statsText = `📍 ${placeCount} Điểm tham quan  ·  🍜 ${foodCount} Món ngon Sài Gòn  ·  💰 ${formatVnd(totalCost, 'vi')} (${memberCount} người)`;
        ctx.fillText(statsText, 540, statsY);

        // 6. Watermark Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Sài Gòn Guide © ${new Date().getFullYear()} · AI Travel Planner TP.HCM · Nhóm 7 (HCMUS)`, 540, 1370);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-200/40 bg-gradient-to-b from-[#fbf8f0] to-[#f4ede0] shadow-2xl animate-scale-up text-slate-900">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between border-b border-amber-200/60 bg-amber-100/70 px-5 py-3.5 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-700" />
            <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-amber-950">
              {lang === 'vi' ? 'Photobook Kỷ niệm Hành trình Sài Gòn' : 'Saigon Travel Photobook'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {allPhotoCandidates.length > 4 && (
              <button
                type="button"
                onClick={handleShufflePhotos}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white/90 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs hover:bg-white active:scale-95 transition-all"
                title="Chọn ngẫu nhiên 4 ảnh khác trong album"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden sm:inline">Đổi 4 ảnh khác</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-900/10 text-slate-700 hover:bg-slate-900/20 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG PHOTOBOOK CUỘN MƯỢT (SCRAPBOOK TRANG NHÃ) */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            ref={cardRef}
            className="relative mx-auto rounded-3xl border-2 border-[#d8cbb5] bg-[#fbf9f2] p-5 sm:p-7 shadow-lg ring-1 ring-black/5"
          >
            {/* Họa tiết tem mác du lịch cổ điển */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-[10.5px] font-extrabold tracking-widest text-amber-900 shadow-2xs">
                ★ SÀI GÒN GUIDE · PHOTOBOOK KỶ NIỆM ★
              </span>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                NHẬT KÝ HÀNH TRÌNH SÀI GÒN
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
                {trip?.title || 'Khám phá TP. Hồ Chí Minh'} · {dayCount} ngày trải nghiệm · {memberCount} thành viên
              </p>
            </div>

            {/* BỐ CỤC 4 ẢNH PHOTOBOOK POLAROID VỚI BĂNG KEO DÁN & GÓC NGHIÊNG NGHỆ THUẬT */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6">
              {currentPhotos.map((photo, index) => {
                const tilts = ['-rotate-1', 'rotate-1.5', 'rotate-2', '-rotate-1.5'];
                const tiltClass = tilts[index % 4];

                return (
                  <div
                    key={photo.id || index}
                    className={cn(
                      'group relative rounded-2xl bg-white p-2.5 pb-5 sm:pb-6 shadow-md ring-1 ring-slate-900/5 transition-all duration-300 hover:rotate-0 hover:shadow-xl hover:scale-102',
                      tiltClass
                    )}
                  >
                    {/* Miếng băng keo Washi-tape dán ở mép trên ảnh */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3.5 w-14 rounded-xs border-y border-amber-300/60 bg-amber-100/80 shadow-2xs backdrop-blur-xs" />

                    {/* Khung ảnh */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={photo.url}
                        alt={photo.place_name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Huy hiệu nếu là ảnh chụp thực tế */}
                      {photo.isUserPhoto && (
                        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[9.5px] font-extrabold text-white shadow-xs backdrop-blur-xs">
                          <Camera className="h-3 w-3" />
                          <span>Ảnh thật 📸</span>
                        </span>
                      )}
                    </div>

                    {/* Caption viết tay bên dưới ảnh */}
                    <div className="mt-2.5 text-center">
                      <h4 className="font-display text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1">
                        ✓ {photo.place_name}
                      </h4>
                      <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                        📍 {photo.district} {photo.time ? `· ${photo.time}` : '· Đã ghé thăm'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* HỘP CÂU SLOGAN HAY & Ý NGHĨA VỀ APP & SÀI GÒN */}
            <div className="relative mt-6 sm:mt-7 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 p-4 sm:p-5 text-center shadow-xs">
              <span className="font-serif text-3xl font-bold text-amber-500 block leading-none">“</span>
              <p className="font-display text-sm sm:text-base font-black italic tracking-tight text-amber-950 sm:leading-snug">
                Sài Gòn Guide — Từng góc phố, vạn kỷ niệm. Chuyến đi khép lại, hồi ức còn mãi.
              </p>
              <p className="mt-1 text-[11px] font-semibold text-amber-800/85">
                “Dù nắng hay mưa, Sài Gòn vẫn luôn ôm trọn những nụ cười của bạn.”
              </p>
            </div>

            {/* THANH THỐNG KÊ CHI PHÍ & CON SỐ ẤN TƯỢNG */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
              <div className="rounded-xl border border-[#e5d9c5] bg-white/70 p-2.5 backdrop-blur-xs">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Điểm khám phá</span>
                <span className="font-display text-sm font-extrabold text-slate-800">{placeCount} địa điểm</span>
              </div>
              <div className="rounded-xl border border-[#e5d9c5] bg-white/70 p-2.5 backdrop-blur-xs">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Ẩm thực Sài Gòn</span>
                <span className="font-display text-sm font-extrabold text-amber-700">{foodCount} món đặc sản</span>
              </div>
              <div className="rounded-xl border border-[#e5d9c5] bg-white/70 p-2.5 backdrop-blur-xs">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Chi phí ({memberCount} ng)</span>
                <span className="font-display text-xs sm:text-sm font-extrabold text-emerald-700 truncate block">
                  {formatVnd(totalCost, lang)}
                </span>
              </div>
              <div className="rounded-xl border border-[#e5d9c5] bg-white/70 p-2.5 backdrop-blur-xs">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Danh hiệu</span>
                <span className="font-display text-xs sm:text-sm font-extrabold text-rose-600 truncate block">
                  Thổ địa Sài Gòn
                </span>
              </div>
            </div>

            {/* Footer Photobook */}
            <div className="mt-5 flex items-center justify-between border-t border-[#e2d5be] pt-3 text-[10.5px] text-slate-400">
              <span className="font-semibold text-slate-500">Sài Gòn Guide · AI Travel Planner</span>
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG DƯỚI CHÂN MODAL */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/60 bg-amber-100/60 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-97"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              <span>{copied ? 'Đã chép link!' : 'Chia sẻ link'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleDownloadPhotobook}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-amber-700 hover:to-brand-700 active:scale-97 disabled:opacity-60 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? 'Đang xuất Photobook...' : 'Tải Photobook kỷ niệm (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
