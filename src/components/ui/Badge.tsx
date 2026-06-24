import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'purple' | 'orange' | 'danger' | 'emerald';
  children?: React.ReactNode;
}

export function Badge({ className, variant = 'default', children }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-900 text-zinc-300 border-zinc-800',
    success: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50',
    warning: 'bg-zinc-900 text-zinc-500 border-zinc-800 border-dashed',
    purple: 'bg-indigo-950/30 text-indigo-400 border-indigo-900/50',
    orange: 'bg-orange-950/30 text-orange-400 border-orange-900/50',
    danger: 'bg-red-950/30 text-red-400 border-red-900/50',
    emerald: 'bg-emerald-900/20 text-emerald-300 border-emerald-900/40',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
