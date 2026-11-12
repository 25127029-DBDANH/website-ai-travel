import { ArrowLeft, ArrowRight, Briefcase, LogIn, LogOut, Plus, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import Logo from './Logo.jsx';
import LanguageToggle from './LanguageToggle.jsx';

export default function SiteHeader() {
  const { t } = useI18n();
  const { user, loading, openAuth, logout } = useAuth();
  const location = useLocation();
  const isTrip = location.pathname.startsWith('/trip/');
  const isMyTrips = location.pathname === '/trips';
  const isLanding = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
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

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
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
                className="icon-btn"
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
          <LanguageToggle />
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
            className="btn-primary hidden !px-4 !py-2.5 text-xs sm:inline-flex"
          >
            {isTrip || isMyTrips ? <Plus className="h-4 w-4" /> : null}
            {isTrip || isMyTrips ? t('nav.newTrip') : t('nav.plan')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
