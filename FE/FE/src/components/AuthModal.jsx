import { Loader2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { hasGoogleSignIn } from '../lib/google.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import Modal from './Modal.jsx';

export default function AuthModal() {
  const { t } = useI18n();
  const { isAuthOpen, authMode, closeAuth, login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState(authMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (!isAuthOpen) return;
    setMode(authMode);
    setUsername('');
    setPassword('');
    setError('');
    setErrorField('');
    setSubmitting(false);
  }, [isAuthOpen, authMode]);

  const clearError = () => {
    setError('');
    setErrorField('');
  };

  const showError = (field, message) => {
    setError(message);
    setErrorField(field);
    const ref = field === 'username' ? usernameRef : passwordRef;
    requestAnimationFrame(() => ref.current?.focus());
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    clearError();
  };

  const describedBy = (field, hintId) => (
    [hintId, errorField === field ? 'auth-form-error' : null].filter(Boolean).join(' ') || undefined
  );

  const isLogin = mode === 'login';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const name = username.trim();
    if (!name) {
      showError('username', t('error.VALIDATION_ERROR'));
      return;
    }
    if (!password) {
      showError('password', t('error.VALIDATION_ERROR'));
      return;
    }

    setSubmitting(true);
    clearError();
    try {
      if (isLogin) {
        await login({ username: name, password });
      } else {
        await register({ username: name, password });
      }
      closeAuth();
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (submitting) return;
    setSubmitting(true);
    clearError();
    try {
      await loginWithGoogle(credential);
      closeAuth();
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (active) =>
    cn(
      'touch-target rounded-full px-3 py-1.5 text-xs font-bold transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    );

  return (
    <Modal
      open={isAuthOpen}
      onClose={() => (submitting ? null : closeAuth())}
      title={isLogin ? t('auth.title.login') : t('auth.title.register')}
      footer={
        <>
          <button
            type="button"
            onClick={closeAuth}
            disabled={submitting}
            className="control-pill !px-4 !py-2"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="auth-form"
            disabled={submitting}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {submitting
              ? t('auth.submitting')
              : isLogin
                ? t('auth.submit.login')
                : t('auth.submit.register')}
          </button>
        </>
      }
    >
      <div className="relative">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="relative">
          <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-glow">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
            <button type="button" onClick={() => switchMode('login')} aria-pressed={isLogin} className={tabClass(isLogin)}>
              {t('auth.tab.login')}
            </button>
            <button type="button" onClick={() => switchMode('register')} aria-pressed={!isLogin} className={tabClass(!isLogin)}>
              {t('auth.tab.register')}
            </button>
          </div>

      {hasGoogleSignIn ? (
        <div className="mt-4">
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
          <div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      ) : null}

      <form
        id="auth-form"
        onSubmit={handleSubmit}
        className={cn('grid gap-3', hasGoogleSignIn ? '' : 'mt-4')}
      >
        <label className="grid gap-1.5">
          <span className="label !mb-0">{t('auth.username')}</span>
          <input
            ref={usernameRef}
            className="input"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (errorField === 'username') clearError();
            }}
            aria-invalid={errorField === 'username' || undefined}
            aria-describedby={describedBy('username', isLogin ? null : 'auth-username-hint')}
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            required
          />
          {!isLogin && <span id="auth-username-hint" className="text-[11px] text-slate-500">{t('auth.usernameHint')}</span>}
        </label>

        {!isLogin && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-800">
            {t('auth.noRecovery')}
          </p>
        )}

        <label className="grid gap-1.5">
          <span className="label !mb-0">{t('auth.password')}</span>
          <input
            ref={passwordRef}
            type="password"
            className="input"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errorField === 'password') clearError();
            }}
            aria-invalid={errorField === 'password' || undefined}
            aria-describedby={describedBy('password', isLogin ? null : 'auth-password-hint')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? 1 : 8}
            maxLength={72}
            required
          />
          {!isLogin && (
            <span id="auth-password-hint" className="text-[11px] text-slate-500">{t('auth.passwordHint')}</span>
          )}
        </label>

        {error ? (
          <p id="auth-form-error" role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-slate-500">
        {isLogin ? t('auth.footer.login') : t('auth.footer.register')}{' '}
        <button
          type="button"
          onClick={() => switchMode(isLogin ? 'register' : 'login')}
          className="rounded font-bold text-brand-700 transition-colors duration-200 ease-out-strong hover:underline"
        >
          {isLogin ? t('auth.switch.register') : t('auth.switch.login')}
        </button>
      </p>
        </div>
      </div>
    </Modal>
  );
}
