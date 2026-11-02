import { Check, Copy, Link2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api } from '../lib/api.js';
import { translateApiError } from '../lib/errors.js';
import Modal from './Modal.jsx';

export default function ShareDialog({ open, tripId, onClose, onToast, onSharedChange }) {
  const { t } = useI18n();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const tRef = useRef(t);
  const onSharedChangeRef = useRef(onSharedChange);
  tRef.current = t;
  onSharedChangeRef.current = onSharedChange;

  useEffect(() => {
    if (!open || !tripId) return undefined;

    let active = true;
    setLink(null);
    setLoading(true);
    setError('');
    setCopied(false);

    api
      .createShareLink(tripId)
      .then((data) => {
        if (!active) return;
        setLink(data);
        onSharedChangeRef.current?.(true);
      })
      .catch((requestError) => {
        if (active) setError(translateApiError(tRef.current, requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, tripId]);

  const handleCopy = async () => {
    if (!link?.share_url) return;
    try {
      await navigator.clipboard.writeText(link.share_url);
      setCopied(true);
      onToast?.({ message: t('share.copied'), tone: 'success' });
    } catch {
      setError(t('share.copyError'));
    }
  };

  const handleStop = async () => {
    if (!tripId || stopping) return;
    setStopping(true);
    setError('');
    try {
      await api.revokeShareLink(tripId);
      setLink(null);
      onSharedChange?.(false);
      onToast?.({ message: t('share.stopped'), tone: 'success' });
      onClose?.();
    } catch (requestError) {
      setError(translateApiError(t, requestError));
    } finally {
      setStopping(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('share.title')}>
      <p className="text-sm leading-relaxed text-slate-500">{t('share.body')}</p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          {t('share.loading')}
        </div>
      ) : link?.share_url ? (
        <div className="mt-4 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              readOnly
              value={link.share_url}
              aria-label={t('share.linkLabel')}
              onFocus={(event) => event.target.select()}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-xs font-semibold text-slate-700 transition-[border-color,box-shadow,background-color] duration-200 ease-out-strong focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <button type="button" onClick={handleCopy} className="btn-primary !px-3 !py-2.5 text-xs">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t('share.copiedShort') : t('share.copy')}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {link ? (
        <button
          type="button"
          onClick={handleStop}
          disabled={stopping}
          className="touch-target mt-4 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-rose-600 transition-[transform,color,background-color] duration-200 ease-out-strong hover:text-rose-700 active:scale-[0.97] disabled:opacity-60"
        >
          {stopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          {t('share.stop')}
        </button>
      ) : null}
    </Modal>
  );
}
