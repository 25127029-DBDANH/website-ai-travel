import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, MapPin, Share2, Star, ArrowLeft, RefreshCw, Compass } from 'lucide-react';
import DayTimeline from '../components/trip/DayTimeline';
import InteractiveMap from '../components/map/InteractiveMap';
import CalendarModal from '../components/trip/CalendarModal';
import RatingModal from '../components/trip/RatingModal';

export default function TripDetailPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState(null);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/${id}`);
      setTrip(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mb-2" />
        <span>Đang tải thông tin chuyến đi...</span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen p-12 text-center text-slate-500 text-sm">
        Không tìm thấy chuyến đi này.
      </div>
    );
  }

  const allActivities = trip.days?.flatMap((d) => d.activities || []) || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <Link
              to="/my-trips"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Chuyến đi của tôi</span>
            </Link>
            <h2 className="text-2xl font-black text-slate-900">{trip.title}</h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Lưu trú: {trip.stay_district}
              </span>
              <span>•</span>
              <span>{trip.num_days} Ngày</span>
              <span>•</span>
              <span>Ngân sách: {trip.budget_total?.toLocaleString()} đ</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sync Calendar */}
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Đồng Bộ Google Calendar</span>
            </button>

            {/* Rate Trip */}
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Đánh Giá AI</span>
            </button>
          </div>
        </div>

        {/* Content Layout: Timeline on Left, Map on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <DayTimeline
              days={trip.days}
              tripId={trip.id}
              onSelectPlaceOnMap={(place) => setSelectedPlaceForMap(place)}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <InteractiveMap
                selectedPlace={selectedPlaceForMap}
                places={allActivities}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <CalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          tripId={trip.id}
          tripTitle={trip.title}
        />

        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          tripId={trip.id}
        />
      </div>
    </div>
  );
}
