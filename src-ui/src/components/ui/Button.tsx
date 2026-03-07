import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded font-medium transition-all',
          'font-mono',
          // Variants using CSS variables
          variant === 'primary' && 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white',
          variant === 'danger' && 'bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-white',
          variant === 'ghost' && 'bg-transparent hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-xs gap-1',
          size === 'md' && 'px-4 py-2 text-sm gap-2',
          size === 'lg' && 'px-6 py-3 text-base gap-2',
          // Disabled
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
