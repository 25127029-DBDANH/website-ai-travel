import React, { useState } from 'react';
import api from '../../services/api';
import { Star, X, CheckCircle } from 'lucide-react';

export default function RatingModal({ isOpen, onClose, tripId }) {
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/trips/${tripId}/rating`, {
        rating_stars: stars,
        feedback_text: feedback,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      alert('Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
              Yêu Cầu 5 • Đánh Giá Lịch Trình
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Đánh Giá Lịch Trình Do AI Tạo
            </h3>
            <p className="text-xs text-slate-500">
              Nhận xét của bạn giúp AI cải thiện đề xuất chính xác hơn cho lần sau
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center text-emerald-600">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
            <h4 className="font-bold text-base">Cảm ơn bạn đã đánh giá!</h4>
            <p className="text-xs text-slate-500 mt-1">AI đã ghi nhận phản hồi vào bộ nhớ hồ sơ du lịch của bạn.</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* 5 Stars Picker */}
            <div className="flex items-center justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStars(s)}
                  className="p-1 hover:scale-115 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      s <= stars
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-center text-xs font-semibold text-slate-600">
              {stars === 5 && '🌟 Tuyệt vời! Lịch trình rất hợp lý và đúng sở thích.'}
              {stars === 4 && '👍 Rất tốt! Các địa điểm khá thú vị.'}
              {stars === 3 && '👌 Tạm ổn, cần điều chỉnh một số mốc giờ.'}
              {stars <= 2 && '👎 Chưa hài lòng, cần cải thiện địa điểm phù hợp hơn.'}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Góp ý chi tiết (tùy chọn)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ví dụ: Thích các quán cà phê xưa, muốn thêm nhiều điểm ăn vặt hơn..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors"
              >
                Gửi đánh giá
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
