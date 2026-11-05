import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Sparkles,
  Wallet
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryTile from '../components/CategoryTile.jsx';
import MagneticButton from '../components/landing/MagneticButton.jsx';
import PhotoMarquee from '../components/landing/PhotoMarquee.jsx';
import SpotlightCard from '../components/landing/SpotlightCard.jsx';
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

const HOW_ICONS = [CalendarDays, MessageCircle, Sparkles];
const FEATURE_ICONS = [MapPin, Wallet, MessageCircle, Sparkles];

export default function LandingPage() {
  const { lang, t } = useI18n();
  const location = useLocation();
  const heroRef = useRef(null);
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

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const blobLeftY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const blobRightY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const mockY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const parallax = (value) => (reduced ? undefined : { y: value });

  const heroNotes = t('hero.note').split(' · ');

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <main>
        <section ref={heroRef} className="relative overflow-hidden bg-mesh">
          <motion.div
            style={parallax(blobLeftY)}
            className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
          />
          <motion.div
            style={parallax(blobRightY)}
            className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-accent-200/40 blur-3xl"
          />
          <div className="vn-pattern absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="grain absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-8 sm:gap-14 sm:px-6 sm:pb-20 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-20">
            <div className="animate-fade-up">
              <h1 className="font-display text-[32px] sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] sm:leading-[1.18] tracking-tight text-slate-900">
                {t('hero.title')}
                <span className="mt-1 block text-brand-600">
                  {t('hero.titleAccent')}
                </span>
              </h1>

              <p className="mt-4 sm:mt-5 max-w-xl text-balance text-base leading-relaxed text-slate-800 sm:text-[17px]">
                {t('hero.subtitle')}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton>
                  <a href="#plan" className="btn-primary !px-6 !py-3.5">
                    {t('hero.cta')}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </MagneticButton>
                <MagneticButton strength={0.14}>
                  <a href="#how" className="btn-secondary !px-6 !py-3.5">
                    {t('hero.secondary')}
                  </a>
                </MagneticButton>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {heroNotes.map((note) => (
                  <span
                    key={note}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {note}
                  </span>
                ))}
              </div>

              <div className="mt-9 grid max-w-lg grid-cols-3 gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                {[
                  ['stats.places', 'stats.places.value'],
                  ['stats.budget', 'stats.budget.value'],
                  ['stats.chat', 'stats.chat.value']
                ].map(([prefix, valueKey]) => (
                  <div key={prefix}>
                    <p className="font-display text-xl font-extrabold tracking-tight text-brand-700 sm:text-2xl">
                      {t(valueKey)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-700">
                      {t(`${prefix}.label`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              style={parallax(mockY)}
              className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]"
            >
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-brand-200/70 via-white to-accent-200/70 blur-2xl" />

              <SpotlightCard className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/95 p-4 shadow-soft backdrop-blur sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-glow">
                      <MapPin className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                    <div>
                      <p className="font-display text-sm font-extrabold text-slate-900">
                        {t('hero.card.title')}
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {t('hero.card.subtitle')}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                    <Sparkles className="h-3 w-3" />
                    {t('hero.card.badge')}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-900 p-3.5 text-white">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                        {t('hero.card.budget')}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold">
                        {formatVnd(3_150_000, lang)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {t('hero.card.remaining')}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-[63%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-semibold text-white/70">
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
                          <p className="truncate text-xs font-extrabold text-slate-800">
                            {t(stop.titleKey)}
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {stop.time}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
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
                          ? 'rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-bold text-white'
                          : 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'
                      }
                    >
                      {formatDayLabel(lang, day)}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                    <Wallet className="h-3 w-3" />
                    VND
                  </span>
                </div>
              </SpotlightCard>

              <div className="absolute -bottom-16 -left-4 hidden items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-soft backdrop-blur animate-float sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('itinerary.budget.health.under')}
                  </p>
                  <p className="text-xs font-extrabold text-slate-800">
                    {formatVnd(1_850_000, lang)}
                  </p>
                </div>
              </div>

              <div className="absolute -right-3 -top-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-500 text-white shadow-glow animate-float [animation-delay:1.2s]">
                <MapPin className="h-5 w-5" strokeWidth={2.4} />
              </div>
            </motion.div>
          </div>
        </section>

        <PhotoMarquee />

        <section id="how" className="scroll-mt-16 border-y border-slate-200/70 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('how.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
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
                    className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/60 p-6 ring-1 ring-slate-900/5 transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out-strong hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lift"
                  >
                    <span className="absolute right-2 top-2 font-display text-7xl font-extrabold text-slate-500 transition-colors duration-300 ease-out-strong group-hover:text-brand-600">
                      0{step}
                    </span>
                    <div className="relative flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="font-display text-base font-extrabold text-slate-900">
                        {t(`how.step${step}.title`)}
                      </h3>
                    </div>
                    <p className="relative mt-2 text-xs leading-relaxed text-slate-600">
                      {t(`how.step${step}.desc`)}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 relative overflow-hidden bg-slate-900">
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
          <div className="vn-lotus-light absolute inset-0 opacity-80" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
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
                    className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition-[transform,border-color,background-color] duration-300 ease-out-strong hover:-translate-y-1 hover:border-brand-400/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-accent-400 ring-1 ring-white/10">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="font-display text-sm font-extrabold text-white">
                        {t(`features.f${feature}.title`)}
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {t(`features.f${feature}.desc`)}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Curated Starter Trips Section */}
        <section id="curated" className="bg-slate-50/80 px-4 py-16 sm:px-6 lg:px-8 border-b border-slate-200/60">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Khám phá Sài Gòn cùng lịch trình chọn sẵn
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Được biên soạn chuẩn mực bởi các chuyên gia bản địa. Mở xem chi tiết ngay lập tức, có sẵn bản đồ, ước tính chi phí và tự do tinh chỉnh!
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {CURATED_TRIPS.map((curated) => (
                <CuratedTripCard key={curated.id} trip={curated} />
              ))}
            </div>
          </div>
        </section>

        <section id="plan" className="plan-background scroll-mt-16 relative overflow-hidden bg-slate-50">
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <Reveal className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {t('form.title')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-900 sm:text-base">
                {t('form.subtitle')}
              </p>

              <div className="mt-7 space-y-3">
                {[1, 2, 3].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {t(`features.f${feature}.title`)}
                      </p>
                      <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-slate-900">
                        {t(`features.f${feature}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm">
                <MapPin className="h-4 w-4 text-brand-600" />
                {t('hero.note')}
              </div>
            </Reveal>

            <Reveal delay={90} className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-brand-100 via-white to-accent-100 blur-xl" />
              <div className="relative">
                <TripForm />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-white px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-4xl bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 px-6 py-14 text-center shadow-soft sm:px-12">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full border-[24px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full border-[28px] border-accent-400/20" />
            <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-brand-400/20 blur-3xl" />
            <div className="vn-lotus-light absolute inset-0" aria-hidden="true" />

            <Reveal className="relative">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl flex items-center justify-center gap-3">
                <MapPin className="h-7 w-7 text-accent-400 shrink-0" strokeWidth={2.4} />
                {t('cta.title')}
              </h2>
              <p className="mt-2 text-sm text-brand-100">{t('cta.subtitle')}</p>
              <MagneticButton className="mt-7 inline-block">
                <a
                  href="#plan"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-card transition-[transform,background-color] duration-200 ease-out-strong hover:-translate-y-0.5 hover:bg-brand-50 active:scale-[0.97]"
                >
                  {t('cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </MagneticButton>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
