import {
  ArrowRight,
  Bike,
  Bus,
  Car,
  Check,
  Footprints,
  Heart,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  User,
  Users,
  Wallet
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO } from '../demo.jsx';
import { preferenceOptions } from '../i18n/translations.js';
import { api } from '../lib/api.js';
import { getCategoryMeta } from '../lib/categories.jsx';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';

const PREFERENCE_CATEGORY = {
  food: 'food',
  culture: 'sightseeing',
  cafe: 'food',
  shopping: 'shopping',
  nature: 'nature',
  nightlife: 'entertainment'
};

const BUDGET_PRESETS = [2_000_000, 3_000_000, 5_000_000, 10_000_000];

const COMPANIONS = [
  { id: 'solo', labelVi: 'Đi một mình', labelEn: 'Solo', icon: User },
  { id: 'couple', labelVi: 'Cặp đôi', labelEn: 'Couple', icon: Heart },
  { id: 'friends', labelVi: 'Nhóm bạn', labelEn: 'Friends', icon: Users },
  { id: 'family', labelVi: 'Gia đình', labelEn: 'Family', icon: Users }
];

const TRANSPORTS = [
  { id: 'walk', labelVi: 'Đi bộ', labelEn: 'Walking', icon: Footprints },
  { id: 'grab_bike', labelVi: 'GrabBike / Xe máy', labelEn: 'GrabBike / Motorbike', icon: Bike },
  { id: 'grab_car', labelVi: 'GrabCar / Taxi', labelEn: 'GrabCar / Taxi', icon: Car },
  { id: 'public', labelVi: 'Xe buýt / Metro', labelEn: 'Bus / Metro', icon: Bus }
];

const PACE_OPTIONS = [
  { id: 'relaxed', count: 3, labelVi: 'Thư thả', labelEn: 'Relaxed', subVi: 'Ít điểm, nghỉ ngơi nhiều', subEn: 'Fewer stops and more rest' },
  { id: 'moderate', count: 4, labelVi: 'Cân bằng', labelEn: 'Moderate', subVi: 'Nhịp độ vừa phải', subEn: 'A balanced pace' },
  { id: 'packed', count: 6, labelVi: 'Dày đặc', labelEn: 'Packed', subVi: 'Khám phá tối đa', subEn: 'Fit in more exploration' }
];

const DISTRICT_SHORTCUTS = [
  { id: 'q1', name: 'Quận 1', icon: '⭐', highlight: 'Trung tâm' },
  { id: 'q3', name: 'Quận 3', icon: '🏛️', highlight: 'Hồ Con Rùa' },
  { id: 'q5', name: 'Quận 5', icon: '🏮', highlight: 'Chợ Lớn' },
  { id: 'binh_thanh', name: 'Bình Thạnh', icon: '🏙️', highlight: 'Landmark 81' },
  { id: 'q4', name: 'Quận 4', icon: '🍜', highlight: 'Phố ốc' },
  { id: 'phu_nhuan', name: 'Phú Nhuận', icon: '☕', highlight: 'Phan Xích Long' },
  { id: 'thu_duc', name: 'Thủ Đức', icon: '🌉', highlight: 'Thảo Điền' },
  { id: 'q7', name: 'Quận 7', icon: '✨', highlight: 'Phú Mỹ Hưng' }
];

