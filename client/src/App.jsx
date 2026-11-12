import Lenis from 'lenis';
import { MotionConfig, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import AuthModal from './components/AuthModal.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import MyTripsPage from './pages/MyTripsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SharedTripPage from './pages/SharedTripPage.jsx';
import TripPage from './pages/TripPage.jsx';

function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return null;
}

function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1
    });
    let frameId;
    const raf = (time) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <RouteEffects />
            <SmoothScroll />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/trips" element={<MyTripsPage />} />
              <Route path="/trip/:id" element={<TripPage />} />
              <Route path="/s/:token" element={<SharedTripPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <AuthModal />
          </BrowserRouter>
        </MotionConfig>
      </AuthProvider>
    </I18nProvider>
  );
}
