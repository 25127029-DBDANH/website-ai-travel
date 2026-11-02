import { ArrowUpRight, Heart, Mail, Phone } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.jsx';
import Logo from './Logo.jsx';

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">{t('footer.note')}</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {t('brand.tagline')}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm font-semibold text-slate-600">
            <a href="#how" className="inline-flex items-center gap-1.5 rounded transition-colors duration-200 ease-out-strong hover:text-brand-700">
              {t('nav.howItWorks')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a href="#features" className="inline-flex items-center gap-1.5 rounded transition-colors duration-200 ease-out-strong hover:text-brand-700">
              {t('nav.features')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a href="#plan" className="inline-flex items-center gap-1.5 rounded transition-colors duration-200 ease-out-strong hover:text-brand-700">
              {t('nav.plan')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {t('hero.badge')}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            {t('footer.rights')}
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          </p>
          <p className="mt-6 text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} {t('brand.name')}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {t('footer.contact')}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm font-semibold text-slate-600">
            <a
              href="mailto:phamgiah602@gmail.com"
              className="inline-flex items-center gap-1.5 rounded transition-colors duration-200 ease-out-strong hover:text-brand-700"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              group7@gmail.com
            </a>
            <a
              href="tel:+840348940290"
              className="inline-flex items-center gap-1.5 rounded transition-colors duration-200 ease-out-strong hover:text-brand-700"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              (+84) 034xxxxxxx
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
