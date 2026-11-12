import { KeyRound, Loader2, Settings as SettingsIcon, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { DEMO, Black } from '../demo.jsx';
import { api } from '../lib/api.js';
import { translateApiError } from '../lib/errors.js';

function SignInCard() {
  const { t } = useI18n();
  const { openAuth } = useAuth();

  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card sm:mt-16">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700">
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
  const { user, loading: authLoading, deleteAccount } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwordSaving) return;
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
      setToast({ message: t('settings.password.saved'), tone: 'success' });
    } catch (error) {
      setPasswordError(translateApiError(t, error));
    } finally {
      setPasswordSaving(false);
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
            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                {t('settings.title')}
              </h1>
              <p className="mt-1 text-sm font-medium text-brand-100">{t('settings.subtitle')}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="font-display text-sm font-extrabold text-slate-900">
                {t('settings.account.title')}
              </h2>
              <div className="mt-3 grid gap-2.5">
                <Black className="h-10 w-full rounded-xl" />
                <Black className="h-10 w-4/5 rounded-xl" />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
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

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
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

            <section className="rounded-3xl border border-rose-200 bg-white p-5 shadow-card">
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
              <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                  {t('settings.title')}
                </h1>
                <p className="mt-1 text-sm font-medium text-brand-100">{t('settings.subtitle')}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white px-4 py-3 ring-1 ring-slate-900/5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 font-display text-base font-extrabold text-white shadow-glow">
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
              className="mt-5 grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"
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

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold text-slate-900">
                  {t('settings.privacy.title')}
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t('settings.privacy.body')}
              </p>
            </section>

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <KeyRound className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-extrabold text-slate-900">
                  {t('settings.password.title')}
                </h2>
              </div>
              {user.has_password ? (
                <form onSubmit={handleChangePassword} className="mt-3 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="label !mb-0">{t('settings.password.current')}</span>
                    <input
                      type="password"
                      className="input"
                      value={passwords.current}
                      onChange={(event) =>
                        setPasswords((current) => ({ ...current, current: event.target.value }))
                      }
                      autoComplete="current-password"
                      maxLength={72}
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="label !mb-0">{t('settings.password.new')}</span>
                      <input
                        type="password"
                        className="input"
                        value={passwords.next}
                        onChange={(event) =>
                          setPasswords((current) => ({ ...current, next: event.target.value }))
                        }
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="label !mb-0">{t('settings.password.confirm')}</span>
                      <input
                        type="password"
                        className="input"
                        value={passwords.confirm}
                        onChange={(event) =>
                          setPasswords((current) => ({ ...current, confirm: event.target.value }))
                        }
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">{t('settings.password.body')}</p>
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
                      {passwordSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {passwordSaving
                        ? t('settings.password.saving')
                        : t('settings.password.submit')}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {t('settings.password.google')}
                </p>
              )}
            </section>

            <section className="mt-5 rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/60 to-white p-5 shadow-card ring-1 ring-rose-100 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
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
      <Toast
        message={toast?.message}
        tone={toast?.tone || 'error'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
