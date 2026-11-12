import {
  ArrowRight,
  Bike,
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
  cafe: 'cafe',
  shopping: 'shopping',
  nature: 'nature',
  nightlife: 'entertainment'
};

const BUDGET_PRESETS = [2_000_000, 3_000_000, 5_000_000, 10_000_000];

const COMPANIONS = [
  { id: 'solo', labelVi: 'Một mình', labelEn: 'Solo', icon: User },
  { id: 'couple', labelVi: 'Cặp đôi', labelEn: 'Couple', icon: Heart },
  { id: 'friends', labelVi: 'Nhóm bạn', labelEn: 'Friends', icon: Users },
  { id: 'family', labelVi: 'Gia đình', labelEn: 'Family', icon: Users }
];

const TRANSPORTS = [
  { id: 'grab_bike', labelVi: 'GrabBike / Xe máy', labelEn: 'GrabBike / Motorbike', icon: Bike },
  { id: 'grab_car', labelVi: 'GrabCar / Taxi', labelEn: 'GrabCar / Taxi', icon: Car },
  { id: 'public', labelVi: 'Xe buýt / Đi bộ', labelEn: 'Bus / Walking', icon: Footprints }
];

const PLACES_PER_DAY_OPTIONS = [
  { count: 3, labelVi: '3 điểm', subVi: 'Thong thả, chill' },
  { count: 4, labelVi: '4 điểm', subVi: 'Chuẩn cân bằng ⭐' },
  { count: 5, labelVi: '5 điểm', subVi: 'Khám phá nhiều' },
  { count: 6, labelVi: '6 điểm', subVi: 'Tối đa, năng động' }
];

export default function TripForm() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [startLocation, setStartLocation] = useState(() => t('form.startDefault'));
  const [days, setDays] = useState(3);
  const [placesPerDay, setPlacesPerDay] = useState(4);
  const [budget, setBudget] = useState(5_000_000);
  const [companion, setCompanion] = useState('friends');
  const [transportMode, setTransportMode] = useState('grab_bike');
  const [preferences, setPreferences] = useState(['food', 'culture']);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setDays((current) => Math.min(7, Math.max(1, current + delta)));
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

    try {
      const trip = await api.createTrip({
        start_location: start,
        budget: Math.round(budget),
        days,
        places_per_day: placesPerDay,
        companion,
        transport_mode: transportMode,
        preferences
      });
      navigate(`/trip/${trip.id}`);
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        </div>

        {/* Số ngày & Số địa điểm mỗi ngày (Yêu cầu mới) */}
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
                disabled={days >= 7}
                aria-label={t('form.daysIncrease')}
                className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
              {lang === 'vi' ? 'Khuyên dùng từ 1 đến 5 ngày tại TP.HCM' : 'Recommended 1 - 5 days in HCMC'}
            </p>
          </div>

          <div>
            <label className="label">
              {lang === 'vi' ? 'Số địa điểm muốn đi mỗi ngày' : 'Places to visit per day'}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PLACES_PER_DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setPlacesPerDay(opt.count)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border py-2 text-center transition-all',
                    placesPerDay === opt.count
                      ? 'border-brand-500 bg-brand-50 font-bold text-brand-700 ring-2 ring-brand-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span className="text-xs font-extrabold">{opt.labelVi}</span>
                  <span className="mt-0.5 text-[9px] text-slate-400">
                    {opt.count === 4 ? 'Cân bằng' : opt.count === 3 ? 'Chill' : 'Nhiều'}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
              {PLACES_PER_DAY_OPTIONS.find((o) => o.count === placesPerDay)?.subVi}
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
            ≈ {formatVnd(budget, lang)} · {lang === 'vi' ? `Khoảng ${formatVnd(Math.round(budget / days), lang)}/ngày` : 'Per person'}
          </p>
        </div>

        {/* Đối tượng đi cùng & Phương tiện */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              {lang === 'vi' ? 'Bạn đi cùng ai?' : 'Travel companions'}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {COMPANIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = companion === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCompanion(item.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-bold transition-all',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{lang === 'vi' ? item.labelVi : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
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
  );
}
