import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Sparkles, MapPin, Calendar, ShieldCheck, ArrowRight, CloudRain, Clock, Users } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-white via-rose-50/20 to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hệ Thống Lên Kế Hoạch Du Lịch TP.HCM Tích Hợp AI 2026</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Khám Phá Sài Gòn Thông Minh Cùng{' '}
              <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                Trợ Lý AI Cá Nhân Hóa
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              Tối ưu hóa hành trình từng giờ với <strong>Google Gemini 1.5</strong> và dữ liệu thực tế từ <strong>Google Places</strong>. Tự động xử lý phương án tránh kẹt xe giờ cao điểm, kịch bản khi trời mưa và đồng bộ trực tiếp lên <strong>Google Calendar</strong>.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  to="/planner"
                  className="px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 shadow-md shadow-rose-500/25 flex items-center gap-2 hover:scale-105 transition-all text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Vào Không Gian Lập Lịch Trình</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 shadow-md shadow-rose-500/25 flex items-center gap-2 hover:scale-105 transition-all text-sm"
                  >
                    <span>Đăng Nhập Để Bắt Đầu</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-3.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors text-sm"
                  >
                    Đăng Ký Tài Khoản Mới
                  </Link>
                </>
              )}
            </div>

            {/* Mandatory Login Note (Yêu cầu 1) */}
            <p className="mt-4 text-xs text-slate-400">
              🔒 Bắt buộc đăng nhập để sử dụng chat AI, xem bản đồ và đồng bộ Calendar nhằm ghi nhớ sở thích cá nhân.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Trải Nghiệm Du Lịch Đột Phá Chuẩn 7 Yêu Cầu Giảng Viên
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Được thiết kế toàn diện phục vụ bảo vệ đồ án chuyên nghiệp
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Form 8 Tiêu Chí & Luồng 4 Bước</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Khảo sát chi tiết số ngày, quận TP.HCM, ngân sách, phong cách, nhịp độ. AI đưa gợi ý ý tưởng trước khi sinh lịch trình chi tiết. Có tính năng đổi địa điểm với 2-3 gợi ý thay thế.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Đồng Bộ Google Calendar Tự Động</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tính năng đột phá: Tự động chuyển toàn bộ lịch trình từng ngày thành sự kiện trên Google Calendar kèm địa chỉ thật và thông báo báo thức nhắc nhở trước 30 phút.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <CloudRain className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Kịch Bản Dự Phòng Thông Minh</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tự động ứng phó khi trời mưa Sài Gòn (chuyển sang bảo tàng, workshop trong nhà) và né kẹt xe giờ cao điểm (17h-19h) bằng thuật toán gom cụm cùng quận.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
