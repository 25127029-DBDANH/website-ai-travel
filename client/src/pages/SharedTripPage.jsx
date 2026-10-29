import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, MapPin, Sparkles, Compass, Clock, RefreshCw } from 'lucide-react';
import InteractiveMap from '../components/map/InteractiveMap';

export default function SharedTripPage() {
  const { shareToken } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSharedTrip();
  }, [shareToken]);

  const loadSharedTrip = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/shared/${shareToken}`);
      setTrip(res.data);
    } catch (err) {
      setError('Liên kết này không tồn tại hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mb-2" />
        <span>Đang tải lịch trình được chia sẻ...</span>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy chuyến đi</h3>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <Link to="/" className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold">
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  const allActivities = trip.days?.flatMap((d) => d.activities || []) || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner Guest Mode */}
        <div className="bg-gradient-to-r from-rose-500 to-indigo-600 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
              Lịch Trình Được Chia Sẻ Công Khai (Chỉ Xem)
            </span>
            <h1 className="text-2xl font-black mt-1">{trip.title}</h1>
            <p className="text-xs text-rose-100 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.stay_district}
              </span>
              <span>•</span>
              <span>{trip.num_days} Ngày</span>
              <span>•</span>
              <span>Ngân sách: {trip.budget_total?.toLocaleString()} đ</span>
            </p>
          </div>

          <Link
            to="/register"
            className="px-5 py-2.5 bg-white text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold shadow-md shrink-0 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Lịch Trình Cho Bạn Bằng AI</span>
          </Link>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline View */}
          <div className="lg:col-span-7 space-y-6">
            {trip.days?.map((day) => (
              <div key={day.day_number} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3 bg-slate-900 text-white text-sm font-bold flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-rose-500 flex items-center justify-center text-xs">
                    N{day.day_number}
                  </span>
                  <span>Ngày {day.day_number}: {day.theme_title || 'Khám phá TP.HCM'}</span>
                </div>

                <div className="p-4 space-y-3">
                  {day.activities?.map((act, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {act.start_time} - {act.end_time}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {act.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{act.place_name}</h4>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {act.address || `${act.district}, TP.HCM`}
                      </p>
                      {act.description && (
                        <p className="text-slate-600 text-xs mt-1 bg-white p-2 rounded border border-slate-100">
                          {act.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Map View */}
          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <InteractiveMap places={allActivities} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
