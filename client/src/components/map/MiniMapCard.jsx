import { useState } from 'react';
import { MapPinIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

/**
 * MiniMapCard.jsx — Compact map card rendered inside AI chat bubbles.
 * Author : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
 *
 * Displays a static map thumbnail, place name, address, opening hours
 * and a "Phóng to bản đồ" button that triggers full-map fly-to.
 *
 * Props:
 *  place       {object}  — place_card object from AI chat response
 *    .name         {string}
 *    .name_vi      {string}
 *    .address      {string}
 *    .latitude     {number}
 *    .longitude    {number}
 *    .photo_url    {string|null}
 *    .open_time    {string|null}   — "HH:MM"
 *    .close_time   {string|null}
 *    .category     {string}
 *    .average_rating {number|null}
 *  onExpandMap {fn}      — callback(place) to fly the main map to this place
 */

const CATEGORY_LABELS = {
  attraction:    '🏛️ Điểm tham quan',
  food:          '🍜 Ẩm thực',
  culture:       '🏯 Văn hóa',
  shopping:      '🛍️ Mua sắm',
  park:          '🌿 Công viên',
  entertainment: '🎡 Giải trí',
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * Generates a Mapbox Static Image URL for the thumbnail.
 */
function staticMapUrl(lat, lng, zoom = 14, width = 320, height = 140) {
  if (!MAPBOX_TOKEN) return null;
  const marker = `pin-s+ef4444(${lng},${lat})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/`
    + `${marker}/${lng},${lat},${zoom}/${width}x${height}@2x`
    + `?access_token=${MAPBOX_TOKEN}`
  );
}

export default function MiniMapCard({ place, onExpandMap }) {
  const [imgError, setImgError] = useState(false);

  if (!place) return null;

  const {
    name,
    name_vi,
    address,
    latitude,
    longitude,
    photo_url,
    open_time,
    close_time,
    category,
    average_rating,
  } = place;

  const thumbnailSrc = !imgError && photo_url
    ? photo_url
    : staticMapUrl(latitude, longitude);

  const displayName = name_vi || name;
  const categoryLabel = CATEGORY_LABELS[category] || category;

  const openingHours =
    open_time && close_time
      ? `${open_time.slice(0, 5)} – ${close_time.slice(0, 5)}`
      : null;

  return (
    <div className="my-2 rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white w-72 max-w-full transition-shadow hover:shadow-lg">
      {/* Thumbnail — static map or place photo */}
      {thumbnailSrc ? (
        <div className="relative h-28 bg-gray-100">
          <img
            src={thumbnailSrc}
            alt={`Bản đồ ${displayName}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* Category badge */}
          <span className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full shadow">
            {categoryLabel}
          </span>
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
          <MapPinIcon className="w-10 h-10 text-blue-400" />
        </div>
      )}

      {/* Info section */}
      <div className="p-3 space-y-1.5">
        {/* Name */}
        <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
          {displayName}
        </p>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MapPinIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}

        {/* Opening hours */}
        {openingHours && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{openingHours}</span>
          </div>
        )}

        {/* Rating */}
        {average_rating && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-yellow-500">★</span>
            <span className="font-medium text-gray-700">{Number(average_rating).toFixed(1)}</span>
          </div>
        )}

        {/* Expand to full map button */}
        <button
          onClick={() => onExpandMap && onExpandMap(place)}
          className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs font-medium
                     bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl py-1.5 transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          Phóng to bản đồ
        </button>
      </div>
    </div>
  );
}
