import React, { useState } from 'react';
import api from '../../services/api';
import { Calendar, Bell, ExternalLink, CheckCircle, X, Loader2 } from 'lucide-react';

export default function CalendarModal({ isOpen, onClose, tripId, tripTitle }) {
  const [reminder, setReminder] = useState(30);
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await api.post('/calendar/sync', {
        trip_id: tripId,
        reminder_minutes: reminder,
      });
      setSyncResult(res.data);
    } catch (err) {
      alert('Không thể đồng bộ Google Calendar. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Yêu Cầu 6 • Tính Năng Đột Phá
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Đồng Bộ Lịch Trình Lên Google Calendar
            </h3>
            <p className="text-xs text-slate-500">
              Tự động tạo sự kiện theo từng khung giờ và cài đặt thông báo nhắc nhở
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {!syncResult ? (
            <>
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Chuyến đi: {tripTitle}</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Toàn bộ các hoạt động tham quan, ẩm thực và cà phê sẽ được đồng bộ chính xác theo từng mốc giờ.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cài đặt thời gian nhắc nhở thông báo trước:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setReminder(mins)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        reminder === mins
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mins} phút {mins === 30 && '(Chuẩn Yêu Cầu)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Bắt đầu đồng bộ</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{syncResult.message}</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-700">
                Nhấn vào từng hoạt động để mở và lưu vào Google Calendar cá nhân:
              </p>
              
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {syncResult.events?.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{ev.activity_name}</span>
                      <span className="block text-[10px] text-slate-500">{ev.time}</span>
                    </div>
                    <a
                      href={ev.google_calendar_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      Lưu Calendar <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="text-right pt-2 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
