import React from 'react';
import { Compass, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            HCMC AI Travel Planner
          </span>
          <span className="text-xs text-slate-400">© 2026 Đồ Án Nhóm</span>
        </div>

        <div className="text-xs text-slate-500 flex items-center space-x-1">
          <span>Xây dựng với</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>kết hợp Google Gemini 1.5 & Google Places API</span>
        </div>
      </div>
    </footer>
  );
}
