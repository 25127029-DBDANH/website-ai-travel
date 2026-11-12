import {
  Camera,
  Check,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function CheckinModal({ stop, onConfirm, onClose }) {
  const { lang, t } = useI18n();
  const [photoData, setPhotoData] = useState(stop?.checkin_photo || null);
  const [note, setNote] = useState(stop?.checkin_note || '');
  const [saving, setSaving] = useState(false);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    onConfirm({
      photoUrl: photoData,
      note: note.trim()
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-extrabold">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-display text-base font-extrabold text-slate-900">
                {lang === 'vi' ? 'Chụp ảnh Check-in' : 'Photo Check-in'}
              </h4>
              <p className="text-[11px] font-semibold text-slate-500">
                {stop?.place_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Khung chụp / tải ảnh */}
        <div className="mt-4 space-y-4">
          {photoData ? (
            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-slate-100">
              <img
                src={photoData}
                alt="Ảnh check-in"
                className="max-h-60 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoData(null)}
                className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-slate-900"
              >
                {lang === 'vi' ? 'Đổi ảnh khác ✕' : 'Change photo ✕'}
              </button>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                <Check className="h-3 w-3" />
                <span>{lang === 'vi' ? 'Ảnh check-in thực tế' : 'Verified photo'}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Camera className="h-6 w-6" />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-800">
                {lang === 'vi' ? 'Chụp ảnh tại điểm đến để lưu kỷ niệm' : 'Take or upload a photo to check-in'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {lang === 'vi' ? 'Ảnh sẽ tự động đưa vào Thẻ ảnh Kỷ niệm của chuyến đi' : 'Photo will be added to your Trip Story Recap'}
              </p>

              {/* 2 Nút: Chụp camera & Tải thư viện */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                {/* 1. Mở camera chụp trực tiếp */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-98"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{lang === 'vi' ? 'Chụp bằng máy ảnh' : 'Take with Camera'}</span>
                </button>

                {/* 2. Tải ảnh từ thư viện */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-98"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>{lang === 'vi' ? 'Tải ảnh từ máy' : 'Upload from Library'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Ô nhập cảm nghĩ nhanh */}
          <div>
            <label className="label">
              {lang === 'vi' ? 'Cảm nhận của bạn (tùy chọn)' : 'Quick note (optional)'}
            </label>
            <input
              type="text"
              placeholder={lang === 'vi' ? 'VD: Món ăn rất ngon, không gian cổ kính thoáng mát...' : 'e.g. Great coffee, friendly staff...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input text-xs"
              maxLength={200}
            />
          </div>
        </div>

        {/* Nút hoàn tất */}
        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 !py-2.5 text-xs"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 !py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            <span>{lang === 'vi' ? 'Xác nhận Check-in' : 'Confirm Check-in'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
