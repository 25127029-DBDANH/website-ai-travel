import { Coffee, Landmark, ShoppingBag, Sparkles, Ticket, Trees, Utensils } from 'lucide-react';

export const CATEGORY_META = {
  food: {
    icon: Utensils,
    gradient: 'from-amber-400 via-orange-400 to-rose-400',
    tile: 'border-amber-100 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500'
  },
  sightseeing: {
    icon: Landmark,
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    tile: 'border-blue-100 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500'
  },
  cafe: {
    icon: Coffee,
    gradient: 'from-rose-400 via-pink-400 to-orange-300',
    tile: 'border-rose-100 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500'
  },
  shopping: {
    icon: ShoppingBag,
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500',
    tile: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700',
    dot: 'bg-fuchsia-500'
  },
  nature: {
    icon: Trees,
    gradient: 'from-emerald-500 via-teal-400 to-lime-300',
    tile: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500'
  },
  entertainment: {
    icon: Ticket,
    gradient: 'from-indigo-500 via-purple-500 to-fuchsia-500',
    tile: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500'
  }
};

export const FALLBACK_CATEGORY = {
  icon: Sparkles,
  gradient: 'from-slate-500 via-slate-600 to-slate-800',
  tile: 'border-slate-200 bg-slate-50 text-slate-600',
  dot: 'bg-slate-500'
};

export function getCategoryMeta(category) {
  return CATEGORY_META[category] || FALLBACK_CATEGORY;
}
