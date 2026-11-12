import { cn } from './lib/cn.js';

export const DEMO = false;

export function Black({ className, style }) {
  return <div aria-hidden="true" className={cn('rounded-lg bg-black', className)} style={style} />;
}

export function BlackText({ className }) {
  return <span aria-hidden="true" className={cn('inline-block h-3 w-24 rounded-full bg-black align-middle', className)} />;
}
