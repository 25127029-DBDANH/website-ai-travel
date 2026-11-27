import { Eye, EyeOff, Loader2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { hasGoogleSignIn } from '../lib/google.js';
import { checkPassword, checkUsername } from '../lib/passwordPolicy.js';
import { blockImeEnter } from '../lib/recoveryCode.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import Modal from './Modal.jsx';
import RecoveryCodePanel from './RecoveryCodePanel.jsx';

export default function AuthModal() {
  const { t } = useI18n();
  const { isAuthOpen, authMode, closeAuth, login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState(authMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [registeredUsername, setRegisteredUsername] = useState('');
  const submittingRef = useRef(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (!isAuthOpen) return undefined;
    setMode(authMode);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setErrorField('');
    setRecoveryCode('');
    setRegisteredUsername('');
    submittingRef.current = false;
    setSubmitting(false);
    const rafId = requestAnimationFrame(() => usernameRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
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
    if (submitting || submittingRef.current) return;
    setMode(nextMode);
    clearError();
  };

  const describedBy = (field, hintId) => (
    [hintId, errorField === field ? 'auth-form-error' : null].filter(Boolean).join(' ') || undefined
  );

  const isLogin = mode === 'login';
  const passwordCheck = !isLogin ? checkPassword(password, username.trim()) : null;
  const showingRecovery = Boolean(recoveryCode);

  const handleGoogleCredential = async (credential) => {
    if (submitting || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    clearError();
    try {
      await loginWithGoogle(credential);
      closeAuth();
    } catch (requestError) {
      setErrorField('');
      setError(translateApiError(t, requestError));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || submittingRef.current) return;
    const name = username.trim();
    if (!name) {
      showError('username', t('error.VALIDATION_ERROR'));
      return;
    }
    if (!password) {
      showError('password', t('error.VALIDATION_ERROR'));
      return;
    }

    if (!isLogin) {
      const usernameCheck = checkUsername(name);
      if (!usernameCheck.valid) {
        showError('username', t(`error.${usernameCheck.code}`));
        return;
      }
      const nextPasswordCheck = checkPassword(password, name);
      if (!nextPasswordCheck.valid) {
        showError('password', t(`error.${nextPasswordCheck.code}`));
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    clearError();
    try {
      if (isLogin) {
        await login({ username: name, password });
        closeAuth();
      } else {
        const data = await register({ username: name, password });
        if (data?.recovery_code) {
          setRecoveryCode(data.recovery_code);
          setRegisteredUsername(data?.user?.username || name);
        } else {
          closeAuth();
        }
      }
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRecoveryConfirmed = () => {
    setRecoveryCode('');
    setRegisteredUsername('');
    closeAuth();
  };

  const tabClass = (active) =>
    cn(
      'touch-target rounded-full px-3 py-1.5 text-xs font-bold transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    );

  return (
    <Modal
      open={isAuthOpen}
      onClose={() => (submitting || showingRecovery ? null : closeAuth())}
      title={
        showingRecovery
          ? t('recovery.panel.title')
          : isLogin
            ? t('auth.title.login')
            : t('auth.title.register')
      }
      footer={
        showingRecovery ? null : (
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
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              {submitting
                ? t('auth.submitting')
                : isLogin
                  ? t('auth.submit.login')
                  : t('auth.submit.register')}
            </button>
          </>
        )
      }
    >
      {showingRecovery ? (
        <RecoveryCodePanel
          code={recoveryCode}
          username={registeredUsername}
          onConfirm={handleRecoveryConfirmed}
        />
      ) : (
        <div>
          <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
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
            <div className="mt-4 grid gap-3">
              <GoogleSignInButton
                text="continue_with"
                disabled={submitting}
                onCredential={handleGoogleCredential}
              />
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-500">{t('auth.or')}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          ) : null}

          <form
            id="auth-form"
            onSubmit={handleSubmit}
            onKeyDown={blockImeEnter}
            className="mt-4 grid gap-3"
          >
            <div className="grid gap-1.5">
              <label htmlFor="auth-username" className="label !mb-0">{t('auth.username')}</label>
              <input
                id="auth-username"
                name="username"
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
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                required
              />
              {!isLogin && <span id="auth-username-hint" className="text-[11px] text-slate-600">{t('auth.usernameHint')}</span>}
            </div>

            {!isLogin && (
              <p className="rounded-xl bg-brand-50/70 px-3 py-2 text-[11px] font-medium leading-relaxed text-brand-900">
                {t('auth.recoveryHint')}
              </p>
            )}

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="auth-password" className="label !mb-0">{t('auth.password')}</label>
                {isLogin ? (
                  <Link
                    to="/forgot-password"
                    onClick={closeAuth}
                    className="inline-flex min-h-[24px] items-center py-0.5 text-xs font-semibold text-brand-700 transition-colors hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                ) : null}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errorField === 'password') clearError();
                  }}
                  aria-invalid={errorField === 'password' || undefined}
                  aria-describedby={describedBy('password', isLogin ? null : 'auth-password-hint')}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  enterKeyHint="done"
                  minLength={isLogin ? 1 : 8}
                  maxLength={64}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {!isLogin && passwordCheck && (
                <ul
                  id="auth-password-hint"
                  className="grid gap-1 text-[11px]"
                >
                  {passwordCheck.rules.map((rule) => (
                    <li
                      key={rule.id}
                      className={cn(
                        'flex items-start gap-1.5 leading-snug transition-colors',
                        rule.ok ? 'font-medium text-brand-700' : 'text-slate-600'
                      )}
                    >
                      <span aria-hidden="true" className="w-3.5 shrink-0 text-center font-bold">
                        {rule.ok ? '✓' : '○'}
                      </span>
                      <span>{t(`auth.rule.${rule.id}`)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error ? (
              <p id="auth-form-error" role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            ) : null}
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">
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
      )}
    </Modal>
  );
}
