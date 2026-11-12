import { getCategoryMeta } from '../lib/categories.jsx';
import { cn } from '../lib/cn.js';

const SIZES = {
  sm: { box: 'h-9 w-9 rounded-xl', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 rounded-2xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' }
};

export default function CategoryTile({ category, size = 'md', className }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  const dimension = SIZES[size] || SIZES.md;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center border',
        dimension.box,
        meta.tile,
        className
      )}
    >
      <Icon className={dimension.icon} strokeWidth={2} />
    </span>
  );
}
