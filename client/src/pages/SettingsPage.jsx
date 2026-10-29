import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Sparkles, MapPin, Compass, CheckCircle, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [districts, setDistricts] = useState(['Quận 1', 'Quận 3']);
  const [categories, setCategories] = useState(['Ẩm thực', 'Cà phê & Check-in']);
  const [budgetLevel, setBudgetLevel] = useState('Vừa phải');
  const [transportMode, setTransportMode] = useState('Xe máy');
  const [dietaryNotes, setDietaryNotes] = useState('');

  const allDistricts = ['Quận 1', 'Quận 3', 'Quận 5 (Chợ Lớn)', 'TP. Thủ Đức', 'Bình Thạnh', 'Phú Nhuận', 'Quận 4'];
  const allCategories = ['Ẩm thực', 'Di tích lịch sử', 'Cà phê & Check-in', 'Văn hóa Chợ Lớn', 'Mua sắm & Chợ đêm', 'Dã ngoại bến sông'];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/preferences');
      if (res.data?.preferences) {
        const p = res.data.preferences;
        if (p.favorite_districts) setDistricts(p.favorite_districts);
        if (p.preferred_categories) setCategories(p.preferred_categories);
        if (p.budget_level) setBudgetLevel(p.budget_level);
        if (p.transport_mode) setTransportMode(p.transport_mode);
        if (p.dietary_notes) setDietaryNotes(p.dietary_notes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await api.put('/auth/preferences', {
        favorite_districts: districts,
        preferred_categories: categories,
        budget_level: budgetLevel,
        transport_mode: transportMode,
        dietary_notes: dietaryNotes,
      });
      setSavedMsg('Đã lưu thành công! Bộ nhớ AI sẽ ghi nhớ để cá nhân hóa cho các chuyến đi sau.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert('Không thể lưu sở thích. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDistrict = (d) => {
    setDistricts(districts.includes(d) ? districts.filter((x) => x !== d) : [...districts, d]);
  };

  const toggleCategory = (c) => {
    setCategories(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c]);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`}
              alt="avatar"
              className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 shadow-xs"
            />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                Yêu Cầu 7 • Bộ Nhớ Du Lịch AI
              </span>
            </div>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        {/* Preferences Form */}
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Sở Thích Cá Nhân Cho Trợ Lý AI Ghi Nhớ</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Những thông tin này sẽ được AI dùng để tự động điền sẵn (pre-fill) form mỗi khi bạn quay lại tạo chuyến đi mới.
            </p>
          </div>

          {/* Quận yêu thích */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Quận bạn yêu thích nhất tại TP.HCM:
            </label>
            <div className="flex flex-wrap gap-2">
              {allDistricts.map((d) => {
                const active = districts.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDistrict(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '} {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh mục ưa chuộng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Phong cách & Trải nghiệm ưa thích:
            </label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((c) => {
                const active = categories.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active ? '✓ ' : '+ '} {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phương tiện & Mức ngân sách */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phương tiện di chuyển quen thuộc:
              </label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="Xe máy">Xe máy (Linh hoạt)</option>
                <option value="Taxi / Grab">Taxi / Grab (Thoải mái)</option>
                <option value="Đi bộ">Đi bộ & Khám phá hẻm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức chi tiêu trung bình:
              </label>
              <select
                value={budgetLevel}
                onChange={(e) => setBudgetLevel(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="Tiết kiệm">Tiết kiệm (Dưới 1 triệu/ngày)</option>
                <option value="Vừa phải">Vừa phải (1 - 2.5 triệu/ngày)</option>
                <option value="Cao cấp">Cao cấp (Trải nghiệm sang trọng)</option>
              </select>
            </div>
          </div>

          {/* Ghi chú ăn uống / Thói quen */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú riêng cho AI (chế độ ăn, dị ứng, thói quen du lịch):
            </label>
            <textarea
              rows={2}
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              placeholder="Ví dụ: Thích đồ ăn cay, thích cà phê sữa đá, tránh đồ ngọt nhiều..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu Cập Nhật Bộ Nhớ AI</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
