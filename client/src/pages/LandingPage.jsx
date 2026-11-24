import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Compass,
  MapPin,
  MessageCircle,
  Wallet
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryTile from '../components/CategoryTile.jsx';
import PhotoMarquee from '../components/landing/PhotoMarquee.jsx';
import Reveal from '../components/Reveal.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import TripForm from '../components/TripForm.jsx';
import CuratedTripCard from '../components/CuratedTripCard.jsx';
import { CURATED_TRIPS } from '../lib/curatedTrips.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { formatDayLabel, formatVnd } from '../lib/format.js';

const MOCK_STOPS = [
  { time: '09:00', titleKey: 'hero.card.morning', category: 'sightseeing', areaKey: 'hero.card.area3' },
  { time: '11:30', titleKey: 'hero.card.lunch', category: 'food', areaKey: 'hero.card.area1' },
  { time: '14:30', titleKey: 'hero.card.afternoon', category: 'cafe', areaKey: 'hero.card.area1' }
];

const HOW_ICONS = [CalendarDays, MessageCircle, Compass];
const FEATURE_ICONS = [MapPin, Wallet, MessageCircle, CalendarDays];

export default function LandingPage() {
  const { lang, t } = useI18n();
  const location = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      );
    }
  }, [location.hash, reduced]);

  const heroNotes = t('hero.note').split(' · ');

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <main>
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-8 sm:gap-14 sm:px-6 sm:pb-20 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-16">
            <div>
              <h1 className="font-display text-[32px] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {t('hero.title')}
                <span className="mt-1 block text-brand-600">{t('hero.titleAccent')}</span>
              </h1>

              <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-[17px]">
                {t('hero.subtitle')}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#plan" className="btn-primary !px-6 !py-3.5">
                  {t('hero.cta')}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#how" className="btn-secondary !px-6 !py-3.5">
                  {t('hero.secondary')}
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {heroNotes.map((note) => (
                  <span
                    key={note}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {note}
                  </span>
                ))}
              </div>

              <div className="mt-9 grid max-w-lg grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                {[
                  ['stats.places', 'stats.places.value'],
                  ['stats.budget', 'stats.budget.value'],
                  ['stats.chat', 'stats.chat.value']
                ].map(([prefix, valueKey]) => (
                  <div key={prefix}>
                    <p className="font-display text-xl font-extrabold tracking-tight text-brand-700 sm:text-2xl">
                      {t(valueKey)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium leading-snug text-slate-600">
                      {t(`${prefix}.label`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
                      <MapPin className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="font-display text-sm font-extrabold text-slate-900">
                        {t('hero.card.title')}
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        {t('hero.card.subtitle')}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {t('hero.card.badge')}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-900 p-3.5 text-white">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {t('hero.card.budget')}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold">
                        {formatVnd(3_150_000, lang)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {t('hero.card.remaining')}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-[63%] rounded-full bg-emerald-400" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-medium text-slate-300">
                    <span>{formatVnd(3_150_000, lang)}</span>
                    <span>{formatVnd(5_000_000, lang)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-0">
                  {MOCK_STOPS.map((stop, index) => (
                    <div key={stop.titleKey} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <CategoryTile category={stop.category} size="sm" />
                        {index < MOCK_STOPS.length - 1 && (
                          <span className="my-1 w-px flex-1 border-l border-dashed border-slate-300" />
                        )}
                      </div>
                      <div className={index < MOCK_STOPS.length - 1 ? 'min-w-0 flex-1 pb-3.5' : 'min-w-0 flex-1'}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {t(stop.titleKey)}
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {stop.time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-slate-600">
                          {t(stop.areaKey)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                  {[1, 2, 3].map((day) => (
                    <span
                      key={day}
                      className={
                        day === 1
                          ? 'rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white'
                          : 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
                      }
                    >
                      {formatDayLabel(lang, day)}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Wallet className="h-3 w-3" />
                    VND
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PhotoMarquee />

        <section id="how" className="scroll-mt-16 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('how.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('how.subtitle')}
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((step, index) => {
                const Icon = HOW_ICONS[index];
                return (
                  <Reveal
                    as="article"
                    key={step}
                    delay={index * 70}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-sm font-bold text-slate-400">
                        0{step}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                      {t(`how.step${step}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {t(`how.step${step}.desc`)}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {t('features.title')}
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((feature, index) => {
                const Icon = FEATURE_ICONS[index];
                return (
                  <Reveal
                    as="article"
                    key={feature}
                    delay={index * 70}
                    className="rounded-2xl border border-slate-800 bg-slate-800/70 p-5"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-700 text-accent-400">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="mt-4 font-display text-sm font-bold text-white">
                      {t(`features.f${feature}.title`)}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {t(`features.f${feature}.desc`)}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="curated" className="border-b border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('curated.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {t('curated.subtitle')}
              </p>
            </Reveal>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CURATED_TRIPS.map((curated) => (
                <CuratedTripCard key={curated.id} trip={curated} />
              ))}
            </div>
          </div>
        </section>

        <section id="plan" className="scroll-mt-16 border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
            <Reveal>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('form.title')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                {t('form.subtitle')}
              </p>

              <div className="mt-7 space-y-4">
                {[1, 2, 3].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {t(`features.f${feature}.title`)}
                      </p>
                      <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-slate-600">
                        {t(`features.f${feature}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <MapPin className="h-4 w-4 text-brand-600" />
                {t('hero.note')}
              </div>
            </Reveal>

            <Reveal delay={90}>
              <TripForm />
            </Reveal>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-2xl bg-brand-700 px-6 py-12 text-center sm:px-12">
            <Reveal>
              <h2 className="flex items-center justify-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                <MapPin className="h-6 w-6 shrink-0 text-accent-300" strokeWidth={2.2} />
                {t('cta.title')}
              </h2>
              <p className="mt-2 text-sm text-brand-100">{t('cta.subtitle')}</p>
              <div className="mt-6">
                <a
                  href="#plan"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-[transform,background-color] duration-200 ease-out-strong hover:bg-brand-50 active:scale-[0.97]"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
