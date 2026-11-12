import { motion, useReducedMotion, useSpring } from 'motion/react';
import { useRef } from 'react';

export default function MagneticButton({ children, strength = 0.22, className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 20 });
  const y = useSpring(0, { stiffness: 260, damping: 20 });

  const handleMove = (event) => {
    const element = ref.current;
    if (!element || reduced) return;
    const rect = element.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={reduced ? undefined : { x, y }}
      className={className || 'inline-block'}
    >
      {children}
    </motion.div>
  );
}
