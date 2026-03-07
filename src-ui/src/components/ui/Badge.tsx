import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'running' | 'stopped' | 'error' | 'connecting' | 'active';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  running: 'bg-[var(--color-badge-running-bg)] text-[var(--color-badge-running-text)]',
  stopped: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]',
  error: 'bg-[var(--color-badge-error-bg)] text-[var(--color-badge-error-text)]',
  connecting: 'bg-[var(--color-badge-connecting-bg)] text-[var(--color-badge-connecting-text)]',
  active: 'bg-[var(--color-badge-running-bg)] text-[var(--color-badge-running-text)]',
};

const dotColors: Record<BadgeVariant, string> = {
  running: 'bg-[var(--color-badge-running-dot)]',
  stopped: 'bg-[var(--color-text-muted)]',
  error: 'bg-[var(--color-danger)]',
  connecting: 'bg-[var(--color-warning)]',
  active: 'bg-[var(--color-badge-running-dot)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'stopped', icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm',
          'font-mono text-xs',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon ? (
          <span className="text-sm">{icon}</span>
        ) : (
          <span className={cn('w-2 h-2 rounded-full', dotColors[variant])} />
        )}
        {children}
      </span>
    );
  }
);
