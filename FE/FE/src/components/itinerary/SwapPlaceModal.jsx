import { Check, MapPin, RefreshCw, Sparkles, Star, Tag, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { getSwapAlternatives } from '../../lib/catalogService.js';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { assetUrl } from '../../lib/api.js';
import Modal from '../Modal.jsx';

export default function SwapPlaceModal({
  open,
  onClose,
  targetItem,
  itineraryItems = [],
  onSelectReplacement,
  onRequestAi
}) {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'ai'
  const [customPrompt, setCustomPrompt] = useState('');

  const alternatives = useMemo(() => {
    if (!open || !targetItem) return [];
    return getSwapAlternatives(targetItem, itineraryItems, 3);
  }, [open, targetItem, itineraryItems]);

  if (!targetItem) return null;

  const handleSelect = (replacement) => {
    onSelectReplacement?.(targetItem, replacement);
    onClose?.();
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onRequestAi?.(targetItem, customPrompt.trim());
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Gợi ý thay thế thông minh
            </span>
            <h3 className="font-display text-sm font-extrabold text-slate-900 line-clamp-1">
              Đổi điểm: {targetItem.place_name}
            </h3>
          </div>
        </div>
      }
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Điểm hiện tại đang xét */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Điểm đang chọn:</span>
            <p className="font-bold text-slate-900 truncate">{targetItem.place_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{targetItem.address}</p>
          </div>
          <span className="font-extrabold text-slate-700 shrink-0 ml-3">
            {formatVnd(targetItem.estimated_cost || 0, lang)}
          </span>
        </div>

        {/* Tabs chọn: Gợi ý có sẵn vs Nhờ AI */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={cn(
              'flex-1 rounded-lg py-1.5 font-bold transition-all',
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            Địa điểm tương đồng ({alternatives.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={cn(
              'flex items-center justify-center gap-1 flex-1 rounded-lg py-1.5 font-bold transition-all',
              activeTab === 'ai'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Sparkles className="h-3 w-3" />
            Nhờ AI gợi ý riêng
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <div className="space-y-2.5">
            {alternatives.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Không tìm thấy thêm địa điểm cùng danh mục trong kho. Bạn có thể nhờ AI tìm kiếm riêng bên tab bên cạnh!
              </div>
            ) : (
              alternatives.map((alt) => (
                <div
                  key={alt.place_id || alt.place_name}
                  className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm hover:border-brand-300 hover:shadow-soft transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {alt.photo_url && (
                      <img
                        src={assetUrl(alt.photo_url)}
                        alt={alt.place_name}
                        className="h-16 w-20 shrink-0 rounded-xl object-cover border border-slate-200/60"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[9.5px] font-extrabold text-brand-700">
                          {alt.swap_reason || alt.district}
                        </span>
                        {alt.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {alt.rating.toFixed(1)}
                          </span>
                        )}
                        {alt.is_indoor && (
                          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                            Máy lạnh
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 font-display text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {alt.place_name}
                      </h4>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        {alt.address}
                      </p>
                      <p className="mt-1 text-xs font-extrabold text-slate-900">
                        {formatVnd(alt.estimated_cost, lang)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(alt)}
                    className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Chọn điểm này
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleAiSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Mô tả mong muốn thay thế của bạn:
              </label>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ví dụ: Tìm một quán cafe rooftop ngắm hoàng hôn gần đây, hoặc quán ăn chay thanh tịnh..."
                className="input text-xs w-full resize-none p-3"
                maxLength={200}
              />
            </div>
            <button
              type="submit"
              disabled={!customPrompt.trim()}
              className="btn-primary w-full !py-2.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gửi yêu cầu tới AI
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

