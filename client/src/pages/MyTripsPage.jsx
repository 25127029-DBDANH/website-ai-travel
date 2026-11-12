import {
  CalendarDays,
  Copy,
  EllipsisVertical,
  Link2,
  Loader2,
  Luggage,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Modal from '../components/Modal.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api, assetUrl } from '../lib/api.js';
import { translateApiError } from '../lib/errors.js';
import { formatRelativeTime, formatVnd } from '../lib/format.js';
import { isSkipped, skipForNow } from '../lib/skip.js';

const BANNER_KEY = 'trips-guest-banner';

function TripCard({ trip, lang, t, menuOpen, onToggleMenu, onRename, onDuplicate, onShare, onDelete, busy }) {
  const created = formatRelativeTime(lang, trip.created_at);
  const cover = trip.cover_photo ? assetUrl(trip.cover_photo) : null;
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const menuTabCloseRef = useRef(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    menuTabCloseRef.current = false;
    menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    return () => {
      if (!menuTabCloseRef.current) menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onToggleMenu();
      return;
    }
    if (event.key === 'Tab') {
      menuTabCloseRef.current = true;
      menuButtonRef.current?.focus();
      onToggleMenu();
      return;
    }

    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    items[nextIndex].focus();
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-900/5 transition-[transform,border-color,box-shadow] duration-300 ease-out-strong hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
      <div className="relative h-32 shrink-0 overflow-hidden sm:h-36">
        {cover ? (
          <img
            src={cover}
            alt={trip.cover_place_name || ''}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out-strong group-hover:scale-[1.06]"
          />
        ) : (
          <div className="bg-saigon-dawn absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-slate-900/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-accent-400" />

        {trip.is_shared ? (
          <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/55 px-2 py-0.5 text-[9.5px] font-bold text-white backdrop-blur">
            <Link2 className="h-3 w-3" />
            {t('myTrips.shared')}
          </span>
        ) : null}

        <div className="absolute right-2.5 top-2.5 z-10">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={t('myTrips.menu')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
            className="touch-target grid place-items-center rounded-full bg-white/85 p-1.5 text-slate-500 shadow-sm backdrop-blur transition-[transform,color,background-color] duration-200 ease-out-strong hover:bg-white hover:text-slate-900 active:scale-90"
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={onToggleMenu}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                ref={menuRef}
                role="menu"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-soft"
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={onRename}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors duration-150 ease-out-strong hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('myTrips.menu.rename')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={onDuplicate}
                  disabled={busy}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors duration-150 ease-out-strong hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {t('myTrips.menu.duplicate')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={onShare}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors duration-150 ease-out-strong hover:bg-slate-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t('myTrips.menu.share')}
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={onDelete}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors duration-150 ease-out-strong hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('myTrips.menu.delete')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <Link
          to={`/trip/${trip.id}`}
          className="line-clamp-2 rounded font-display text-base font-extrabold leading-snug text-slate-900 transition-colors duration-200 ease-out-strong hover:text-brand-700"
        >
          {trip.title || t('trip.custom')}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-accent-500" />
            {formatVnd(trip.total_estimated, lang)} / {formatVnd(trip.budget, lang)}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
            {t('itinerary.stops', { count: trip.place_count })}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
          <span className="text-[10.5px] font-semibold text-slate-500">
            {t('myTrips.created', { when: created })}
          </span>
          <Link
            to={`/trip/${trip.id}`}
            className="touch-target inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-slate-800 active:scale-[0.97]"
          >
            {t('myTrips.open')}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function MyTripsPage() {
  const { lang, t } = useI18n();
  const { user, openAuth } = useAuth();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTrips = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setError('');
      try {
        const data = await api.listTrips();
        setTrips(data.trips || []);
      } catch (requestError) {
        setError(translateApiError(t, requestError));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips, user?.id]);

  useEffect(() => {
    setBannerVisible(!user && !isSkipped(BANNER_KEY));
  }, [user]);

  const dismissBanner = () => {
    skipForNow(BANNER_KEY, 7);
    setBannerVisible(false);
  };

  const openRename = (trip) => {
    setMenuId(null);
    setRenameTarget(trip);
    setRenameValue(trip.title || t('trip.custom'));
  };

  const handleRename = async (event) => {
    event.preventDefault();
    const title = renameValue.trim();
    if (!renameTarget || !title || renaming) return;

    setRenaming(true);
    try {
      const updated = await api.updateTrip(renameTarget.id, { title });
      setTrips((current) =>
        current.map((trip) =>
          trip.id === renameTarget.id ? { ...trip, title: updated.title } : trip
        )
      );
      setToast({ message: t('myTrips.rename.success'), tone: 'success' });
      setRenameTarget(null);
    } catch (requestError) {
      setToast({ message: translateApiError(t, requestError), tone: 'error' });
    } finally {
      setRenaming(false);
    }
  };

  const handleDuplicate = async (trip) => {
    setMenuId(null);
    if (busyId) return;
    setBusyId(trip.id);
    try {
      await api.duplicateTrip(trip.id);
      await loadTrips({ quiet: true });
      setToast({ message: t('myTrips.duplicate.success'), tone: 'success' });
    } catch (requestError) {
      setToast({ message: translateApiError(t, requestError), tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.deleteTrip(deleteTarget.id);
      setTrips((current) => current.filter((trip) => trip.id !== deleteTarget.id));
      setToast({ message: t('myTrips.delete.success'), tone: 'success' });
      setDeleteTarget(null);
    } catch (requestError) {
      setToast({ message: translateApiError(t, requestError), tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSharedChange = (shared) => {
    if (!shareTarget) return;
    setTrips((current) =>
      current.map((trip) =>
        trip.id === shareTarget.id ? { ...trip, is_shared: shared } : trip
      )
    );
  };

  if (DEMO) {
    return (
      <div className="min-h-screen bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="page-hero">
            <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[18px] border-white/10" />
            <div className="vn-lotus-light absolute inset-0 opacity-70" aria-hidden="true" />
            <div className="relative flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  <Sparkles className="h-3 w-3" />
                  {t('brand.name')}
                </p>
                <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {t('myTrips.title')}
                </h1>
                <p className="mt-1 text-sm font-medium text-brand-100">{t('myTrips.subtitle')}</p>
              </div>
              <Link
                to="/#plan"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-glow transition-[transform,background-color] duration-200 ease-out-strong hover:-translate-y-0.5 hover:bg-brand-50 active:translate-y-0 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                {t('nav.newTrip')}
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Black key={index} className="h-64 w-full rounded-3xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="page-hero">
          <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[18px] border-white/10" />
          <div className="vn-lotus-light absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                <Sparkles className="h-3 w-3" />
                {t('brand.name')}
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {t('myTrips.title')}
              </h1>
              <p className="mt-1 text-sm font-medium text-brand-100">{t('myTrips.subtitle')}</p>
            </div>
            <Link
              to="/#plan"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-glow transition-[transform,background-color] duration-200 ease-out-strong hover:-translate-y-0.5 hover:bg-brand-50 active:translate-y-0 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              {t('nav.newTrip')}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-card">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button type="button" onClick={() => loadTrips()} className="btn-primary mt-4 text-xs">
              {t('common.retry')}
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="relative mt-10 flex flex-col items-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white p-10 text-center sm:mt-16">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-accent-100/50 blur-3xl" />
            <span className="relative grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-glow ring-4 ring-brand-50">
              <Luggage className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-display text-xl font-extrabold text-slate-900">
              {t('myTrips.empty.title')}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {t('myTrips.empty.body')}
            </p>
            <Link to="/#plan" className="btn-primary mt-6 text-xs">
              {t('myTrips.empty.cta')}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index, 5) * 0.06,
                  ease: [0.23, 1, 0.32, 1]
                }}
                className="h-full"
              >
                <TripCard
                  trip={trip}
                  lang={lang}
                  t={t}
                  menuOpen={menuId === trip.id}
                  onToggleMenu={() => setMenuId((current) => (current === trip.id ? null : trip.id))}
                  onRename={() => openRename(trip)}
                  onDuplicate={() => handleDuplicate(trip)}
                  onShare={() => {
                    setMenuId(null);
                    setShareTarget(trip);
                  }}
                  onDelete={() => {
                    setMenuId(null);
                    setDeleteTarget(trip);
                  }}
                  busy={busyId === trip.id}
                />
              </motion.div>
            ))}
          </div>
        )}

        {bannerVisible ? (
          <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-brand-50 px-4 py-3 shadow-sm">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-brand-700">
                <Luggage className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-brand-900">{t('myTrips.banner.title')}</p>
                <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-brand-800/80">
                  {t('myTrips.banner.body')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="rounded-full bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-800 active:scale-[0.97]"
              >
                {t('auth.signIn')}
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                className="rounded-full border border-brand-300 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-700 transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-100 active:scale-[0.97]"
              >
                {t('skip.notNow')}
              </button>
              <button
                type="button"
                onClick={() => setBannerVisible(false)}
                aria-label={t('skip.close')}
                className="rounded-full p-1.5 text-brand-700/70 transition-[transform,background-color,color] duration-200 ease-out-strong hover:bg-white hover:text-brand-800 active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => (renaming ? null : setRenameTarget(null))}
        title={t('myTrips.rename.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              disabled={renaming}
              className="control-pill !px-4 !py-2"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="rename-trip-form"
              disabled={renaming || !renameValue.trim()}
              className="btn-primary text-xs"
            >
              {renaming ? t('myTrips.rename.saving') : t('myTrips.rename.save')}
            </button>
          </>
        }
      >
        <form id="rename-trip-form" onSubmit={handleRename}>
          <label htmlFor="trip-title" className="text-xs font-bold text-slate-600">
            {t('myTrips.rename.label')}
          </label>
          <input
            id="trip-title"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={120}
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-semibold text-slate-800 transition-[border-color,box-shadow] duration-200 ease-out-strong focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:text-sm"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title={t('myTrips.delete.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="control-pill !px-4 !py-2"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-rose-700 active:scale-[0.97] disabled:opacity-60"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {deleting ? t('myTrips.delete.deleting') : t('myTrips.delete.confirm')}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-500">
          {t('myTrips.delete.body', { title: deleteTarget?.title || t('trip.custom') })}
        </p>
      </Modal>

      <ShareDialog
        open={Boolean(shareTarget)}
        tripId={shareTarget?.id}
        onClose={() => setShareTarget(null)}
        onToast={setToast}
        onSharedChange={handleSharedChange}
      />

      <Toast
        message={toast?.message}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
