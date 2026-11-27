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
  Users,
  Utensils,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { cn } from '../../lib/cn.js';
import { formatVnd } from '../../lib/format.js';
import { isImeComposing } from '../../lib/tripWizardLogic.js';

export default function ExpenseTrackerView({ trip, items = [] }) {
  const { lang, t } = useI18n();
  const totalBudget = Number(trip?.budget) || 5000000;
  const memberCount = Number(trip?.member_count) || (trip?.companion === 'solo' ? 1 : 4);

  // Khởi tạo danh sách chi tiêu ban đầu từ cả ĐIỂM ĐẾN VÀ CÁC CHẶNG DI CHUYỂN
  const [expenses, setExpenses] = useState(() => {
    const list = [];
    items.forEach((it, idx) => {
      // 1. Khoản chi cho địa điểm (vé tham quan / bữa ăn / cà phê)
      const unitCost = Number(it.estimated_cost) || 0;
      const totalPlaceCost = unitCost * memberCount;
      const placeLabel = memberCount > 1 && unitCost > 0
        ? `${it.place_name} (${formatVnd(unitCost, 'vi')}/người × ${memberCount} người)`
        : `${it.place_name} (${lang === 'vi' ? 'Ngày' : 'Day'} ${it.day_number})`;

      list.push({
        id: `exp-place-${it.day_number}-${it.order_index}-${idx}`,
        name: placeLabel,
        planned: totalPlaceCost,
        actual: totalPlaceCost,
        category: it.is_lunch ? 'food' : (it.category || 'sightseeing'),
        dayNumber: it.day_number,
        isTransit: false
      });

      // 2. Khoản chi cho chặng di chuyển (Grab / Xanh SM / Be / Đi bộ)
      if (it.transit_info) {
        const fare = Number(it.transit_info.estimated_fare_vnd) || 0;
        const isWalk = it.transit_info.mode === 'walk';
        const isBike = it.transit_info.mode === 'grab_bike';
        const transitCost = isBike && memberCount > 1 ? fare * memberCount : fare;
        
        let modeLabel = 'GrabBike';
        if (isWalk) modeLabel = lang === 'vi' ? 'Đi bộ' : 'Walk';
        else if (it.transit_info.mode === 'grab_car') modeLabel = 'GrabCar / Taxi';
        else if (isBike && memberCount > 1) modeLabel = `${memberCount} xe GrabBike`;

        const transitName = isBike && memberCount > 1
          ? `Di chuyển chặng ${it.order_index}: đến ${it.place_name} (${formatVnd(fare, 'vi')}/xe × ${memberCount} xe GrabBike)`
          : `Di chuyển chặng ${it.order_index}: đến ${it.place_name} (${modeLabel})`;

        list.push({
          id: `exp-transit-${it.day_number}-${it.order_index}-${idx}`,
          name: transitName,
          planned: transitCost,
          actual: transitCost,
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
      {memberCount > 1 && (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-900">
          <Users className="h-4 w-4 shrink-0 text-brand-600" />
          <span>
            {lang === 'vi'
              ? `Nhóm ${memberCount} người: chi phí vé, ăn uống và GrabBike đã nhân theo ${memberCount} thành viên.`
              : `Group of ${memberCount}: tickets, meals, and GrabBike fares are multiplied for ${memberCount} people.`}
          </span>
        </div>
      )}

      {/* 4 THẺ TỔNG QUAN TÀI CHÍNH VÀ TIỀN DI CHUYỂN */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Ngân sách */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
            <span>{lang === 'vi' ? 'Ngân sách ban đầu' : 'Initial budget'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-slate-900">
            {formatVnd(totalBudget, lang)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'vi' ? 'Dự trù cho toàn chuyến' : 'Planned trip total'}
          </p>
        </div>

        {/* Card 2: Thực tế đã chi */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
            <DollarSign className="h-3.5 w-3.5 text-brand-600" />
            <span>{lang === 'vi' ? 'Thực tế đã chi' : 'Actual spent'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-800">
            {formatVnd(totalActual, lang)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-brand-700">
            {percentUsed}% {lang === 'vi' ? 'tổng ngân sách' : 'of budget'}
          </p>
        </div>

        {/* Card 3: Chi phí di chuyển xe (Grab / Xanh SM / Be) */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800">
            <Bike className="h-3.5 w-3.5 text-teal-600" />
            <span>{lang === 'vi' ? 'Cước Grab / Xanh SM / Be' : 'Rides & transit'}</span>
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-teal-900">
            {formatVnd(transitTotal, lang)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-teal-700">
            {lang === 'vi' ? 'Bấm số tiền bên dưới để sửa' : 'Click any amount below to edit'}
          </p>
        </div>

        {/* Card 4: Số dư còn lại */}
        <div
          className={cn(
            'rounded-2xl border p-4',
            remaining >= 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950'
          )}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {remaining >= 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
            <span>{remaining >= 0 ? (lang === 'vi' ? 'Số dư còn lại' : 'Remaining') : (lang === 'vi' ? 'Vượt ngân sách' : 'Over budget')}</span>
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
              ? (lang === 'vi' ? 'Còn trong mức dự kiến' : 'Within planned budget')
              : (lang === 'vi' ? 'Đã vượt ngân sách dự kiến' : 'Above planned budget')}
          </p>
        </div>
      </div>

      {/* THANH TIẾN TRÌNH CHI TIÊU */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{lang === 'vi' ? 'Tỷ lệ ngân sách đã dùng:' : 'Budget used:'}</span>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-display text-base font-extrabold text-slate-900">
              {lang === 'vi' ? 'Chi tiết khoản chi và cước di chuyển' : 'Expense ledger & ride fares'}
            </h4>
            <p className="text-xs text-slate-500">
              {lang === 'vi'
                ? 'Bấm vào số tiền ở cột Thực chi để cập nhật khoản đã trả.'
                : 'Click any value in Actual spent to update what you paid.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn-primary !py-2 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'vi' ? 'Thêm khoản chi' : 'Add expense'}</span>
          </button>
        </div>

        {/* THANH LỌC DANH MỤC */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="mr-1 flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <Filter className="h-3 w-3" />
            {lang === 'vi' ? 'Lọc:' : 'Filter:'}
          </span>
          {[
            { id: 'all', label: lang === 'vi' ? 'Tất cả' : 'All' },
            { id: 'transport', label: lang === 'vi' ? 'Di chuyển (Grab / Xanh SM / Be)' : 'Transport' },
            { id: 'sightseeing', label: lang === 'vi' ? 'Vé tham quan' : 'Sightseeing' },
            { id: 'food', label: lang === 'vi' ? 'Ẩm thực' : 'Food' },
            { id: 'cafe', label: lang === 'vi' ? 'Cà phê' : 'Coffee' },
            { id: 'other', label: lang === 'vi' ? 'Phát sinh khác' : 'Other' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                activeCategoryFilter === cat.id
                  ? 'bg-slate-900 text-white'
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
                <th className="pb-3 text-right">{lang === 'vi' ? 'Ước tính' : 'Estimated'}</th>
                <th className="pb-3 text-right">{lang === 'vi' ? 'Thực chi' : 'Actual spent'}</th>
                <th className="pb-3 text-right">{lang === 'vi' ? 'Chênh lệch' : 'Difference'}</th>
                <th className="pb-3 pr-1 text-center">{lang === 'vi' ? 'Xóa' : 'Delete'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-500">
                    {lang === 'vi' ? 'Không có khoản chi nào trong danh mục này.' : 'No expenses in this category.'}
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                            {lang === 'vi' ? 'Di chuyển' : 'Transport'}
                          </span>
                        ) : exp.category === 'food' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {lang === 'vi' ? 'Ẩm thực' : 'Food'}
                          </span>
                        ) : exp.category === 'cafe' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                            {lang === 'vi' ? 'Cà phê' : 'Coffee'}
                          </span>
                        ) : exp.category === 'sightseeing' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            {lang === 'vi' ? 'Tham quan' : 'Sightseeing'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {lang === 'vi' ? 'Khác' : 'Other'}
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
                                if (e.key === 'Enter' && !isImeComposing(e)) {
                                  e.preventDefault();
                                  handleUpdateActual(exp.id, editValue);
                                }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-28 rounded-lg border border-brand-500 px-2 py-1 text-right font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-300"
                              placeholder="Nhập số tiền"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateActual(exp.id, editValue)}
                              className="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-brand-700"
                            >
                              {lang === 'vi' ? 'Lưu' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              aria-label={t('common.cancel')}
                              className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              <X className="h-3.5 w-3.5" />
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
                              'group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold transition-colors',
                              exp.isTransit
                                ? 'border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100'
                                : 'text-slate-900 hover:bg-slate-100 hover:text-brand-600'
                            )}
                            title={lang === 'vi' ? 'Bấm để sửa số tiền thực chi' : 'Click to edit actual amount'}
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
                          className="inline-grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          aria-label={lang === 'vi' ? 'Xóa khoản chi' : 'Delete expense'}
                          title={lang === 'vi' ? 'Xóa mục này' : 'Delete item'}
                        >
                          <X className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 animate-fade-in">
          <form
            onSubmit={handleAddExpense}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-soft animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-display text-base font-extrabold text-slate-900">
                {lang === 'vi' ? 'Thêm khoản chi phát sinh' : 'Add expense'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={t('common.close')}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">
                  {lang === 'vi' ? 'Tên khoản chi' : 'Expense title'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'vi' ? 'VD: Cước Grab phát sinh, nước mía, gửi xe' : 'e.g. Extra Grab ride, drinks, parking'}
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
                  <option value="transport">{lang === 'vi' ? 'Di chuyển (Grab / Xanh SM / Be)' : 'Transport (Grab / Xanh SM / Be)'}</option>
                  <option value="food">{lang === 'vi' ? 'Ẩm thực & bữa ăn' : 'Food & meals'}</option>
                  <option value="cafe">{lang === 'vi' ? 'Cà phê & đồ uống' : 'Coffee & drinks'}</option>
                  <option value="sightseeing">{lang === 'vi' ? 'Vé tham quan' : 'Sightseeing tickets'}</option>
                  <option value="other">{lang === 'vi' ? 'Phát sinh khác' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {lang === 'vi' ? 'Số tiền thực tế (VND)' : 'Actual amount (VND)'}
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
                className="btn-primary flex-1 !py-2.5 text-xs font-bold"
              >
                {lang === 'vi' ? 'Thêm vào sổ' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
