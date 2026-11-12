import { Loader2, MapPin, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { DEMO, Black } from '../../demo.jsx';
import { api, assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import MessageBubble from './MessageBubble.jsx';
import ThinkingIndicator from './ThinkingIndicator.jsx';

export default function ChatPanel({ messages, quickReplies, sending, onSend, className, demo = DEMO }) {
  const { lang, t } = useI18n();
  const [draft, setDraft] = useState('');
  const [collage, setCollage] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (demo) return undefined;
    let cancelled = false;
    api
      .listPhotos(6)
      .then((data) => {
        if (!cancelled) setCollage(Array.isArray(data?.photos) ? data.photos : []);
      })
      .catch(() => {
        if (!cancelled) setCollage([]);
      });
    return () => {
      cancelled = true;
    };
  }, [demo]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length, quickReplies.length, sending]);

  const submit = (value) => {
    const text = String(value ?? draft).trim();
    if (!text || sending) return;
    onSend(text.slice(0, 500));
    setDraft('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  };

  const handleInput = (event) => {
    setDraft(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-900/5',
        className
      )}
      aria-label={t('chat.title')}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-b from-brand-50/50 to-white px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 text-white shadow-glow">
            <MapPin className="h-5 w-5" strokeWidth={2.4} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold text-slate-900">
              {t('chat.title')}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" />
              {t('chat.online')}
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="scrollbar-thin flex-1 space-y-4 overflow-y-scroll bg-gradient-to-b from-slate-50/80 via-white to-white px-4 py-5"
      >
        {messages.length === 0 && !sending && (
          <div className="animate-fade-up">
            {collage && collage.length > 0 && (
              <div className="mask-fade-x mb-3 grid grid-cols-3 gap-1.5">
                {collage.map((photo, index) => (
                  <img
                    key={photo.place_id}
                    src={assetUrl(photo.photo_url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'w-full rounded-xl object-cover',
                      index === 0 ? 'col-span-2 row-span-2 h-full min-h-24' : 'h-14 sm:h-16'
                    )}
                  />
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-dashed border-brand-200 bg-gradient-to-b from-brand-50/80 to-white px-4 py-5 text-center ring-1 ring-brand-100/60">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-sm font-extrabold text-slate-900">
                {t('chat.welcome.heading')}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t('chat.welcome.body')}
              </p>
            </div>
          </div>
        )}

        {demo ? (
          <div className="space-y-3 pt-1">
            <Black className="ml-auto h-10 w-3/5 rounded-2xl" />
            <Black className="h-20 w-4/5 rounded-2xl" />
            <Black className="ml-auto h-10 w-2/5 rounded-2xl" />
            <Black className="h-14 w-3/4 rounded-2xl" />
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}-${message.created_at || ''}`} message={message} />
          ))
        )}

        {sending && <ThinkingIndicator />}
      </div>

      <footer className="border-t border-slate-200/80 bg-white px-3 pb-3 pt-2.5">
        {!sending && quickReplies.length > 0 && (
          <div className="scrollbar-thin mb-2.5 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => submit(reply)}
                className="touch-target shrink-0 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 transition-[transform,border-color,background-color] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-100 active:translate-y-0 active:scale-[0.98]"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 transition-[border-color,background-color,box-shadow] duration-200 ease-out-strong focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            maxLength={500}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-500 focus:outline-none sm:min-h-[40px] sm:py-2.5 sm:placeholder:text-sm"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={sending || !draft.trim()}
            aria-label={t('chat.send')}
            className="touch-target grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-glow transition-[transform,filter,opacity,box-shadow] duration-200 ease-out-strong hover:brightness-110 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[10px] font-medium text-slate-500">
            {lang === 'vi' ? 'Enter để gửi · Shift + Enter để xuống dòng' : 'Enter to send · Shift + Enter for a new line'}
          </span>
          {draft.length > 380 && (
            <span className="text-[10px] font-semibold text-slate-500">
              {t('chat.charCount', { count: draft.length })}
            </span>
          )}
        </div>
      </footer>
    </section>
  );
}
