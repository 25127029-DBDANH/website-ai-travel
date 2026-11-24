import { Check, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import Modal from '../Modal.jsx';

export default function StopSwapModal({
  open,
  onClose,
  item,
  swapReason,
  onSwapReasonChange,
  onSearchReason,
  alternatives = [],
  selectedReplacement,
  onSelectReplacement,
  loadingAlternatives = false,
  swapError = '',
  swapSource = null,
  swapping = false,
  onConfirmSwap
}) {
  const { lang } = useI18n();
  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lang === 'vi' ? 'Đổi điểm dừng' : 'Swap stop'}
      className="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-4 !py-2 text-xs"
          >
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
          <button
            type="button"
            disabled={!selectedReplacement || swapping || loadingAlternatives}
            onClick={onConfirmSwap}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            {swapping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{lang === 'vi' ? 'Đổi sang điểm này' : 'Confirm swap'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600">
          {lang === 'vi' ? 'Đang thay thế: ' : 'Replacing: '}
          <strong className="font-semibold text-slate-900">{item.place_name}</strong>
          {item.time_slot ? ` (${item.time_slot})` : ''}
        </p>

        <div>
          <label
            className="block text-xs font-semibold text-slate-700"
            htmlFor={`swap-reason-${item.place_id || item.order_index}`}
          >
            {lang === 'vi' ? 'Lý do muốn đổi (không bắt buộc)' : 'Reason for swapping (optional)'}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={`swap-reason-${item.place_id || item.order_index}`}
              type="text"
              value={swapReason}
              onChange={(event) => onSwapReasonChange(event.target.value)}
              maxLength={300}
              placeholder={
                lang === 'vi'
                  ? 'VD: muốn chỗ trong nhà hoặc gần hơn'
                  : 'e.g. indoor spot or closer by'
              }
              className="input !py-2 text-xs"
            />
            <button
              type="button"
              onClick={() => onSearchReason(swapReason)}
              disabled={loadingAlternatives}
              className="btn-secondary shrink-0 !px-3 !py-2 text-xs"
            >
              {lang === 'vi' ? 'Tìm gợi ý' : 'Search'}
            </button>
          </div>
        </div>

        {!loadingAlternatives && alternatives.length > 0 && swapSource === 'fallback' ? (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
          >
            {lang === 'vi'
              ? 'Gợi ý tạm lấy từ danh mục địa điểm vì AI chưa phản hồi.'
              : 'Showing catalog alternatives while AI is unavailable.'}
          </p>
        ) : null}

        <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
          {loadingAlternatives ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden="true" />
              <span>{lang === 'vi' ? 'Đang tìm địa điểm phù hợp...' : 'Finding alternatives...'}</span>
            </div>
          ) : swapError ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
            >
              {swapError}
            </p>
          ) : alternatives.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              {lang === 'vi' ? 'Chưa tìm thấy điểm thay thế phù hợp.' : 'No alternatives found.'}
            </p>
          ) : (
            alternatives.map((alt) => {
              const isSelected = selectedReplacement?.place_id === alt.place_id;
              const altPhoto = alt.photo_url ? assetUrl(alt.photo_url) : null;
              return (
                <button
                  key={alt.place_id}
                  type="button"
                  onClick={() => onSelectReplacement(alt)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {altPhoto ? (
                      <img
                        src={altPhoto}
                        alt={alt.place_name}
                        className="h-12 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-slate-900">
                        {alt.place_name}
                      </p>
                      {alt.description ? (
                        <p className="line-clamp-1 text-xs text-slate-500">{alt.description}</p>
                      ) : null}
                      {alt.replacement_reason ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-emerald-700">
                          {alt.replacement_reason}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {alt.district}
                        {alt.editorial_score ? ` · ★ ${alt.editorial_score}` : ''}
                        {' · '}
                        <span className="text-slate-800">
                          {alt.estimated_cost > 0
                            ? formatVnd(alt.estimated_cost, lang)
                            : lang === 'vi'
                            ? 'Miễn phí'
                            : 'Free'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                      isSelected
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
