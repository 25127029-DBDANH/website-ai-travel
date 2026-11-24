import { ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function ConceptDialog({
  concept,
  submitting,
  submissionStage,
  error,
  lang,
  t,
  onClose,
  onApprove
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const vi = lang === 'vi';

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocusRef.current?.focus?.();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-concept-title"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={(event) => event.key === 'Escape' && !submitting && onClose()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm outline-none"
    >
      <section className="modal-panel w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-brand-50/70 p-5 sm:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {concept.source === 'fallback'
                ? vi
                  ? 'Gợi ý dự phòng'
                  : 'Fallback suggestion'
                : vi
                  ? 'Đề xuất từ Gemini'
                  : 'Gemini suggestion'}
            </span>
            <h2 id="trip-concept-title" className="mt-2 font-display text-xl font-extrabold text-slate-900">
              {vi ? 'Concept chuyến đi của bạn' : 'Your trip concept'}
            </h2>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={vi ? 'Đóng concept' : 'Close concept'}
            className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 sm:p-6">
          {concept.source === 'fallback' && (
            <p
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900"
            >
              {concept.fallback_reason
                ? vi
                  ? 'Không kết nối được Gemini. Khi bạn đồng ý, hệ thống sẽ tạo lịch trình dự phòng và báo rõ nguồn kết quả.'
                  : 'Could not reach Gemini. If you approve, the app will create a fallback itinerary and label its source.'
                : vi
                  ? 'Gemini chưa trả lời được. Đây là concept dự phòng được tạo từ danh sách địa điểm có sẵn.'
                  : 'Gemini did not respond. This fallback concept was created from the available place catalog.'}
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-700">{concept.summary}</p>
          {concept.highlights?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {vi ? 'Điểm nổi bật' : 'Highlights'}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {concept.highlights.map((highlight, index) => (
                  <li key={`${highlight}-${index}`} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-brand-600" aria-hidden="true">
                      •
                    </span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {concept.recommended_districts?.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {vi ? 'Các quận dự kiến' : 'Recommended districts'}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {concept.recommended_districts.map((district) => (
                  <span
                    key={district}
                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"
                  >
                    {district}
                  </span>
                ))}
              </div>
            </section>
          )}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {vi ? 'Lộ trình gợi ý' : 'Suggested route'}
            </h3>
            <p className="mt-1 text-sm text-slate-700">{concept.route_overview}</p>
          </section>
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
            {concept.confirmation_question}
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              {error}
            </p>
          )}
          {submitting && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-700"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
              {submissionStage === 'generate' ? t('form.stage.generate') : t('form.stage.save')}
            </p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" disabled={submitting} onClick={onClose} className="btn-secondary min-h-11">
            {vi ? 'Để sau' : 'Not now'}
          </button>
          <button type="button" disabled={submitting} onClick={onApprove} className="btn-primary min-h-11">
            {submitting
              ? vi
                ? 'Đang xử lý...'
                : 'Working...'
              : vi
                ? 'Đồng ý, tạo lịch trình'
                : 'Approve and create itinerary'}
            {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </footer>
      </section>
    </div>
  );
}
