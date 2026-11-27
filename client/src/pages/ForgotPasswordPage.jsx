import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecoveryCodePanel from '../components/RecoveryCodePanel.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api } from '../lib/api.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { checkPassword } from '../lib/passwordPolicy.js';
import {
  blockImeEnter,
  formatRecoveryCode,
  isValidRecoveryCode,
  validatePasswordResetForm
} from '../lib/recoveryCode.js';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { openAuth } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('recovery');
  const [emailRecoveryEnabled, setEmailRecoveryEnabled] = useState(false);

  // Recovery code tab state
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [recoveryDoneWithoutCode, setRecoveryDoneWithoutCode] = useState(false);

  // Email tab state
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const usernameRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .getAuthConfig()
      .then((config) => {
        if (active) setEmailRecoveryEnabled(Boolean(config?.email_recovery_enabled));
      })
      .catch(() => {
        if (active) setEmailRecoveryEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (newRecoveryCode || recoveryDoneWithoutCode) return;
    if (tab === 'recovery') {
      requestAnimationFrame(() => usernameRef.current?.focus());
    } else if (tab === 'email') {
      requestAnimationFrame(() => emailRef.current?.focus());
    }
  }, [tab, newRecoveryCode, recoveryDoneWithoutCode]);

  const passwordCheck = checkPassword(newPassword, username.trim());
  const visiblePasswordRules = username.trim()
    ? passwordCheck.rules
    : passwordCheck.rules.filter((rule) => rule.id !== 'noUsername');

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();
    if (recoverySubmitting) return;

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setRecoveryError(t('error.VALIDATION_ERROR'));
      return;
    }

    if (!isValidRecoveryCode(recoveryCode)) {
      setRecoveryError(t('error.AUTH_RECOVERY_INVALID'));
      return;
    }

    const validation = validatePasswordResetForm({
      newPassword,
      confirmPassword,
      username: cleanUsername
    });
    if (!validation.valid) {
      setRecoveryError(t(`error.${validation.code}`));
      return;
    }

    setRecoverySubmitting(true);
    setRecoveryError('');
    try {
      const data = await api.resetWithRecoveryCode({
        username: cleanUsername,
        recovery_code: formatRecoveryCode(recoveryCode),
        new_password: newPassword
      });
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryCode('');
      if (data?.recovery_code) {
        setNewRecoveryCode(data.recovery_code);
      } else {
        setRecoveryDoneWithoutCode(true);
      }
    } catch (err) {
      setRecoveryError(translateApiError(t, err));
    } finally {
      setRecoverySubmitting(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (emailSubmitting) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError(t('error.AUTH_EMAIL_INVALID'));
      return;
    }

    setEmailSubmitting(true);
    setEmailError('');
    setEmailSent(false);
    try {
      await api.forgotPassword({ email: cleanEmail });
      setEmailSent(true);
    } catch (err) {
      setEmailError(translateApiError(t, err));
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleOpenSignIn = () => {
    navigate('/');
    openAuth('login');
  };

  const tabClass = (active) =>
    cn(
      'touch-target rounded-full px-3 py-2 text-xs font-bold transition-[transform,color,background-color,box-shadow] duration-200 ease-out-strong active:scale-[0.98]',
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-900">
              {newRecoveryCode || recoveryDoneWithoutCode
                ? t('forgot.recoverySuccessTitle')
                : t('forgot.title')}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {newRecoveryCode
                ? t('forgot.recoverySuccessBody')
                : emailRecoveryEnabled
                  ? t('forgot.subtitle')
                  : t('forgot.subtitleCodeOnly')}
            </p>
          </div>

          {newRecoveryCode ? (
            <div className="mt-6">
              <RecoveryCodePanel
                code={newRecoveryCode}
                username={username.trim()}
                confirmLabel={t('forgot.signInNow')}
                onConfirm={handleOpenSignIn}
              />
            </div>
          ) : recoveryDoneWithoutCode ? (
            <div className="mt-6 grid gap-4 text-center" aria-live="polite">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={handleOpenSignIn}
                className="btn-primary w-full justify-center text-xs"
              >
                {t('forgot.signInNow')}
              </button>
            </div>
          ) : (
            <>
              {emailRecoveryEnabled ? (
                <div
                  role="tablist"
                  aria-label={t('forgot.title')}
                  className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'recovery'}
                    onClick={() => {
                      setTab('recovery');
                      setEmailError('');
                    }}
                    className={tabClass(tab === 'recovery')}
                  >
                    {t('forgot.tab.recovery')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'email'}
                    onClick={() => {
                      setTab('email');
                      setRecoveryError('');
                    }}
                    className={tabClass(tab === 'email')}
                  >
                    {t('forgot.tab.email')}
                  </button>
                </div>
              ) : null}

              {tab === 'recovery' ? (
                <form
                  onSubmit={handleRecoverySubmit}
                  onKeyDown={blockImeEnter}
                  className="mt-6 grid gap-4"
                >
                  <label className="grid gap-1.5">
                    <span className="label !mb-0">{t('auth.username')}</span>
                    <input
                      ref={usernameRef}
                      className="input"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        if (recoveryError) setRecoveryError('');
                      }}
                      autoComplete="username"
                      minLength={3}
                      maxLength={30}
                      required
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="label !mb-0">{t('forgot.recoveryCodeLabel')}</span>
                    <input
                      className="input font-mono uppercase tracking-[0.12em]"
                      value={recoveryCode}
                      onChange={(event) => {
                        setRecoveryCode(formatRecoveryCode(event.target.value));
                        if (recoveryError) setRecoveryError('');
                      }}
                      placeholder="XXXX-XXXX-XXXX"
                      autoComplete="one-time-code"
                      spellCheck={false}
                      maxLength={14}
                      aria-describedby="forgot-code-hint"
                      required
                    />
                    <span id="forgot-code-hint" className="text-[11px] text-slate-500">
                      {t('forgot.recoveryCodeHint')}
                    </span>
                  </label>

                  <div className="grid gap-1.5">
                    <label htmlFor="forgot-new-password" className="label !mb-0">
                      {t('forgot.newPassword')}
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        className="input pr-11"
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          if (recoveryError) setRecoveryError('');
                        }}
                        aria-describedby="forgot-password-rules"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={64}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        aria-pressed={showNewPassword}
                        className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="forgot-confirm-password" className="label !mb-0">
                      {t('forgot.confirmPassword')}
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="input pr-11"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          if (recoveryError) setRecoveryError('');
                        }}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={64}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')
                        }
                        aria-pressed={showConfirmPassword}
                        className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <ul
                    id="forgot-password-rules"
                    aria-live="polite"
                    className="grid gap-1 text-[11px]"
                  >
                    {visiblePasswordRules.map((rule) => (
                      <li
                        key={rule.id}
                        className={cn(
                          'flex items-start gap-1.5 leading-snug transition-colors',
                          rule.ok ? 'font-medium text-brand-700' : 'text-slate-500'
                        )}
                      >
                        <span aria-hidden="true" className="w-3.5 shrink-0 text-center font-bold">
                          {rule.ok ? '✓' : '○'}
                        </span>
                        <span>{t(`auth.rule.${rule.id}`)}</span>
                      </li>
                    ))}
                  </ul>

                  {recoveryError ? (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      {recoveryError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={recoverySubmitting}
                    className="btn-primary mt-1 w-full justify-center text-xs"
                  >
                    {recoverySubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    {recoverySubmitting ? t('forgot.submitting') : t('forgot.submitRecovery')}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleEmailSubmit}
                  onKeyDown={blockImeEnter}
                  className="mt-6 grid gap-4"
                >
                  <label className="grid gap-1.5">
                    <span className="label !mb-0">{t('forgot.emailLabel')}</span>
                    <input
                      ref={emailRef}
                      type="email"
                      className="input"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (emailError) setEmailError('');
                      }}
                      placeholder={t('forgot.emailPlaceholder')}
                      autoComplete="email"
                      required
                    />
                  </label>

                  {emailSent ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/80 px-3.5 py-3 text-xs font-medium leading-relaxed text-brand-900"
                    >
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                      <span>{t('forgot.emailSent')}</span>
                    </div>
                  ) : null}

                  {emailError ? (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      {emailError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={emailSubmitting}
                    className="btn-primary mt-1 w-full justify-center text-xs"
                  >
                    {emailSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    {emailSubmitting ? t('forgot.submitting') : t('forgot.submitEmail')}
                  </button>
                </form>
              )}

              <div className="mt-6 grid gap-2 border-t border-slate-100 pt-4 text-center text-xs text-slate-600">
                <p>
                  {t('forgot.googleHint')}{' '}
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className="font-bold text-brand-700 hover:underline"
                  >
                    {t('forgot.googleAction')}
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    onClick={() => openAuth('login')}
                    className="font-semibold text-slate-500 transition-colors hover:text-slate-800 hover:underline"
                  >
                    {t('forgot.backToLogin')}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
