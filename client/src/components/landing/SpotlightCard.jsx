import { cn } from '../../lib/cn.js';

export default function SpotlightCard({ children, className }) {
  return <div className={cn('relative', className)}>{children}</div>;
}
