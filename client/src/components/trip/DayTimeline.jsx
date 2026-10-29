import React, { useState } from 'react';
import { Clock, MapPin, DollarSign, CloudRain, RefreshCw, Compass } from 'lucide-react';
import SwapModal from './SwapModal';

export default function DayTimeline({ days = [], tripId, onSelectPlaceOnMap, onActivityUpdated }) {
  const [selectedActivityForSwap, setSelectedActivityForSwap] = useState(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const handleOpenSwap = (activity) => {
    setSelectedActivityForSwap(activity);
    setIsSwapModalOpen(true);
  };

  const handleSwappedSuccess = (activityId, newPlace) => {
    if (onActivityUpdated) {
      onActivityUpdated(activityId, newPlace);
    }
  };

  if (!days || days.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
        Chưa có lịch trình. Vui lòng hoàn tất form yêu cầu để AI tạo lịch trình chi tiết.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div
          key={day.day_number}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
        >
          {/* Day Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-lg bg-rose-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                N{day.day_number}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Ngày {day.day_number}: {day.theme_title || 'Khám phá TP.HCM'}
                </h4>
                <p className="text-[11px] text-slate-300">
                  {day.activities?.length || 0} hoạt động trải nghiệm trong ngày
                </p>
              </div>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {day.activities?.map((act, idx) => (
              <div
                key={act.id || idx}
                className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-l-0 group"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-rose-500 group-hover:scale-125 transition-transform" />

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 hover:shadow-xs transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {act.start_time} - {act.end_time}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {act.category}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 mt-1.5">
                        {act.place_name}
                      </h5>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{act.address || `${act.district}, TP.HCM`}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600">
                        {act.cost_estimate ? `${act.cost_estimate.toLocaleString()} đ` : 'Miễn phí'}
                      </span>
                    </div>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-600 mt-2 bg-white/70 p-2 rounded-lg border border-slate-100">
                      {act.description}
                    </p>
                  )}

                  {/* Yêu cầu 4: Hiển thị điểm dự phòng trong nhà khi trời mưa */}
                  {act.contingency_indoor_place && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 text-sky-700 font-medium">
                        <CloudRain className="w-3.5 h-3.5 text-sky-500" />
                        <span>Dự phòng khi mưa: {act.contingency_indoor_place}</span>
                      </span>
                    </div>
                  )}

                  {/* Action Buttons: Đổi địa điểm & Xem trên bản đồ */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                    {onSelectPlaceOnMap && (
                      <button
                        type="button"
                        onClick={() => onSelectPlaceOnMap(act)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3 text-indigo-500" />
                        <span>Xem bản đồ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenSwap(act)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Đổi địa điểm (AI gợi ý)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal Đổi địa điểm */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        tripId={tripId}
        activity={selectedActivityForSwap}
        onSwapped={handleSwappedSuccess}
      />
    </div>
  );
}
