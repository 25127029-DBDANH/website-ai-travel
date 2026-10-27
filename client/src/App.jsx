import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-orange-50 p-6 text-center">
      <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <span className="text-4xl">🗺️</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">HCMC AI Travel Planner</h1>
        <p className="text-gray-600 mb-6">Website AI Lên Lịch Trình Du Lịch TP. Hồ Chí Minh Thông Minh</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 bg-blue-50 rounded-xl">
            <h3 className="font-semibold text-blue-900">🔐 Bắt buộc Đăng nhập</h3>
            <p className="text-sm text-blue-700 mt-1">Cá nhân hóa lịch trình theo lịch sử cũ.</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl">
            <h3 className="font-semibold text-orange-900">📅 Google Calendar</h3>
            <p className="text-sm text-orange-700 mt-1">Đồng bộ lịch trình nhắc nhở trên điện thoại.</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <h3 className="font-semibold text-green-900">🌧️ Dự phòng Trời mưa</h3>
            <p className="text-sm text-green-700 mt-1">Tự động đổi điểm tham quan trong nhà có mái che.</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <h3 className="font-semibold text-purple-900">🗺️ Bản đồ trong Chat</h3>
            <p className="text-sm text-purple-700 mt-1">Xem lộ trình trực quan và đổi địa điểm nhanh.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
