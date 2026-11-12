import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api } from '../lib/api.js';
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!getAuthToken()) return undefined;
    let active = true;
    api
      .getMe()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        clearAuthToken();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('hcmc-auth-expired', onExpired);
    return () => window.removeEventListener('hcmc-auth-expired', onExpired);
  }, []);

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const applyAuth = useCallback(
    (data) => {
      setAuthToken(data.token);
      setUser(data.user);
      setLoading(false);
      if (data.claimed_trips > 0) {
        setNotice(t('auth.claimed', { count: data.claimed_trips }));
      }
      return data;
    },
    [t]
  );

  const login = useCallback(
    async (credentials) => applyAuth(await api.login(credentials)),
    [applyAuth]
  );
  const register = useCallback(
    async (payload) => applyAuth(await api.register(payload)),
    [applyAuth]
  );
  const loginWithGoogle = useCallback(
    async (idToken) => applyAuth(await api.loginWithGoogle(idToken)),
    [applyAuth]
  );
  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);
  const deleteAccount = useCallback(async (payload) => {
    const data = await api.deleteAccount(payload);
    clearAuthToken();
    setUser(null);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthOpen,
      authMode,
      openAuth,
      closeAuth,
      login,
      register,
      loginWithGoogle,
      logout,
      deleteAccount
    }),
    [
      user,
      loading,
      isAuthOpen,
      authMode,
      openAuth,
      closeAuth,
      login,
      register,
      loginWithGoogle,
      logout,
      deleteAccount
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {notice ? <Toast message={notice} tone="success" onClose={() => setNotice(null)} /> : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
