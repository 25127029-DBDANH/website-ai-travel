import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Layers, ExternalLink, CloudRain, Sun } from 'lucide-react';

export default function InteractiveMap({ places = [], selectedPlace = null, onSelectPlace, isMini = false }) {
  const [activeDistrict, setActiveDistrict] = useState('All');
  const [currentSelected, setCurrentSelected] = useState(selectedPlace);

  // Danh sách các địa điểm mẫu nếu không truyền prop
  const defaultPlaces = [
    { id: '1', name: 'Nhà thờ Đức Bà & Bưu điện', district: 'Quận 1', lat: 10.7798, lng: 106.6990, x: 50, y: 38, category: 'Kiến trúc & Di tích', is_indoor: false },
    { id: '2', name: 'Dinh Độc Lập', district: 'Quận 1', lat: 10.7770, lng: 106.6954, x: 44, y: 40, category: 'Di tích lịch sử', is_indoor: true },
    { id: '3', name: 'Chợ Bến Thành', district: 'Quận 1', lat: 10.7726, lng: 106.6980, x: 48, y: 48, category: 'Ẩm thực & Mua sắm', is_indoor: true },
    { id: '4', name: 'Bến Bạch Đằng & Waterbus', district: 'Quận 1', lat: 10.7731, lng: 106.7067, x: 62, y: 46, category: 'Ngắm cảnh', is_indoor: false },
    { id: '5', name: 'Hồ Con Rùa & Cà phê bệt', district: 'Quận 3', lat: 10.7827, lng: 106.6961, x: 46, y: 32, category: 'Ẩm thực vỉa hè', is_indoor: false },
    { id: '6', name: 'Chùa Bà Thiên Hậu', district: 'Quận 5', lat: 10.7538, lng: 106.6601, x: 22, y: 65, category: 'Văn hóa Chợ Lớn', is_indoor: true },
    { id: '7', name: 'Landmark 81', district: 'Bình Thạnh', lat: 10.7951, lng: 106.7218, x: 78, y: 22, category: 'Check-in Hiện đại', is_indoor: true },
    { id: '8', name: 'Phố Ốc Vĩnh Khánh', district: 'Quận 4', lat: 10.7612, lng: 106.7025, x: 55, y: 62, category: 'Ẩm thực đêm', is_indoor: false },
  ];

  const mapPlaces = places.length > 0 ? places : defaultPlaces;

  // Lọc theo quận
  const filteredPlaces = activeDistrict === 'All' 
    ? mapPlaces 
    : mapPlaces.filter(p => p.district === activeDistrict || p.district?.includes(activeDistrict));

  const handleMarkerClick = (p) => {
    setCurrentSelected(p);
    if (onSelectPlace) onSelectPlace(p);
  };

  if (isMini) {
    return (
      <div className="bg-slate-900 rounded-xl p-3 text-white shadow-lg overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-rose-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            Bản đồ lộ trình mini
          </span>
          <span className="text-slate-400">TP. Hồ Chí Minh</span>
        </div>
        <div className="relative h-44 w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center">
          {/* Sơ đồ sông Sài Gòn cách điệu */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 60,0 Q 75,30 55,60 T 70,100" fill="none" stroke="#38bdf8" strokeWidth="4" />
          </svg>
          {mapPlaces.slice(0, 4).map((p, idx) => {
            const posX = 25 + idx * 18;
            const posY = 30 + (idx % 2) * 28;
            return (
              <div
                key={idx}
                style={{ left: `${posX}%`, top: `${posY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-bounce">
                  {idx + 1}
                </div>
                <span className="text-[10px] bg-slate-900/90 px-1 rounded text-slate-200 whitespace-nowrap mt-0.5 border border-slate-700">
                  {p.place_name || p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[520px]">
      {/* Map Header Toolbar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Bản Đồ Tương Tác TP.HCM</h4>
            <p className="text-[11px] text-slate-500">Khám phá các tọa độ du lịch, ẩm thực và check-in</p>
          </div>
        </div>

        {/* Filter Districts */}
        <div className="flex items-center space-x-1 text-xs">
          {['All', 'Quận 1', 'Quận 3', 'Quận 5'].map((dist) => (
            <button
              key={dist}
              onClick={() => setActiveDistrict(dist)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeDistrict === dist
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {dist === 'All' ? 'Tất cả quận' : dist}
            </button>
          ))}
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden select-none">
        {/* Bản đồ nền cách điệu mô phỏng TP.HCM */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Đường uốn lượn Sông Sài Gòn */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M 68,0 C 72,25 58,45 64,70 C 68,85 62,95 65,100"
            fill="none"
            stroke="#0284c7"
            strokeWidth="3.5"
            strokeDasharray="4 2"
          />
          <text x="66" y="15" fill="#38bdf8" fontSize="2.5" opacity="0.6">Sông Sài Gòn</text>
        </svg>

        {/* Cụm Marker Tương Tác */}
        {filteredPlaces.map((p, idx) => {
          const posX = p.x || (30 + (idx * 14) % 60);
          const posY = p.y || (25 + (idx * 16) % 55);
          const isSelected = currentSelected?.name === p.name || currentSelected?.id === p.id;

          return (
            <div
              key={p.id || idx}
              style={{ left: `${posX}%`, top: `${posY}%` }}
              onClick={() => handleMarkerClick(p)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
            >
              <div
                className={`flex items-center justify-center rounded-full transition-transform ${
                  isSelected
                    ? 'w-9 h-9 bg-rose-500 text-white shadow-lg ring-4 ring-rose-300 scale-125 z-20'
                    : 'w-7 h-7 bg-white text-slate-800 shadow-md border-2 border-rose-500 hover:scale-110'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-rose-500'}`} />
              </div>

              {/* Marker Tooltip on Hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-30 border border-slate-700">
                <p className="font-bold text-rose-300">{p.name || p.place_name}</p>
                <p className="text-[10px] text-slate-300">{p.district} • {p.category}</p>
              </div>
            </div>
          );
        })}

        {/* Selected Place Overlay Card */}
        {currentSelected && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 z-30 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                  {currentSelected.category}
                </span>
                <h5 className="font-bold text-sm text-slate-900 mt-1">
                  {currentSelected.name || currentSelected.place_name}
                </h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentSelected.address || `${currentSelected.district}, TP.HCM`}
                </p>
              </div>
              <button
                onClick={() => setCurrentSelected(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                {currentSelected.is_indoor ? (
                  <><Sun className="w-3.5 h-3.5" /> Có điều hòa / Trong nhà</>
                ) : (
                  <><CloudRain className="w-3.5 h-3.5 text-amber-500" /> Điểm ngoài trời</>
                )}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentSelected.name || currentSelected.place_name + ' ' + currentSelected.district)}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
              >
                Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
