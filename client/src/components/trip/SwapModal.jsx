import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { RefreshCw, MapPin, CheckCircle, Sparkles, X } from 'lucide-react';

export default function SwapModal({ isOpen, onClose, tripId, activity, onSwapped }) {
  const [loading, setLoading] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activity) {
      loadAlternatives();
    }
  }, [isOpen, activity]);

  const loadAlternatives = async () => {
    setLoading(true);
    try {
      const res = await api.post('/trips/swap-place', {
        trip_id: tripId,
        activity_id: activity.id,
        current_place_name: activity.place_name,
      });
      setAlternatives(res.data.alternatives || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = async (newPlace) => {
    setSubmitting(true);
    try {
      await api.post('/trips/swap-place', {
        trip_id: tripId,
        activity_id: activity.id,
        current_place_name: activity.place_name,
        selected_new_place: newPlace,
      });
      if (onSwapped) onSwapped(activity.id, newPlace);
      onClose();
    } catch (err) {
      alert('Không thể đổi địa điểm. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
              Yêu Cầu 2 • Đổi Địa Điểm
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Đổi: {activity.place_name}
            </h3>
            <p className="text-xs text-slate-500">
              AI đề xuất 2-3 địa điểm thay thế tương đương cùng khu vực {activity.district}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
              <span>AI đang tra cứu địa điểm tương đương tại TP.HCM...</span>
            </div>
          ) : (
            alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm text-slate-900">{alt.place_name}</h5>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {alt.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {alt.address}
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                    {alt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600">
                    {alt.cost ? `${alt.cost.toLocaleString()} đ` : 'Miễn phí'}
                  </span>
                  <button
                    disabled={submitting}
                    onClick={() => handleSelectAlternative(alt)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Chọn địa điểm này</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
