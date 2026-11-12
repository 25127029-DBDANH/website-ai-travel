import { MapPin } from 'lucide-react';
import { assetUrl } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const photos = Array.isArray(message.photos) ? message.photos.slice(0, 6) : [];

  return (
    <div className={cn('flex w-full items-end gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <span className="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm">
          <MapPin className="h-4 w-4" strokeWidth={2.4} />
        </span>
      )}
      <div
        className={cn(
          'max-w-[86%] whitespace-pre-line break-words rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm animate-fade-up',
          isUser
            ? 'rounded-br-md bg-brand-600 font-medium text-white shadow-glow'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
        )}
      >
        {message.content}
        {photos.length > 0 && (
          <div
            className={cn(
              'mt-2.5 grid grid-cols-3 gap-1.5',
              photos.length === 1 && 'grid-cols-1'
            )}
          >
            {photos.map((photo, index) => (
              <img
                key={`${photo.photo_url}-${index}`}
                src={assetUrl(photo.photo_url)}
                alt={photo.place_name || ''}
                loading="lazy"
                decoding="async"
                className="h-16 w-full rounded-lg object-cover sm:h-20"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
