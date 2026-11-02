import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700">
            <MapPin className="h-7 w-7" />
          </span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            404
          </p>
          <h1 className="mt-2 font-display text-xl font-extrabold text-slate-900">
            {t('itinerary.notFound.title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('itinerary.notFound.body')}</p>
          <Link to="/" className="btn-primary mt-6">
            {t('nav.backHome')}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
