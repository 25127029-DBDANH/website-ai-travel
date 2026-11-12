import {
  ArrowLeft,
  ClipboardCopy,
  Loader2,
  MapPin,
  Share2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ItineraryPanel from '../components/itinerary/ItineraryPanel.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api, ApiError } from '../lib/api.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';

export default function SharedTripPage() {
  const { token } = useParams();
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(1);
  const [copying, setCopying] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    document.head.appendChild(meta);
    if (data?.trip?.title) {
      document.title = `${data.trip.title} · ${t('shared.badge')}`;
    }
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, [data?.trip?.title, t]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    setData(null);

    api
      .getSharedTrip(token)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 404) {
          setNotFound(true);
        } else {
          setError(translateApiError(t, requestError));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, t]);

  const handleCopyToMyTrips = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const { id } = await api.cloneSharedTrip(token);
      navigate(`/trip/${id}`);
    } catch (requestError) {
      setToast({ message: translateApiError(t, requestError), tone: 'error' });
      setCopying(false);
    }
  };

  if (DEMO) {
    return (
      <div className="min-h-screen bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
                <Share2 className="h-3 w-3" />
                {t('shared.badge')}
              </span>
              <Black className="h-7 w-64 rounded-lg" />
              <Black className="h-3 w-44 rounded-full" />
            </div>
            <button type="button" disabled className="btn-primary !px-4 !py-2.5 text-xs">
              <ClipboardCopy className="h-4 w-4" />
              {t('shared.copy')}
            </button>
          </div>

          <div className="mt-4 h-[calc(100dvh-12rem)] min-h-[520px]">
            <ItineraryPanel demo />
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-4 h-[55vh] animate-pulse rounded-3xl border border-slate-200 bg-white" />
        </main>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700">
              <MapPin className="h-7 w-7" />
            </span>
            <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
              {notFound ? t('shared.notFound.title') : t('chat.error')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {notFound ? t('shared.notFound.body') : error}
            </p>
            <Link to="/" className="btn-primary mt-6 text-xs">
              <ArrowLeft className="h-4 w-4" />
              {t('nav.backHome')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { trip, itinerary_items: items, budget_summary: budget } = data;

  return (
    <div className="min-h-screen bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
              <Share2 className="h-3 w-3" />
              {t('shared.badge')}
            </span>
            <h1 className="mt-2 font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {trip.title || t('trip.custom')}
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {t('common.days', { count: Number(trip.days) || 1 })} ·{' '}
              {formatVnd(trip.budget, lang)} · {t('shared.viewOnly')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyToMyTrips}
            disabled={copying}
            className="btn-primary !px-4 !py-2.5 text-xs"
          >
            {copying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCopy className="h-4 w-4" />
            )}
            {copying ? t('shared.copying') : t('shared.copy')}
          </button>
        </div>

        <div className="mt-4 h-[calc(100dvh-12rem)] min-h-[520px]">
          <ItineraryPanel
            trip={trip}
            items={items}
            budget={budget}
            status={trip.status}
            activeDay={activeDay}
            onSelectDay={setActiveDay}
            loading={false}
          />
        </div>
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
