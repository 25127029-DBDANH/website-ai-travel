import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  HelpCircle,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  UserRound,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import LanguageToggle from './LanguageToggle.jsx';
import Logo from './Logo.jsx';

export default function SiteHeader() {
  const { t } = useI18n();
  const { user, loading, openAuth, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTrip = location.pathname.startsWith('/trip/');
  const isMyTrips = location.pathname === '/trips';
  const isLanding = location.pathname === '/';

  // Tự động đóng mobile drawer khi chuyển trang hoặc hash đổi
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Khóa cuộn trang khi menu mobile đang mở
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            className="icon-btn flex h-10 w-10 items-center justify-center lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
          </button>

          <Link to="/" aria-label={t('brand.name')} className="touch-target flex items-center">
            <Logo compact className="sm:hidden" />
            <Logo className="hidden sm:inline-flex" />
          </Link>

          {isTrip && (
            <Link to="/" className="control-pill hidden sm:inline-flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('nav.backHome')}
            </Link>
          )}
        </div>

        {isLanding && (
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex">
            <a
              href="#how"
              className="rounded transition-colors duration-200 ease-out-strong hover:text-brand-700"
            >
              {t('nav.howItWorks')}
            </a>
            <a
              href="#features"
              className="rounded transition-colors duration-200 ease-out-strong hover:text-brand-700"
            >
              {t('nav.features')}
            </a>
            <a
              href="#plan"
              className="rounded transition-colors duration-200 ease-out-strong hover:text-brand-700"
            >
              {t('nav.plan')}
            </a>
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {!loading && user ? (
            <div className="flex items-center gap-1">
              <Link
                to="/settings"
                title={t('auth.settings')}
                className="control-pill control-pill-active max-w-[130px]"
              >
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden truncate sm:inline">
                  {user.display_name || user.username}
                </span>
              </Link>
              <button
                type="button"
                onClick={logout}
                aria-label={t('auth.signOut')}
                title={t('auth.signOut')}
                className="icon-btn hidden sm:inline-grid"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : !loading ? (
            <button
              type="button"
              onClick={() => openAuth('login')}
              aria-label={t('auth.signIn')}
              title={t('auth.signIn')}
              className="control-pill"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('auth.signIn')}</span>
            </button>
          ) : null}

          <div className="hidden sm:block">
            <LanguageToggle />
          </div>

          <Link
            to="/trips"
            aria-label={t('nav.myTrips')}
            aria-current={isMyTrips ? 'page' : undefined}
            className={cn('control-pill', isMyTrips && 'control-pill-active')}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('nav.myTrips')}</span>
          </Link>

          <Link
            to={isLanding ? '#plan' : '/#plan'}
            className="btn-primary hidden !px-4 !py-2 text-xs sm:inline-flex"
          >
            {isTrip || isMyTrips ? <Plus className="h-3.5 w-3.5" /> : null}
            {isTrip || isMyTrips ? t('nav.newTrip') : t('nav.plan')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-slate-200 bg-white/95 px-5 py-6 shadow-2xl backdrop-blur-2xl lg:hidden"
            >
              <nav className="flex flex-col gap-1 text-base font-semibold text-slate-800">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Sparkles className="h-5 w-5 text-brand-600" />
                  {t('nav.backHome')}
                </Link>

                <a
                  href="/#how"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <HelpCircle className="h-5 w-5 text-slate-500" />
                  {t('nav.howItWorks')}
                </a>

                <a
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Sparkles className="h-5 w-5 text-accent-500" />
                  {t('nav.features')}
                </a>

                <a
                  href="/#plan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-brand-600 hover:bg-brand-50 active:bg-brand-100"
                >
                  <Plus className="h-5 w-5 text-brand-600" />
                  {t('nav.plan')}
                </a>

                <div className="my-2 border-t border-slate-100" />

                <Link
                  to="/trips"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 active:bg-slate-100',
                    isMyTrips && 'bg-brand-50 text-brand-700'
                  )}
                >
                  <Briefcase className="h-5 w-5 text-brand-600" />
                  {t('nav.myTrips')}
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Settings className="h-5 w-5 text-slate-500" />
                  {t('auth.settings')}
                </Link>

                <div className="my-2 border-t border-slate-100" />

                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm font-semibold text-slate-500">Ngôn ngữ / Language</span>
                  <LanguageToggle />
                </div>

                {!loading && user ? (
                  <div className="mt-2 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700 font-bold">
                        {(user.display_name || user.username || 'U')[0].toUpperCase()}
                      </span>
                      <div className="truncate text-xs font-semibold text-slate-700">
                        <p className="truncate font-bold text-slate-900">{user.display_name || user.username}</p>
                        <p className="truncate text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="touch-target flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('auth.signOut')}
                    </button>
                  </div>
                ) : !loading ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuth('login');
                    }}
                    className="btn-primary mt-3 w-full"
                  >
                    <LogIn className="h-4 w-4" />
                    {t('auth.signIn')}
                  </button>
                ) : null}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
