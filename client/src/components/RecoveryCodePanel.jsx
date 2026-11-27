import { Check, Copy, Download, ShieldAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import {
  buildRecoveryCodeFileContent,
  buildRecoveryCodeFilename,
  formatRecoveryCode
} from '../lib/recoveryCode.js';

export default function RecoveryCodePanel({
  code,
  username = '',
  title,
  description,
  confirmLabel,
  onConfirm,
  autoFocus = true
}) {
  const { t } = useI18n();
  const checkboxId = useId();
  const [confirmed, setConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('neutral');
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const copyBtnRef = useRef(null);
  const copyTimerRef = useRef(null);
  const lastStatusRef = useRef('');

  const formattedCode = formatRecoveryCode(code) || String(code || '').trim();

  const announceStatus = (tone, rawMessage) => {
    let message = rawMessage;
    if (message && message === lastStatusRef.current) {
      message = `${message}\u00A0`;
    }
    lastStatusRef.current = message;
    setStatusTone(tone);
    setStatusMessage(message);
  };

  useEffect(() => {
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
    setConfirmed(false);
    setCopied(false);
    setStatusMessage('');
    setStatusTone('neutral');
    lastStatusRef.current = '';

    if (!autoFocus) return undefined;
    const rafId = requestAnimationFrame(() => copyBtnRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
  }, [formattedCode, autoFocus]);

  useEffect(
    () => () => {
      clearTimeout(copyTimerRef.current);
    },
    []
  );

  const selectCodeText = () => {
    const node = codeRef.current;
    if (!node || typeof window === 'undefined') return;
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {
      // Best-effort text selection fallback.
    }
  };

  const handleCopy = async () => {
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      announceStatus('success', t('recovery.panel.copied'));
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setStatusMessage('');
        setStatusTone('neutral');
        copyTimerRef.current = null;
      }, 2500);
    } catch {
      selectCodeText();
      setCopied(false);
      announceStatus('warning', t('recovery.panel.copyFallback'));
    }
  };

  const handleDownload = () => {
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
    setCopied(false);
    const content = buildRecoveryCodeFileContent(formattedCode, username);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', buildRecoveryCodeFilename(username));
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    announceStatus('success', t('recovery.panel.downloaded'));
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-amber-900">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0">
          {title ? (
            <p className="font-display text-sm font-extrabold text-amber-950">{title}</p>
          ) : null}
          <p className="text-xs leading-relaxed text-amber-900">
            {description || t('recovery.panel.description')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          {t('recovery.panel.codeLabel')}
        </p>
        <p
          ref={codeRef}
          tabIndex={0}
          aria-label={`${t('recovery.panel.codeLabel')}: ${formattedCode}`}
          className="mt-2 select-all break-words font-mono text-lg font-extrabold tracking-[0.12em] text-slate-900 sm:text-2xl sm:tracking-[0.14em]"
        >
          {formattedCode}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            ref={copyBtnRef}
            type="button"
            onClick={handleCopy}
            className="control-pill inline-flex items-center gap-1.5 !px-4 !py-2 text-xs font-bold"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? t('recovery.panel.copied') : t('recovery.panel.copy')}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="control-pill inline-flex items-center gap-1.5 !px-4 !py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recovery.panel.download')}
          </button>
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            statusMessage
              ? `mt-2.5 text-xs font-medium ${
                  statusTone === 'warning'
                    ? 'text-amber-800'
                    : statusTone === 'success'
                      ? 'text-brand-700'
                      : 'text-slate-600'
                }`
              : 'sr-only'
          }
        >
          {statusMessage}
        </p>
      </div>

      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="leading-snug">{t('recovery.panel.confirmCheckbox')}</span>
      </label>

      <button
        type="button"
        disabled={!confirmed}
        onClick={() => onConfirm?.()}
        className="btn-primary w-full justify-center text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirmLabel || t('recovery.panel.continue')}
      </button>
    </div>
  );
}
