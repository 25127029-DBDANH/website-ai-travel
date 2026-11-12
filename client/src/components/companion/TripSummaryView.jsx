import {
  ArrowLeft,
  Award,
  Bike,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl, downloadIcsFile } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatDayLabel, formatVnd } from '../../lib/format.js';

export default function TripSummaryView({
  trip,
  items = [],
  onBackToItinerary,
  onOpenRecap
}) {
  const { lang, t } = useI18n();
  const [selectedDayTab, setSelectedDayTab] = useState('all');

  const dayCount = Number(trip?.days) || 1;
  const initialBudget = Number(trip?.budget) || 5000000;

  // Thống kê địa điểm đã đi
  const totalStops = items.length;
  const visitedStops = useMemo(() => items.filter((it) => it.visited), [items]);
  const visitedCount = visitedStops.length;
  const checkinPhotos = useMemo(() => items.filter((it) => it.checkin_photo), [items]);

  // Phân tích chi tiêu thực tế
  const expenseStats = useMemo(() => {
    let activitiesCost = 0;
    let diningCost = 0;
    let transportCost = 0;

    items.forEach((item) => {
      const cost = Number(item.estimated_cost) || 0;
      if (item.category === 'food' || item.is_lunch) {
        diningCost += cost;
      } else {
        activitiesCost += cost;
      }
      if (item.transit_info?.estimated_fare_vnd) {
        transportCost += Number(item.transit_info.estimated_fare_vnd);
      }
    });

    const totalSpent = activitiesCost + diningCost + transportCost;
    const remaining = initialBudget - totalSpent;
    const isUnderBudget = remaining >= 0;

    return {
      activitiesCost,
      diningCost,
      transportCost,
      totalSpent,
      remaining: Math.abs(remaining),
      isUnderBudget
    };
  }, [items, initialBudget]);

  // Nhóm các điểm đến theo ngày
  const itemsByDay = useMemo(() => {
    const map = new Map();
    for (let day = 1; day <= dayCount; day++) {
      map.set(day, []);
    }
    for (const item of items) {
      if (!map.has(item.day_number)) map.set(item.day_number, []);
      map.get(item.day_number).push(item);
    }
    return map;
  }, [items, dayCount]);

  const displayedDays = selectedDayTab === 'all'
    ? Array.from({ length: dayCount }, (_, i) => i + 1)
    : [Number(selectedDayTab)];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* NÚT QUAY LẠI LỊCH TRÌNH */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToItinerary}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'vi' ? 'Quay lại xem Lịch trình' : 'Back to Itinerary'}</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenRecap && (
            <button
              type="button"
              onClick={onOpenRecap}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-extrabold text-amber-900 shadow-xs hover:bg-amber-100"
            >
              <Camera className="h-4 w-4 text-amber-600" />
              <span>{lang === 'vi' ? 'Xuất Thẻ ảnh Kỷ niệm (Story Card)' : 'Export Story Card'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadIcsFile(trip, items)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100"
          >
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Tải file lịch .ICS' : 'Export .ICS'}</span>
          </button>
        </div>
      </div>

      {/* HERO BANNER: CHÚC MỪNG HOÀN THÀNH CHUYẾN ĐI */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
            <Award className="h-4 w-4 text-amber-300" />
            {lang === 'vi' ? 'Hành trình hoàn tất thành công!' : 'Trip Completed!'}
          </span>

          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            {lang === 'vi' ? `Tổng kết chuyến đi: ${trip?.title || 'Khám phá Sài Gòn'}` : `Trip Summary: ${trip?.title}`}
          </h2>

          <p className="mt-2 text-sm text-emerald-100 leading-relaxed max-w-2xl">
            {lang === 'vi'
              ? `Bạn đã hoàn thành chuyến hành trình ${dayCount} ngày tại TP. Hồ Chí Minh. Dưới đây là bảng tổng kết chi tiết những nơi bạn đã đi qua và toàn bộ các khoản chi tiêu thực tế so với ngân sách ban đầu.`
              : `You have successfully completed your ${dayCount}-day journey in Saigon. Here is your full recap of places visited and total expenses.`}
          </p>

          {/* 3 Thống kê nhanh */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
              <span className="block text-[10.5px] font-bold text-emerald-200 uppercase tracking-wider">
                {lang === 'vi' ? 'Thời gian' : 'Duration'}
              </span>
              <span className="mt-1 block font-display text-lg font-extrabold">
                {dayCount} {lang === 'vi' ? 'ngày' : 'days'}
              </span>
            </div>

            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
              <span className="block text-[10.5px] font-bold text-emerald-200 uppercase tracking-wider">
                {lang === 'vi' ? 'Điểm đã ghé thăm' : 'Stops Visited'}
              </span>
              <span className="mt-1 block font-display text-lg font-extrabold text-amber-300">
                {visitedCount} / {totalStops}
              </span>
            </div>

            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
              <span className="block text-[10.5px] font-bold text-emerald-200 uppercase tracking-wider">
                {lang === 'vi' ? 'Tổng chi tiêu' : 'Total Spent'}
              </span>
              <span className="mt-1 block font-display text-lg font-extrabold">
                {formatVnd(expenseStats.totalSpent, lang)}
              </span>
            </div>

            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
              <span className="block text-[10.5px] font-bold text-emerald-200 uppercase tracking-wider">
                {lang === 'vi' ? 'Tình trạng ngân sách' : 'Budget Health'}
              </span>
              <span className="mt-1 flex items-center gap-1 font-display text-sm font-extrabold text-emerald-300">
                {expenseStats.isUnderBudget ? (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>Dư {formatVnd(expenseStats.remaining, lang)}</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-rose-300" />
                    <span>Vượt {formatVnd(expenseStats.remaining, lang)}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 1: BÁO CÁO CHI TIÊU NHỮNG GÌ (EXPENSE & BUDGET BREAKDOWN) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900">
                {lang === 'vi' ? 'Báo cáo chi tiêu chuyến đi' : 'Expense & Budget Summary'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'vi'
                  ? 'Chi tiết các khoản tiền cho tham quan, ẩm thực và đặt xe di chuyển'
                  : 'Breakdown of your expenses across activities, dining and rides'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Ngân sách dự trù: <strong className="text-slate-900">{formatVnd(initialBudget, lang)}</strong></span>
            <span>·</span>
            <span>Đã chi: <strong className="text-emerald-700">{formatVnd(expenseStats.totalSpent, lang)}</strong></span>
          </div>
        </div>

        {/* 3 Cột phân loại chi phí */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Cột 1: Vé tham quan & Hoạt động */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                {lang === 'vi' ? 'Vé tham quan & Hoạt động' : 'Activities & Sightseeing'}
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
                <MapPin className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-xl font-extrabold text-blue-950">
              {formatVnd(expenseStats.activitiesCost, lang)}
            </p>
            <p className="mt-1 text-[11px] text-blue-800">
              {lang === 'vi' ? 'Bao gồm vé bảo tàng, dinh thự, di tích lịch sử' : 'Museum tickets, palace and historic sites'}
            </p>
          </div>

          {/* Cột 2: Ẩm thực & Cà phê */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                {lang === 'vi' ? 'Ẩm thực & Cà phê' : 'Dining & Coffee'}
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Utensils className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-xl font-extrabold text-amber-950">
              {formatVnd(expenseStats.diningCost, lang)}
            </p>
            <p className="mt-1 text-[11px] text-amber-800">
              {lang === 'vi' ? 'Các bữa ăn trưa đặc sản, ăn vặt đường phố & cafe' : 'Specialty lunches, street food & cafes'}
            </p>
          </div>

          {/* Cột 3: Di chuyển xe (Grab, Xanh SM, Be) */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                {lang === 'vi' ? 'Di chuyển (Grab / Xanh SM / Be)' : 'Transport & Rides'}
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Bike className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-xl font-extrabold text-emerald-950">
              {formatVnd(expenseStats.transportCost, lang)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-800">
              {lang === 'vi' ? 'Cước xe máy và ô tô di chuyển giữa các điểm' : 'Estimated fares between destinations'}
            </p>
          </div>
        </div>

        {/* Thanh so sánh ngân sách */}
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Tỷ lệ sử dụng ngân sách:</span>
            <span>{Math.round((expenseStats.totalSpent / initialBudget) * 100)}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                expenseStats.isUnderBudget ? 'bg-emerald-500' : 'bg-rose-500'
              )}
              style={{ width: `${Math.min(100, (expenseStats.totalSpent / initialBudget) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-slate-600">
            {expenseStats.isUnderBudget
              ? (lang === 'vi' ? `🎉 Tuyệt vời! Bạn đã tiết kiệm được ${formatVnd(expenseStats.remaining, lang)} so với ngân sách dự trù.` : 'Great job! Under budget.')
              : (lang === 'vi' ? `Bạn đã chi vượt ${formatVnd(expenseStats.remaining, lang)} so với ngân sách.` : 'Over budget.')}
          </p>
        </div>
      </div>

      {/* PHẦN 2: ĐÃ ĐI ĐẾN ĐÂU (DANH SÁCH LỘ TRÌNH ĐIỂM ĐẾN TỪNG NGÀY) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900">
                {lang === 'vi' ? 'Hành trình những nơi bạn đã đi qua' : 'Places You Have Visited'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'vi' ? 'Chi tiết dòng thời gian và các điểm đến theo từng ngày' : 'Timeline and stops for each day'}
              </p>
            </div>
          </div>

          {/* Bộ lọc xem tất cả hoặc từng ngày */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedDayTab('all')}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                selectedDayTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {lang === 'vi' ? 'Toàn bộ chuyến đi' : 'All Days'}
            </button>

            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayTab(String(day))}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  selectedDayTab === String(day)
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {formatDayLabel(lang, day)}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách từng ngày */}
        <div className="mt-6 space-y-8">
          {displayedDays.map((day) => {
            const dayStops = itemsByDay.get(day) || [];
            return (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="flex items-center gap-2 font-display text-sm font-extrabold text-brand-700">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDayLabel(lang, day)} ({dayStops.length} điểm đến)</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {dayStops.filter((s) => s.visited).length}/{dayStops.length} đã ghé thăm
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {dayStops.map((stop) => {
                    const isDone = Boolean(stop.visited);
                    const photo = stop.checkin_photo || assetUrl(stop.photo_url);

                    return (
                      <div
                        key={stop.place_id || stop.order_index}
                        className={cn(
                          'flex gap-3 rounded-2xl border p-3.5 transition-all',
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white'
                        )}
                      >
                        {photo ? (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            <img
                              src={photo}
                              alt={stop.place_name}
                              className="h-full w-full object-cover"
                            />
                            {stop.checkin_photo && (
                              <span className="absolute bottom-1 right-1 rounded-md bg-emerald-600 px-1 py-0.5 text-[8.5px] font-extrabold text-white">
                                📸 Check-in
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
                            <MapPin className="h-6 w-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-500">
                              {stop.time_slot}
                            </span>
                            {isDone && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-800">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Đã đến
                              </span>
                            )}
                          </div>

                          <h5 className="mt-0.5 truncate font-display text-sm font-extrabold text-slate-900">
                            {stop.place_name}
                          </h5>

                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                            {stop.district} · {stop.estimated_cost > 0 ? formatVnd(stop.estimated_cost, lang) : 'Miễn phí'}
                          </p>

                          {stop.checkin_note && (
                            <p className="mt-1 line-clamp-1 italic text-[11px] text-emerald-800">
                              “{stop.checkin_note}”
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHẦN 3: BỘ SƯU TẬP ẢNH CHECK-IN KỶ NIỆM (NẾU CÓ) */}
      {checkinPhotos.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900">
                {lang === 'vi' ? 'Album ảnh kỷ niệm thực tế của bạn' : 'Your Check-in Photos'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'vi' ? `Đã lưu ${checkinPhotos.length} khoảnh khắc check-in tuyệt đẹp tại Sài Gòn` : `${checkinPhotos.length} photos captured`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {checkinPhotos.map((item) => (
              <div
                key={item.place_id || item.order_index}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-square"
              >
                <img
                  src={item.checkin_photo}
                  alt={item.place_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <p className="truncate font-display text-xs font-extrabold">{item.place_name}</p>
                  <p className="text-[10px] text-slate-300">Ngày {item.day_number} · {item.checkin_time || item.time_slot}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER ĐIỀU HƯỚNG */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={onBackToItinerary}
          className="btn-secondary !py-2.5 text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'vi' ? 'Xem lại Lịch trình Timeline' : 'Back to Timeline'}</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenRecap && (
            <button
              type="button"
              onClick={onOpenRecap}
              className="btn-primary !py-2.5 text-xs font-extrabold shadow-sm"
            >
              <Camera className="h-4 w-4" />
              <span>{lang === 'vi' ? 'Xem Thẻ ảnh Kỷ niệm (Story Card)' : 'View Story Card'}</span>
            </button>
          )}

          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            {lang === 'vi' ? 'Tạo chuyến đi mới' : 'Plan New Trip'}
          </Link>
        </div>
      </div>
    </div>
  );
}
