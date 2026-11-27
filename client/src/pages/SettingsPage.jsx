import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import Modal from '../components/Modal.jsx';
import RecoveryCodePanel from '../components/RecoveryCodePanel.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api } from '../lib/api.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { checkPassword } from '../lib/passwordPolicy.js';
import { blockImeEnter } from '../lib/recoveryCode.js';

function SignInCard() {
  const { t } = useI18n();
  const { openAuth } = useAuth();

  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center sm:mt-16">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <SettingsIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-xl font-extrabold text-slate-900">
        {t('settings.signIn.title')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('settings.signIn.body')}</p>
      <button type="button" onClick={() => openAuth('register')} className="btn-primary mt-6 text-xs">
        {t('settings.signIn.cta')}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, loading: authLoading, deleteAccount, updateUser } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [emailRecoveryEnabled, setEmailRecoveryEnabled] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Security: recovery code state
  const [showRegenForm, setShowRegenForm] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [showRegenPassword, setShowRegenPassword] = useState(false);
  const [regenSubmitting, setRegenSubmitting] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const regenTriggerRef = useRef(null);
  const regenPasswordRef = useRef(null);

  // Security: recovery email state
  const [emailInput, setEmailInput] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailNotice, setEmailNotice] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const recoveryEmailRef = useRef(null);
  const verifyCodeRef = useRef(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    if (!showRegenForm) return undefined;
    const rafId = requestAnimationFrame(() => regenPasswordRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
  }, [showRegenForm]);

  useEffect(() => {
    if (user?.email) {
      setEmailInput((current) => current || user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setSettings(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    api
      .getSettings()
      .then((data) => {
        if (active) setSettings(data.settings);
      })
      .catch((error) => {
        if (active) setToast({ message: translateApiError(t, error), tone: 'error' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, authLoading, t]);

  const update = (patch) => setSettings((current) => ({ ...current, ...patch }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!settings || saving) return;

    setSaving(true);
    try {
      const data = await api.updateSettings({
        tone: settings.tone,
        ai_interaction: settings.ai_interaction
      });
      setSettings(data.settings);
      setToast({ message: t('settings.saved'), tone: 'success' });
    } catch (error) {
      setToast({ message: translateApiError(t, error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const passwordCheck = checkPassword(passwords.next, user?.username || '');
  const visiblePasswordRules = user?.username
    ? passwordCheck.rules
    : passwordCheck.rules.filter((rule) => rule.id !== 'noUsername');

  const togglePasswordVisibility = (field) => {
    setShowPasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwordSaving) return;
    if (!passwordCheck.valid) {
      setPasswordError(t(`error.${passwordCheck.code}`));
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError(t('settings.password.mismatch'));
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    try {
      await api.changePassword({
        current_password: passwords.current,
        new_password: passwords.next
      });
      setPasswords({ current: '', next: '', confirm: '' });
      setShowPasswords({ current: false, next: false, confirm: false });
      setToast({ message: t('settings.password.saved'), tone: 'success' });
    } catch (error) {
      setPasswordError(translateApiError(t, error));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRegenerateRecoveryCode = async (event) => {
    event.preventDefault();
    if (regenSubmitting) return;
    if (!regenPassword) {
      setRegenError(t('error.AUTH_PASSWORD_REQUIRED'));
      requestAnimationFrame(() => regenPasswordRef.current?.focus());
      return;
    }

    setRegenSubmitting(true);
    setRegenError('');
    try {
      const data = await api.regenerateRecoveryCode({ current_password: regenPassword });
      setRegenPassword('');
      setShowRegenPassword(false);
      setShowRegenForm(false);
      updateUser({ has_recovery_code: true });
      if (data?.recovery_code) {
        setGeneratedRecoveryCode(data.recovery_code);
      } else {
        setToast({ message: t('settings.security.recovery.savedToast'), tone: 'success' });
      }
    } catch (error) {
      setRegenError(translateApiError(t, error));
      requestAnimationFrame(() => regenPasswordRef.current?.focus());
    } finally {
      setRegenSubmitting(false);
    }
  };

  const handleAddEmail = async (event) => {
    event.preventDefault();
    if (emailSending) return;
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setEmailError(t('error.AUTH_EMAIL_INVALID'));
      requestAnimationFrame(() => recoveryEmailRef.current?.focus());
      return;
    }

    setEmailSending(true);
    setEmailError('');
    setVerifyError('');
    setEmailNotice('');
    try {
      await api.addEmail({ email: cleanEmail });
      updateUser({ email: cleanEmail, email_verified: false });
      setEmailCodeSent(true);
      setVerifyCode('');
      setEmailNotice(t('settings.security.email.codeSent', { email: cleanEmail }));
    } catch (error) {
      setEmailError(translateApiError(t, error));
      requestAnimationFrame(() => recoveryEmailRef.current?.focus());
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmail = async (event) => {
    event.preventDefault();
    if (verifyingEmail) return;
    const cleanCode = verifyCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setVerifyError(t('error.AUTH_EMAIL_CODE_INVALID'));
      requestAnimationFrame(() => verifyCodeRef.current?.focus());
      return;
    }

    setVerifyingEmail(true);
    setVerifyError('');
    try {
      await api.verifyEmail({ code: cleanCode });
      updateUser({ email_verified: true });
      setEmailCodeSent(false);
      setVerifyCode('');
      setEmailNotice('');
      setToast({ message: t('settings.security.email.verifiedToast'), tone: 'success' });
    } catch (error) {
      setVerifyError(translateApiError(t, error));
      requestAnimationFrame(() => verifyCodeRef.current?.focus());
    } finally {
      setVerifyingEmail(false);
    }
  };

  const performDelete = async (payload) => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(payload);
      setToast({ message: t('settings.danger.deleted'), tone: 'success' });
    } catch (error) {
      setDeleteError(translateApiError(t, error));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (event) => {
    event.preventDefault();
    if (deleteConfirm.trim() !== 'DELETE' || !deletePassword) return;
    performDelete({ password: deletePassword });
  };

  if (DEMO) {
    return (
      <div className="min-h-screen bg-slate-100/70">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="page-hero !p-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                {t('settings.title')}
              </h1>
              <p className="mt-1 text-sm font-medium text-brand-100">{t('settings.subtitle')}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-sm font-extrabold text-slate-900">
                {t('settings.account.title')}
              </h2>
              <div className="mt-3 grid gap-2.5">
                <Black className="h-10 w-full rounded-xl" />
                <Black className="h-10 w-4/5 rounded-xl" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="label !mb-0">{t('settings.tone')}</span>
                  <select disabled className="input opacity-100">
                    <option>{t('settings.tone.friendly')}</option>
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="label !mb-0">{t('settings.interaction')}</span>
                  <select disabled className="input opacity-100">
                    <option>{t('settings.interaction.guided')}</option>
                  </select>
                </label>
              </div>
              <button type="button" disabled className="btn-primary mt-4 !px-4 !py-2 text-xs">
                {t('settings.save')}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-sm font-extrabold text-slate-900">
                {t('settings.password.title')}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">{t('settings.password.body')}</p>
              <div className="mt-3 grid gap-3">
                {[
                  t('settings.password.current'),
                  t('settings.password.new'),
                  t('settings.password.confirm')
                ].map((label) => (
                  <label key={label} className="grid gap-1.5">
                    <span className="label !mb-0">{label}</span>
                    <input type="password" disabled className="input" placeholder="••••••••" />
                  </label>
                ))}
              </div>
              <button type="button" disabled className="btn-primary mt-4 !px-4 !py-2 text-xs">
                {t('settings.password.submit')}
              </button>
            </section>

            <section className="rounded-2xl border border-rose-200 bg-white p-5">
              <h2 className="font-display text-sm font-extrabold text-rose-700">
                {t('settings.danger.title')}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {t('settings.danger.body')}
              </p>
              <input disabled className="input mt-3" placeholder={t('settings.danger.confirmLabel')} />
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {authLoading || (user && loading) ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            {t('common.loading')}
          </div>
        ) : !user ? (
          <SignInCard />
        ) : settings ? (
          <>
            <div className="page-hero !p-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                  {t('settings.title')}
                </h1>
                <p className="mt-1 text-sm font-medium text-brand-100">{t('settings.subtitle')}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 font-display text-base font-extrabold text-white">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t('settings.account.title')}
                </p>
                <p className="truncate text-sm font-bold text-slate-900">
                  {user.display_name || user.username}
                </p>
                <p className="truncate text-[11px] font-medium text-slate-500">
                  {user.email ? `${user.email} · ` : ''}
                  {user.has_password
                    ? t('settings.account.password')
                    : t('settings.account.google')}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <label className="grid gap-1.5">
                <span className="label !mb-0">{t('settings.tone')}</span>
                <select
                  className="input"
                  value={settings.tone}
                  onChange={(event) => update({ tone: event.target.value })}
                >
                  <option value="friendly">{t('settings.tone.friendly')}</option>
                  <option value="concise">{t('settings.tone.concise')}</option>
                  <option value="playful">{t('settings.tone.playful')}</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="label !mb-0">{t('settings.interaction')}</span>
                <select
                  className="input"
                  value={settings.ai_interaction}
                  onChange={(event) => update({ ai_interaction: event.target.value })}
                >
                  <option value="guided">{t('settings.interaction.guided')}</option>
                  <option value="minimal">{t('settings.interaction.minimal')}</option>
                </select>
              </label>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary text-xs">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {saving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
            </form>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold text-slate-900">
                  {t('settings.privacy.title')}
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {t('settings.privacy.body')}
              </p>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <KeyRound className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold text-slate-900">
                  {t('settings.password.title')}
                </h2>
              </div>
              {user.has_password ? (
                <form onSubmit={handleChangePassword} onKeyDown={blockImeEnter} className="mt-3 grid gap-3">
                  <div className="grid gap-1.5">
                    <label htmlFor="settings-password-current" className="label !mb-0">
                      {t('settings.password.current')}
                    </label>
                    <div className="relative">
                      <input
                        id="settings-password-current"
                        type={showPasswords.current ? 'text' : 'password'}
                        className="input pr-11"
                        value={passwords.current}
                        onChange={(event) => {
                          setPasswords((current) => ({ ...current, current: event.target.value }));
                          if (passwordError) setPasswordError('');
                        }}
                        autoComplete="current-password"
                        maxLength={72}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        aria-label={
                          showPasswords.current ? t('auth.hidePassword') : t('auth.showPassword')
                        }
                        aria-pressed={showPasswords.current}
                        className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label htmlFor="settings-password-next" className="label !mb-0">
                        {t('settings.password.new')}
                      </label>
                      <div className="relative">
                        <input
                          id="settings-password-next"
                          type={showPasswords.next ? 'text' : 'password'}
                          className="input pr-11"
                          value={passwords.next}
                          onChange={(event) => {
                            setPasswords((current) => ({ ...current, next: event.target.value }));
                            if (passwordError) setPasswordError('');
                          }}
                          aria-describedby="settings-password-rules"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={64}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('next')}
                          aria-label={
                            showPasswords.next ? t('auth.hidePassword') : t('auth.showPassword')
                          }
                          aria-pressed={showPasswords.next}
                          className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          {showPasswords.next ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="settings-password-confirm" className="label !mb-0">
                        {t('settings.password.confirm')}
                      </label>
                      <div className="relative">
                        <input
                          id="settings-password-confirm"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          className="input pr-11"
                          value={passwords.confirm}
                          onChange={(event) => {
                            setPasswords((current) => ({ ...current, confirm: event.target.value }));
                            if (passwordError) setPasswordError('');
                          }}
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={64}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          aria-label={
                            showPasswords.confirm ? t('auth.hidePassword') : t('auth.showPassword')
                          }
                          aria-pressed={showPasswords.confirm}
                          className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <ul
                    id="settings-password-rules"
                    className="grid gap-1 text-[11px]"
                  >
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
                  {passwordError ? (
                    <p
                      role="alert"
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      {passwordError}
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <button type="submit" disabled={passwordSaving} className="btn-primary text-xs">
                      {passwordSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                      {passwordSaving
                        ? t('settings.password.saving')
                        : t('settings.password.submit')}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t('settings.password.google')}
                </p>
              )}
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-extrabold text-slate-900">
                    {t('settings.security.title')}
                  </h2>
                  <p className="text-xs text-slate-600">{t('settings.security.subtitle')}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-5">
                {/* Recovery code */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3
                        id="settings-recovery-heading"
                        className="text-sm font-bold text-slate-900"
                      >
                        {t('settings.security.recovery.title')}
                      </h3>
                      {user.has_password && typeof user.has_recovery_code === 'boolean' ? (
                        <span
                          className={cn(
                            'shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                            user.has_recovery_code
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {user.has_recovery_code
                            ? t('settings.security.recovery.active')
                            : t('settings.security.recovery.none')}
                        </span>
                      ) : null}
                    </div>
                    {user.has_password && !showRegenForm ? (
                      <button
                        ref={regenTriggerRef}
                        type="button"
                        onClick={() => {
                          setShowRegenForm(true);
                          setRegenError('');
                          setRegenPassword('');
                        }}
                        className="control-pill inline-flex shrink-0 items-center gap-1.5 !px-3.5 !py-1.5 text-xs font-bold"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('settings.security.recovery.regenerate')}
                      </button>
                    ) : null}
                  </div>

                  {user.has_password ? (
                    <>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {typeof user.has_recovery_code === 'boolean'
                          ? t('settings.security.recovery.hint')
                          : t('settings.security.recovery.unknown')}
                      </p>

                      {showRegenForm ? (
                        <form
                          aria-labelledby="settings-recovery-heading"
                          onSubmit={handleRegenerateRecoveryCode}
                          onKeyDown={blockImeEnter}
                          className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                        >
                          <p className="text-xs font-medium text-slate-700">
                            {t('settings.security.recovery.passwordPrompt')}
                          </p>
                          <div className="grid gap-1.5">
                            <label htmlFor="settings-regen-password" className="label !mb-0">
                              {t('settings.password.current')}
                            </label>
                            <div className="relative">
                              <input
                                id="settings-regen-password"
                                name="current_password"
                                ref={regenPasswordRef}
                                type={showRegenPassword ? 'text' : 'password'}
                                className="input pr-11"
                                value={regenPassword}
                                onChange={(event) => {
                                  setRegenPassword(event.target.value);
                                  if (regenError) setRegenError('');
                                }}
                                aria-invalid={Boolean(regenError) || undefined}
                                aria-describedby={regenError ? 'settings-regen-error' : undefined}
                                autoComplete="current-password"
                                enterKeyHint="done"
                                maxLength={72}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegenPassword((prev) => !prev)}
                                aria-label={
                                  showRegenPassword
                                    ? t('auth.hidePassword')
                                    : t('auth.showPassword')
                                }
                                aria-pressed={showRegenPassword}
                                className="touch-target absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                              >
                                {showRegenPassword ? (
                                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </div>

                          {regenError ? (
                            <p
                              id="settings-regen-error"
                              role="alert"
                              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                            >
                              {regenError}
                            </p>
                          ) : null}

                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowRegenForm(false);
                                setRegenPassword('');
                                setRegenError('');
                                requestAnimationFrame(() => regenTriggerRef.current?.focus());
                              }}
                              disabled={regenSubmitting}
                              className="control-pill !px-3.5 !py-1.5 text-xs"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="submit"
                              disabled={regenSubmitting}
                              className="btn-primary !px-4 !py-1.5 text-xs"
                            >
                              {regenSubmitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : null}
                              {regenSubmitting
                                ? t('settings.security.recovery.generating')
                                : t('settings.security.recovery.confirm')}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {t('settings.security.recovery.google')}
                    </p>
                  )}
                </div>

                {/* Recovery email (only when email_recovery_enabled) */}
                {emailRecoveryEnabled ? (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                        <h3
                          id="settings-email-heading"
                          className="text-sm font-bold text-slate-900"
                        >
                          {t('settings.security.email.title')}
                        </h3>
                      </div>
                      {user.email ? (
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                            user.email_verified || !user.has_password
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {user.email_verified || !user.has_password ? (
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          ) : null}
                          {user.email_verified || !user.has_password
                            ? t('settings.security.email.verified')
                            : t('settings.security.email.unverified')}
                        </span>
                      ) : null}
                    </div>

                    {!user.has_password ? (
                      <div className="mt-2 grid min-w-0 gap-1">
                        {user.email ? (
                          <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                            {user.email}
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-600">
                          {t('settings.security.email.googleNote')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2.5 grid min-w-0 gap-3">
                        <p className="text-xs text-slate-600 [overflow-wrap:anywhere]">
                          {user.email ? user.email : t('settings.security.email.none')}
                        </p>

                        <form
                          aria-labelledby="settings-email-heading"
                          onSubmit={handleAddEmail}
                          onKeyDown={blockImeEnter}
                          className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                        >
                          <div className="grid min-w-0 gap-1.5">
                            <label htmlFor="settings-recovery-email" className="label !mb-0">
                              {t('settings.security.email.label')}
                            </label>
                            <input
                              id="settings-recovery-email"
                              name="email"
                              ref={recoveryEmailRef}
                              type="email"
                              className="input bg-white"
                              value={emailInput}
                              onChange={(event) => {
                                setEmailInput(event.target.value);
                                if (emailError) setEmailError('');
                              }}
                              placeholder={t('settings.security.email.placeholder')}
                              autoComplete="email"
                              spellCheck={false}
                              enterKeyHint="done"
                              maxLength={254}
                              aria-invalid={Boolean(emailError) || undefined}
                              aria-describedby={emailError ? 'settings-email-error' : undefined}
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={emailSending}
                            className="btn-primary !px-4 !py-2.5 text-xs"
                          >
                            {emailSending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : null}
                            {emailSending
                              ? t('settings.security.email.sending')
                              : emailCodeSent
                                ? t('settings.security.email.resendCode')
                                : t('settings.security.email.sendCode')}
                          </button>
                        </form>

                        {emailError ? (
                          <p
                            id="settings-email-error"
                            role="alert"
                            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                          >
                            {emailError}
                          </p>
                        ) : null}

                        {emailNotice ? (
                          <p
                            role="status"
                            aria-live="polite"
                            className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-900 [overflow-wrap:anywhere]"
                          >
                            {emailNotice}
                          </p>
                        ) : null}

                        {emailCodeSent || (user.email && !user.email_verified) ? (
                          <form
                            aria-labelledby="settings-email-heading"
                            onSubmit={handleVerifyEmail}
                            onKeyDown={blockImeEnter}
                            className="grid gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                          >
                            <div className="grid min-w-0 gap-1.5">
                              <label htmlFor="settings-verify-code" className="label !mb-0">
                                {t('settings.security.email.codeLabel')}
                              </label>
                              <input
                                id="settings-verify-code"
                                name="code"
                                ref={verifyCodeRef}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={12}
                                autoComplete="one-time-code"
                                spellCheck={false}
                                enterKeyHint="done"
                                className="input font-mono tracking-[0.2em]"
                                value={verifyCode}
                                onChange={(event) => {
                                  setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                                  if (verifyError) setVerifyError('');
                                }}
                                aria-invalid={Boolean(verifyError) || undefined}
                                aria-describedby={verifyError ? 'settings-verify-error' : undefined}
                                placeholder={t('settings.security.email.codePlaceholder')}
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={verifyingEmail || verifyCode.length !== 6}
                              className="btn-primary !px-4 !py-2.5 text-xs"
                            >
                              {verifyingEmail ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : null}
                              {verifyingEmail
                                ? t('settings.security.email.verifying')
                                : t('settings.security.email.verify')}
                            </button>

                            {verifyError ? (
                              <p
                                id="settings-verify-error"
                                role="alert"
                                className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 sm:col-span-2"
                              >
                                {verifyError}
                              </p>
                            ) : null}
                          </form>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-rose-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold text-rose-700">
                  {t('settings.danger.title')}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t('settings.danger.body')}
              </p>
              <label className="mt-4 grid gap-1.5">
                <span className="label !mb-0">{t('settings.danger.confirmLabel')}</span>
                <input
                  className="input"
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </label>

              {deleteConfirm.trim() === 'DELETE' ? (
                user.has_password ? (
                  <form onSubmit={handleDelete} className="mt-3 grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="label !mb-0">{t('settings.danger.password')}</span>
                      <input
                        type="password"
                        className="input"
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        autoComplete="current-password"
                        maxLength={72}
                        required
                      />
                    </label>
                    {deleteError ? (
                      <p
                        role="alert"
                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        {deleteError}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={deleting || !deletePassword}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-[transform,background-color] duration-200 ease-out-strong hover:bg-rose-700 active:scale-[0.97] disabled:opacity-60"
                      >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {deleting
                          ? t('settings.danger.deleting')
                          : t('settings.danger.submit')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-3 grid gap-2">
                    <p className="text-xs font-semibold text-rose-700">
                      {t('settings.danger.google')}
                    </p>
                    <GoogleSignInButton
                      text="signin_with"
                      disabled={deleting}
                      onCredential={(credential) => performDelete({ id_token: credential })}
                    />
                    {deleteError ? (
                      <p
                        role="alert"
                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        {deleteError}
                      </p>
                    ) : null}
                  </div>
                )
              ) : null}
            </section>
          </>
        ) : null}
      </main>
      <Modal
        open={Boolean(generatedRecoveryCode)}
        onClose={() => null}
        title={t('settings.security.recovery.modalTitle')}
      >
        {generatedRecoveryCode ? (
          <RecoveryCodePanel
            code={generatedRecoveryCode}
            username={user?.username || ''}
            onConfirm={() => {
              setGeneratedRecoveryCode('');
              setToast({ message: t('settings.security.recovery.savedToast'), tone: 'success' });
            }}
          />
        ) : null}
      </Modal>
      <Toast
        message={toast?.message}
        tone={toast?.tone || 'error'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
