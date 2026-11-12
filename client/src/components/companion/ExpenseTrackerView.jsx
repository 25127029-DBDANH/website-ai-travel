import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle2,
  DollarSign,
  Edit2,
  Filter,
  MapPin,
  Minus,
  Navigation,
  Plus,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';

export default function ExpenseTrackerView({ trip, items = [] }) {
  const { lang, t } = useI18n();
  const totalBudget = Number(trip?.budget) || 5000000;

  // Khởi tạo danh sách chi tiêu ban đầu từ cả ĐIỂM ĐẾN VÀ CÁC CHẶNG DI CHUYỂN
  const [expenses, setExpenses] = useState(() => {
    const list = [];
    items.forEach((it, idx) => {
      // 1. Khoản chi cho địa điểm (vé tham quan / bữa ăn / cà phê)
      list.push({
        id: `exp-place-${it.day_number}-${it.order_index}-${idx}`,
        name: `${it.place_name} (${lang === 'vi' ? 'Ngày' : 'Day'} ${it.day_number})`,
        planned: Number(it.estimated_cost) || 0,
        actual: Number(it.estimated_cost) || 0,
        category: it.is_lunch ? 'food' : (it.category || 'sightseeing'),
        dayNumber: it.day_number,
        isTransit: false
      });

      // 2. Khoản chi cho chặng di chuyển (Grab / Xanh SM / Be / Đi bộ)
      if (it.transit_info) {
        const fare = Number(it.transit_info.estimated_fare_vnd) || 0;
        const isWalk = it.transit_info.mode === 'walk';
        const modeLabel = isWalk
          ? (lang === 'vi' ? 'Đi bộ' : 'Walk')
          : (it.transit_info.mode === 'grab_car' ? 'GrabCar / Taxi Xanh SM' : 'GrabBike / beBike');

        list.push({
          id: `exp-transit-${it.day_number}-${it.order_index}-${idx}`,
          name: `🚗 Di chuyển chặng ${it.order_index}: đến ${it.place_name} (${modeLabel})`,
          planned: fare,
          actual: fare,
          category: 'transport',
          dayNumber: it.day_number,
          isTransit: true,
          modeLabel
        });
      }
    });
    return list;
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('other');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const totalPlanned = expenses.reduce((sum, e) => sum + e.planned, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actual, 0);
  const remaining = totalBudget - totalActual;
  const percentUsed = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  // Thống kê riêng tiền di chuyển
  const transitTotal = useMemo(() => {
    return expenses
      .filter((e) => e.category === 'transport')
      .reduce((sum, e) => sum + e.actual, 0);
  }, [expenses]);

  const handleUpdateActual = (id, newAmount) => {
    const val = Number(newAmount);
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, actual: isNaN(val) ? e.actual : Math.max(0, val) } : e))
    );
    setEditingId(null);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!customName.trim() || !customAmount) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        planned: 0,
        actual: Math.max(0, Number(customAmount) || 0),
        category: customCategory,
        dayNumber: 1,
        isTransit: customCategory === 'transport'
      }
    ]);
    setCustomName('');
    setCustomAmount('');
    setCustomCategory('other');
    setShowAddModal(false);
  };

  const handleDeleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Lọc danh sách theo danh mục
  const filteredExpenses = useMemo(() => {
    if (activeCategoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === activeCategoryFilter);
  }, [expenses, activeCategoryFilter]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 4 THẺ TỔNG QUAN TÀI CHÍNH VÀ TIỀN DI CHUYỂN */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Ngân sách */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
            <span>{lang === 'vi' ? 'Ngân sách ban đầu' : 'Initial Budget'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-slate-900">
            {formatVnd(totalBudget, lang)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {lang === 'vi' ? 'Dự trù cho toàn chuyến đi' : 'Estimated for total trip'}
          </p>
        </div>

        {/* Card 2: Thực tế đã chi */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
            <DollarSign className="h-3.5 w-3.5 text-brand-600" />
            <span>{lang === 'vi' ? 'Thực tế đã chi' : 'Actual Spent'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-800">
            {formatVnd(totalActual, lang)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-brand-600">
            {percentUsed}% {lang === 'vi' ? 'tổng ngân sách' : 'of budget'}
          </p>
        </div>

        {/* Card 3: Chi phí di chuyển xe (Grab / Xanh SM / Be) */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800">
            <Bike className="h-3.5 w-3.5 text-teal-600" />
            <span>{lang === 'vi' ? 'Cước di chuyển (Grab/XanhSM)' : 'Rides & Transit'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-teal-900">
            {formatVnd(transitTotal, lang)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-teal-700">
            {lang === 'vi' ? 'Có thể điền cụ thể bên dưới' : 'Editable in ledger below'}
          </p>
        </div>

        {/* Card 4: Số dư còn lại */}
        <div
          className={cn(
            'rounded-2xl border p-4 shadow-xs',
            remaining >= 0
              ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950'
          )}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {remaining >= 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
            <span>{remaining >= 0 ? (lang === 'vi' ? 'Số dư còn lại' : 'Remaining Balance') : (lang === 'vi' ? 'Vượt ngân sách' : 'Over Budget')}</span>
          </p>
          <p
            className={cn(
              'mt-1 font-display text-2xl font-extrabold',
              remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
            )}
          >
            {formatVnd(Math.abs(remaining), lang)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-600">
            {remaining >= 0
              ? (lang === 'vi' ? '✓ Chi tiêu rất tiết kiệm & hợp lý' : 'Within budget')
              : (lang === 'vi' ? '⚠️ Nên cân đối lại các khoản sau' : 'Needs attention')}
          </p>
        </div>
      </div>

      {/* THANH TIẾN TRÌNH CHI TIÊU */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{lang === 'vi' ? 'Tỷ lệ giải ngân ngân sách:' : 'Budget Utilization:'}</span>
          <span className={cn('font-mono font-extrabold', percentUsed > 100 ? 'text-rose-600' : 'text-emerald-700')}>
            {percentUsed}%
          </span>
        </div>
        <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percentUsed > 100
                ? 'bg-rose-500'
                : percentUsed > 85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            )}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
      </div>

      {/* BẢNG SO SÁNH DỰ KIẾN VS THỰC CHI VÀ ĐIỀN CƯỚC DI CHUYỂN */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-display text-base font-extrabold text-slate-900">
              {lang === 'vi' ? 'Sổ nhật ký chi tiêu từng khoản & Cước di chuyển' : 'Detailed Expense Ledger & Rides'}
            </h4>
            <p className="text-xs text-slate-500">
              {lang === 'vi'
                ? 'Bấm vào số tiền thực tế (hoặc biểu tượng bút) để điền chi phí thực tế đã trả'
                : 'Click on the actual amount to enter your exact spent money'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary !py-2 text-xs font-bold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'vi' ? '+ Thêm khoản chi ngoài' : '+ Add Expense'}</span>
          </button>
        </div>

        {/* THANH LỌC DANH MỤC */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Lọc:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'transport', label: '🚗 Di chuyển (Grab / Xanh SM / Be)' },
            { id: 'sightseeing', label: '🏛️ Vé tham quan' },
            { id: 'food', label: '🍜 Ẩm thực & Bữa ăn' },
            { id: 'cafe', label: '☕ Cà phê' },
            { id: 'other', label: 'Phát sinh khác' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                activeCategoryFilter === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-3 divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 font-bold text-slate-500">
                <th className="pb-3 pl-1 font-extrabold">{lang === 'vi' ? 'Hạng mục chi tiêu' : 'Item'}</th>
                <th className="pb-3 text-center">{lang === 'vi' ? 'Phân loại' : 'Category'}</th>
                <th className="pb-3 text-right">{lang === 'vi' ? 'AI Dự kiến' : 'AI Planned'}</th>
                <th className="pb-3 text-right">{lang === 'vi' ? 'Thực tế bạn trả' : 'Actual Spent'}</th>
                <th className="pb-3 text-right">{lang === 'vi' ? 'Chênh lệch' : 'Difference'}</th>
                <th className="pb-3 pr-1 text-center">{lang === 'vi' ? 'Xóa' : 'Delete'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    Không có khoản chi nào trong danh mục này.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const diff = exp.actual - exp.planned;
                  const isEditing = editingId === exp.id;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-1 font-bold text-slate-900 max-w-[280px]">
                        <span className={cn(exp.isTransit ? 'text-teal-900 font-extrabold' : '')}>
                          {exp.name}
                        </span>
                      </td>

                      <td className="py-3 text-center">
                        {exp.category === 'transport' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800">
                            🚗 Di chuyển
                          </span>
                        ) : exp.category === 'food' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                            🍜 Ẩm thực
                          </span>
                        ) : exp.category === 'cafe' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800">
                            ☕ Cà phê
                          </span>
                        ) : exp.category === 'sightseeing' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                            🏛️ Tham quan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            Khác
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right font-mono text-slate-500">
                        {formatVnd(exp.planned, lang)}
                      </td>

                      <td className="py-3 text-right font-mono">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateActual(exp.id, editValue);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-28 rounded-lg border border-brand-500 px-2 py-1 text-right font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-300"
                              placeholder="Nhập số tiền"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateActual(exp.id, editValue)}
                              className="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-brand-700"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-slate-100 px-1.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(exp.id);
                              setEditValue(String(exp.actual));
                            }}
                            className={cn(
                              'group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold transition-all',
                              exp.isTransit
                                ? 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200/60'
                                : 'text-slate-900 hover:bg-slate-100 hover:text-brand-600'
                            )}
                            title="Bấm để điền/chỉnh sửa số tiền thực tế bạn đã trả"
                          >
                            <span>{formatVnd(exp.actual, lang)}</span>
                            <Edit2 className="h-3 w-3 text-slate-400 group-hover:text-brand-600" />
                          </button>
                        )}
                      </td>

                      <td className="py-3 text-right font-mono font-bold">
                        {diff === 0 ? (
                          <span className="text-slate-400">0 đ</span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600">
                            <TrendingUp className="h-3 w-3" />
                            +{formatVnd(diff, lang)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600">
                            <TrendingDown className="h-3 w-3" />
                            {formatVnd(diff, lang)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="Xóa mục này"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM KHOẢN CHI MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleAddExpense}
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display text-base font-extrabold text-slate-900">
                {lang === 'vi' ? 'Thêm khoản chi phát sinh' : 'Add Expense'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">
                  {lang === 'vi' ? 'Tên khoản chi' : 'Expense Title'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Cước Grab phát sinh, Quà lưu niệm, Nước mía..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">
                  {lang === 'vi' ? 'Phân loại chi phí' : 'Category'}
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="input"
                >
                  <option value="transport">🚗 Di chuyển (Grab / Xanh SM / Be)</option>
                  <option value="food">🍜 Ẩm thực & Bữa ăn</option>
                  <option value="cafe">☕ Cà phê & Đồ uống</option>
                  <option value="sightseeing">🏛️ Vé tham quan</option>
                  <option value="other">Phát sinh khác</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {lang === 'vi' ? 'Số tiền thực tế (VND)' : 'Amount (VND)'}
                </label>
                <input
                  type="number"
                  placeholder="VD: 50000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="input font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-secondary flex-1 !py-2.5 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 !py-2.5 text-xs font-extrabold"
              >
                {lang === 'vi' ? 'Thêm vào sổ' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
