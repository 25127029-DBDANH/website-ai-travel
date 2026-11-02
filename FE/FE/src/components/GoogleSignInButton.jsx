import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { cn } from '../lib/cn.js';
import {
  ensureGoogleIdentity,
  hasGoogleSignIn,
  registerCredentialHandler
} from '../lib/google.js';

export default function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
  disabled = false,
  className
}) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!hasGoogleSignIn) return undefined;

    let active = true;
    const unregister = registerCredentialHandler((credential) => {
      if (active) callbackRef.current?.(credential);
    });

    ensureGoogleIdentity()
      .then((google) => {
        const container = containerRef.current;
        if (!active || !container) return;
        container.replaceChildren();
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'left',
          width: Math.max(200, Math.min(320, container.clientWidth || 320))
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      unregister();
    };
  }, [text]);

  if (!hasGoogleSignIn) return null;
  if (failed) {
    return (
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-medium text-slate-500">
        {t('auth.googleUnavailable')}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={t('auth.google')}
      className={cn(
        'flex min-h-[44px] justify-center',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    />
  );
}
