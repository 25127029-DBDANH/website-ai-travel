import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Compass, Calendar, LogOut, User, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-rose-600 to-indigo-600 bg-clip-text text-transparent">
              HCMC AI Travel
            </span>
            <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-600 rounded">
              TP.HCM
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {isAuthenticated ? (
            <>
              <Link
                to="/planner"
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>Lập kế hoạch AI</span>
              </Link>
              <Link
                to="/my-trips"
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Chuyến đi của tôi</span>
              </Link>
              <Link
                to="/settings"
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Sở thích & Bộ nhớ</span>
              </Link>
            </>
          ) : (
            <div className="text-xs text-slate-500 flex items-center space-x-1 bg-slate-100 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Chế độ Khách (Đăng nhập để tạo lịch trình)</span>
            </div>
          )}
        </nav>

        {/* Right Auth Action */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 pl-2">
                <img
                  src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50"
                />
                <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block max-w-[130px] truncate">
                  {user?.full_name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 rounded-lg shadow-sm shadow-rose-500/20 transition-all hover:scale-[1.02]"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
