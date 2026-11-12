import { useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '../../lib/cn.js';

export default function SpotlightCard({
  children,
  className,
  color = 'rgba(37, 99, 235, 0.14)'
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const handleMove = (event) => {
    const element = ref.current;
    if (!element || reduced) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={ref} onMouseMove={handleMove} className={cn('group/spot relative', className)}>
      {children}
      {!reduced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-out-strong group-hover/spot:opacity-100"
          style={{
            background: `radial-gradient(300px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${color}, transparent 65%)`
          }}
        />
      )}
    </div>
  );
}