export default function TripForm() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [startLocation, setStartLocation] = useState(() => t('form.startDefault'));
  const [districts, setDistricts] = useState(['Quận 1']);
  const [days, setDays] = useState(3);
  const [placesPerDay, setPlacesPerDay] = useState(4);
  const [pace, setPace] = useState('moderate');
  const [budget, setBudget] = useState(5_000_000);
  const [companion, setCompanion] = useState('friends');
  const [memberCount, setMemberCount] = useState(4);
  const [transportMode, setTransportMode] = useState('grab_bike');
  const [preferences, setPreferences] = useState(['food', 'culture']);
  const [specialNotes, setSpecialNotes] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [concept, setConcept] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);

  const defaultStartRef = useRef(t('form.startDefault'));
  const startRef = useRef(null);
  const budgetRef = useRef(null);

  useEffect(() => {
    const previousDefault = defaultStartRef.current;
    const nextDefault = t('form.startDefault');
    setStartLocation((current) => (current === previousDefault ? nextDefault : current));
    defaultStartRef.current = nextDefault;
  }, [t]);

  const compactVnd = (value) =>
    new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);

  const clearError = () => {
    setError('');
    setErrorField('');
  };

  const showError = (field, message, ref) => {
    setError(message);
    setErrorField(field);
    requestAnimationFrame(() => ref?.current?.focus());
  };

  const togglePreference = (preference) => {
    setPreferences((current) => {
      if (current.includes(preference)) return current.filter((val) => val !== preference);
      if (current.length >= 4) return current;
      return [...current, preference];
    });
  };

  const changeDays = (delta) => {
    setDays((current) => Math.min(14, Math.max(1, current + delta)));
    if (errorField === 'days') clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    clearError();

    const start = startLocation.trim();
    if (!start) {
      showError('start', t('form.validation.start'), startRef);
      return;
    }
    if (districts.length === 0) {
      setError(lang === 'vi' ? 'Hãy chọn ít nhất một quận ưu tiên.' : 'Choose at least one preferred district.');
      return;
    }
    if (preferences.length === 0) {
      setError(lang === 'vi' ? 'Hãy chọn ít nhất một sở thích.' : 'Choose at least one travel preference.');
      return;
    }
    if (days < 1 || days > 14) {
      showError('days', t('form.validation.days'));
      return;
    }
    if (!budget || budget <= 0) {
      showError('budget', t('form.validation.budget'), budgetRef);
      return;
    }

    setSubmitting(true);
    if (DEMO) {
      navigate('/trip/demo');
      return;
    }

    const payload = {
      start_location: start,
      districts,
      budget: Math.round(budget),
      days,
      places_per_day: placesPerDay,
      pace,
      companion,
      member_count: companion === 'solo' ? 1 : memberCount,
      transport_mode: transportMode,
      preferences,
      special_notes: specialNotes.trim()
    };

    try {
      setPendingTrip(payload);
      setConcept(await api.suggestTripConcept(payload));
    } catch (requestError) {
      setError(requestError?.message || translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveConcept = async () => {
    if (!pendingTrip || !concept || submitting) return;
    setSubmitting(true);
    clearError();

    try {
      const generated = await api.generateAiItinerary({
        ...pendingTrip,
        approved_concept: concept
      });
      const trip = await api.createTrip({
        ...pendingTrip,
        itinerary_items: generated.itinerary_items
      });
      navigate(`/trip/${trip.id}`);
    } catch (requestError) {
      setError(requestError?.message || translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-soft backdrop-blur sm:p-7"
      noValidate
    >
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
            <Sparkles className="h-3 w-3" />
            {lang === 'vi' ? 'Thiết lập lịch trình thông minh' : 'Smart Itinerary Planner'}
          </span>
          <h3 className="mt-1.5 font-display text-xl font-extrabold text-slate-900">
            {lang === 'vi' ? 'Lên kế hoạch du lịch TP.HCM' : 'Plan your Ho Chi Minh City Trip'}
          </h3>
        </div>
      </div>

      <div className="space-y-5">
        {/* Điểm xuất phát */}
        <div>
          <label className="label" htmlFor="trip-start">
            {t('form.startLabel')}
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <input
              ref={startRef}
              id="trip-start"
              type="text"
              value={startLocation}
              onChange={(event) => {
                setStartLocation(event.target.value);
                if (errorField === 'start') clearError();
              }}
              placeholder={t('form.startPlaceholder')}
              maxLength={200}
              className="input pl-10"
            />
          </div>

          {/* CHỌN NHANH QUẬN 1-CHẠM (QUICK DISTRICT PILLS) */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600">
                {lang === 'vi' ? 'Chọn quận ưu tiên khám phá (có thể chọn nhiều):' : 'Preferred districts (choose one or more):'}
              </span>
              <span className="text-[10px] font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                {districts.length} {lang === 'vi' ? 'quận đã chọn' : 'selected'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DISTRICT_SHORTCUTS.map((d) => {
                const isSelected = districts.includes(d.name);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDistricts((current) => (
                        current.includes(d.name)
                          ? current.filter((district) => district !== d.name)
                          : [...current, d.name]
                      ));
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all border shadow-2xs active:scale-95',
                      isSelected
                        ? 'border-brand-600 bg-brand-600 text-white shadow-xs ring-2 ring-brand-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300 hover:bg-white'
                    )}
                  >
                    <span>{d.icon}</span>
                    <span>{d.name}</span>
                    {d.highlight && <span className="text-[10px] opacity-75 font-normal">({d.highlight})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Số ngày và nhịp độ chuyến đi */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span id="trip-days-label" className="label">{t('form.daysLabel')}</span>
            <div
              role="group"
              aria-labelledby="trip-days-label"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-1.5"
            >
              <button
                type="button"
                onClick={() => changeDays(-1)}
                disabled={days <= 1}
                aria-label={t('form.daysDecrease')}
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-display text-lg font-extrabold text-slate-900">
                {t('common.days', { count: days })}
              </span>
              <button
                type="button"
                onClick={() => changeDays(1)}
                disabled={days >= 14}
                aria-label={t('form.daysIncrease')}
                className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
              {lang === 'vi' ? 'Từ 1 đến 14 ngày' : 'From 1 to 14 days'}
            </p>
          </div>

          <div>
            <label className="label">
              {lang === 'vi' ? 'Nhịp độ chuyến đi' : 'Trip pace'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PACE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPace(opt.id);
                    setPlacesPerDay(opt.count);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border py-2 text-center transition-all',
                    pace === opt.id
                      ? 'border-brand-500 bg-brand-50 font-bold text-brand-700 ring-2 ring-brand-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span className="text-xs font-extrabold">{lang === 'vi' ? opt.labelVi : opt.labelEn}</span>
                  <span className="mt-0.5 text-[9px] text-slate-400">{opt.count} {lang === 'vi' ? 'điểm/ngày' : 'stops/day'}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
              {lang === 'vi'
                ? PACE_OPTIONS.find((option) => option.id === pace)?.subVi
                : PACE_OPTIONS.find((option) => option.id === pace)?.subEn}
            </p>
          </div>
        </div>

        {/* Ngân sách */}
        <div>
          <label className="label" htmlFor="trip-budget">
            {t('form.budgetLabel')}
          </label>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-500" />
            <input
              ref={budgetRef}
              id="trip-budget"
              type="number"
              inputMode="numeric"
              min="0"
              step="50000"
              value={budget || ''}
              onChange={(event) => {
                setBudget(Number(event.target.value));
                if (errorField === 'budget') clearError();
              }}
              className="input pl-10 pr-14 font-semibold"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold tracking-wider text-slate-500">
              VND
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {BUDGET_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBudget(val)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors',
                  budget === val
                    ? 'border-accent-400 bg-accent-50 text-accent-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-accent-300'
                )}
              >
                {compactVnd(val)} ₫
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-slate-500">
            ≈ {formatVnd(budget, lang)} ·{' '}
            {companion !== 'solo' && memberCount > 1
              ? lang === 'vi'
                ? `Tổng chi phí nhóm (Khoảng ${formatVnd(Math.round(budget / memberCount), lang)}/người)`
                : `Group budget (${formatVnd(Math.round(budget / memberCount), lang)}/person)`
              : lang === 'vi'
              ? `Khoảng ${formatVnd(Math.round(budget / days), lang)}/ngày`
              : 'Per person'}
          </p>
        </div>

        {/* Đối tượng đi cùng & Phương tiện */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              {lang === 'vi' ? 'Bạn đi cùng ai?' : 'Travel companions'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMPANIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = companion === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCompanion(item.id);
                      if (item.id === 'solo') setMemberCount(1);
                      else if (item.id === 'couple') setMemberCount(2);
                      else if (memberCount < 3) setMemberCount(4);
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center text-xs font-bold transition-all',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-brand-600" />
                    <span>{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Nếu đi theo nhóm: Chọn số lượng thành viên */}
            {(companion === 'friends' || companion === 'family') && (
              <div className="mt-2.5 rounded-2xl border border-brand-200/80 bg-brand-50/50 p-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-brand-900">
                    {lang === 'vi' ? 'Số thành viên nhóm:' : 'Group size:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMemberCount((c) => Math.max(2, c - 1))}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-display text-sm font-extrabold text-brand-800 min-w-[3.2rem] text-center">
                      {memberCount} {lang === 'vi' ? 'người' : 'pax'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMemberCount((c) => Math.min(20, c + 1))}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Phím tắt chọn nhanh */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold">Nhanh:</span>
                  {[2, 3, 4, 5, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMemberCount(num)}
                      className={cn(
                        'rounded-lg border px-2 py-0.5 text-[10.5px] font-bold transition-all',
                        memberCount === num
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                      )}
                    >
                      {num} {lang === 'vi' ? 'người' : 'p'}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-[10.5px] text-brand-800 leading-normal">
                  {transportMode === 'grab_bike'
                    ? (lang === 'vi'
                        ? `💡 Đi nhóm ${memberCount} người: Chi phí ăn uống & vé tính theo từng người. Nếu bắt GrabBike, hệ thống tự động tính ${memberCount} xe GrabBike (${memberCount} tài xế) để đưa đón cả đoàn.`
                        : `Group of ${memberCount}: Costs per person. ${memberCount} GrabBikes will be booked.`)
                    : (lang === 'vi'
                        ? `💡 Đi nhóm ${memberCount} người: Chi phí ăn uống & vé tính theo từng người. Xe GrabCar/Taxi dùng chung cả nhóm.`
                        : `Group of ${memberCount}: Costs per person. Shared GrabCar.`)}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="label">
              {lang === 'vi' ? 'Phương tiện ưu tiên' : 'Preferred transport'}
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {TRANSPORTS.map((item) => {
                const Icon = item.icon;
                const isSelected = transportMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTransportMode(item.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-bold transition-all',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sở thích */}
        <div>
          <div className="flex items-end justify-between gap-2">
            <span className="label !mb-0">{t('form.preferencesLabel')}</span>
            <span className="text-[10px] font-bold text-slate-500">
              {preferences.length}/4 · {t('form.preferencesHint')}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {preferenceOptions.map((preference) => {
              const meta = getCategoryMeta(PREFERENCE_CATEGORY[preference]);
              const Icon = meta.icon;
              const selected = preferences.includes(preference);
              const maxed = preferences.length >= 4 && !selected;
              return (
                <button
                  key={preference}
                  type="button"
                  onClick={() => togglePreference(preference)}
                  disabled={maxed}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 text-left text-[11px] font-bold transition-all',
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    maxed && 'cursor-not-allowed opacity-45'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-lg border',
                      selected ? 'border-white bg-white' : meta.tile
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t(`preference.${preference}`)}</span>
                  {selected && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ghi chú đặc biệt */}
        <div>
          <label className="label" htmlFor="trip-special-notes">
            {lang === 'vi' ? 'Ghi chú đặc biệt (không bắt buộc)' : 'Special notes (optional)'}
          </label>
          <textarea
            id="trip-special-notes"
            value={specialNotes}
            onChange={(event) => setSpecialNotes(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={lang === 'vi'
              ? 'Ví dụ: ăn chay, kiêng cay, có trẻ nhỏ, hạn chế đi bộ xa...'
              : 'For example: vegetarian, avoid spicy food, traveling with children, limit long walks...'}
            className="input min-h-[82px] resize-y py-2.5"
          />
          <p className="mt-1 text-right text-[10px] font-medium text-slate-400">{specialNotes.length}/500</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full !py-3.5 text-sm font-extrabold shadow-glow"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{lang === 'vi' ? 'Đang tạo lịch trình tối ưu...' : 'Generating Itinerary...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{lang === 'vi' ? 'Tạo lịch trình AI Sài Gòn ngay' : 'Generate AI Itinerary'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
    {concept && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-concept-title"
      >
        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 bg-brand-50/70 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[10px] font-bold text-brand-700">
                  <Sparkles className="h-3 w-3" />
                  {lang === 'vi' ? 'Đề xuất từ AI' : 'AI trip concept'}
                </span>
                <h3 id="trip-concept-title" className="mt-2 font-display text-xl font-extrabold text-slate-900">
                  {lang === 'vi' ? 'Concept chuyến đi của bạn' : 'Your trip concept'}
                </h3>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setConcept(null); setPendingTrip(null); clearError(); }}
                className="rounded-full p-2 text-slate-500 hover:bg-white disabled:opacity-50"
                aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-slate-700">{concept.summary}</p>

            {concept.highlights?.length > 0 && (
              <section>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  {lang === 'vi' ? 'Điểm nổi bật' : 'Highlights'}
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {concept.highlights.map((highlight, index) => (
                    <li key={`${highlight}-${index}`} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-brand-600">•</span>{highlight}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {concept.recommended_districts?.length > 0 && (
              <section>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  {lang === 'vi' ? 'Quận dự kiến' : 'Recommended districts'}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {concept.recommended_districts.map((district) => (
                    <span key={district} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                      {district}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                {lang === 'vi' ? 'Hướng đi tổng quát' : 'Route overview'}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{concept.route_overview}</p>
            </section>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}

            <p className="text-sm font-bold text-slate-900">
              {concept.confirmation_question || (lang === 'vi' ? 'Bạn có đồng ý với concept này không?' : 'Do you agree with this concept?')}
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setConcept(null); setPendingTrip(null); clearError(); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {lang === 'vi' ? 'Quay lại chỉnh form' : 'Back to form'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApproveConcept}
                className="btn-primary justify-center !py-2.5 text-xs font-extrabold disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{lang === 'vi' ? 'Đang tạo lịch trình...' : 'Building itinerary...'}</>
                ) : (
                  <>{lang === 'vi' ? 'Đồng ý, tạo lịch trình' : 'Approve and build itinerary'}<ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
