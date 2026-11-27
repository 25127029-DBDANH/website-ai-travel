import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api } from '../lib/api.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { checkPassword } from '../lib/passwordPolicy.js';
import { blockImeEnter, validatePasswordResetForm } from '../lib/recoveryCode.js';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const { openAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [rejectedToken, setRejectedToken] = useState('');
  const [success, setSuccess] = useState(false);

  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const submittingRef = useRef(false);

  const tokenInvalid = !token || rejectedToken === token;

  // Prevent reset token leakage via Referer header when navigating to external links.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.head) return undefined;
    const existing = document.head.querySelector('meta[name="referrer"]');
    const previousContent = existing?.getAttribute('content') ?? null;

    let meta = existing;
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'referrer');
      document.head.appendChild(meta);
      created = true;
    }
    meta.setAttribute('content', 'no-referrer');

    return () => {
      if (created) {
        meta.remove();
      } else if (previousContent !== null) {
        meta.setAttribute('content', previousContent);
      } else {
        meta.removeAttribute('content');
      }
    };
  }, []);

  useEffect(() => {
    if (tokenInvalid || success) return undefined;
    const rafId = requestAnimationFrame(() => newPasswordRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
  }, [tokenInvalid, success]);

  const clearError = () => {
    setError('');
    setErrorField('');
  };

  const showError = (field, message) => {
    setError(message);
    setErrorField(field);
    const targetRef = field === 'confirmPassword' ? confirmPasswordRef : newPasswordRef;
    if (field) {
      requestAnimationFrame(() => targetRef.current?.focus());
    }
  };

  const describedBy = (field, hintId) =>
    [hintId, error && errorField === field ? 'reset-form-error' : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const passwordCheck = checkPassword(newPassword);
  const visiblePasswordRules = passwordCheck.rules.filter((rule) => rule.id !== 'noUsername');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || submittingRef.current) return;

    if (!token) {
      setRejectedToken('');
      return;
    }

    const validation = validatePasswordResetForm({ newPassword, confirmPassword });
    if (!validation.valid) {
      showError(validation.field || 'newPassword', t(`error.${validation.code}`));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    clearError();
    try {
      await api.resetPassword({ token, new_password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      if (err?.code === 'AUTH_RESET_TOKEN_INVALID') {
        setRejectedToken(token);
      }
      showError('', translateApiError(t, err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleOpenSignIn = () => {
    navigate('/');
    openAuth('login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {success ? (
            <div className="grid gap-4 text-center" role="status" aria-live="polite">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
                {t('reset.successTitle')}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">{t('reset.successBody')}</p>
              <button
                type="button"
                onClick={handleOpenSignIn}
                className="btn-primary mt-2 w-full justify-center text-xs"
              >
                {t('reset.signInCta')}
              </button>
            </div>
          ) : tokenInvalid ? (
            <div className="grid gap-4 text-center" role="alert">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
                {t('reset.expiredTitle')}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                {error || t('error.AUTH_RESET_TOKEN_INVALID')}
              </p>
              <Link
                to="/forgot-password"
                className="btn-primary mt-2 w-full justify-center text-xs"
              >
                {t('reset.requestNewLink')}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <KeyRound className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-900">
                  {t('reset.title')}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {t('reset.subtitle')}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                onKeyDown={blockImeEnter}
                className="mt-6 grid gap-4"
              >
                <div className="grid gap-1.5">
                  <label htmlFor="reset-new-password" className="label !mb-0">
                    {t('reset.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      name="new_password"
                      ref={newPasswordRef}
                      type={showNewPassword ? 'text' : 'password'}
                      className="input pr-11"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        if (error) clearError();
                      }}
                      aria-invalid={errorField === 'newPassword' || undefined}
                      aria-describedby={describedBy('newPassword', 'reset-password-rules')}
                      autoComplete="new-password"
                      enterKeyHint="next"
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
                  <label htmlFor="reset-confirm-password" className="label !mb-0">
                    {t('reset.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      name="confirm_password"
                      ref={confirmPasswordRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input pr-11"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (error) clearError();
                      }}
                      aria-invalid={errorField === 'confirmPassword' || undefined}
                      aria-describedby={describedBy('confirmPassword', null)}
                      autoComplete="new-password"
                      enterKeyHint="done"
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

                <ul id="reset-password-rules" className="grid gap-1 text-[11px]">
                  {visiblePasswordRules.map((rule) => (
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

                {error ? (
                  <p
                    id="reset-form-error"
                    role="alert"
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary mt-1 w-full justify-center text-xs"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  {submitting ? t('reset.submitting') : t('reset.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
