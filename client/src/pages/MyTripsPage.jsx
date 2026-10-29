import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Calendar, MapPin, Share2, Trash2, ArrowRight, Sparkles, Search, Copy, Check } from 'lucide-react';

export default function MyTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMyTrips();
  }, []);

  const loadMyTrips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trips/my-trips');
      setTrips(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = (token) => {
    const fullUrl = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.stay_district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Yêu Cầu 5 • My Trips
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Bộ Sưu Tập Chuyến Đi Của Tôi
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý danh sách các lịch trình TP.HCM đã tạo, xem lại và chia sẻ liên kết
            </p>
          </div>

          <Link
            to="/planner"
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tạo Chuyến Đi Mới</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên chuyến đi hoặc quận..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        {/* Trips Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Đang tải danh sách chuyến đi...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">Chưa có chuyến đi nào</h4>
            <p className="text-xs text-slate-500">
              Hãy dùng tính năng AI Planner để tạo chuyến đi đầu tiên khám phá TP.HCM!
            </p>
            <Link
              to="/planner"
              className="inline-block mt-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              Tạo Lịch Trình Ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t.num_days} Ngày
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t.created_at?.slice(0, 10)}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 line-clamp-2">
                    {t.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Lưu trú: {t.stay_district}</span>
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ngân sách dự tính:</span>
                    <span className="font-bold text-slate-800">
                      {t.budget_total?.toLocaleString()} đ
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(t.share_token)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    title="Sao chép link xem công khai"
                  >
                    {copiedToken === t.share_token ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedToken === t.share_token ? 'Đã sao chép!' : 'Chia sẻ'}</span>
                  </button>

                  <Link
                    to={`/trips/${t.id}`}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
