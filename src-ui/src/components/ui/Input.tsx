import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs text-[var(--color-text-muted)] font-mono">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-10 px-3 rounded-md font-mono text-sm',
              'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
              'border transition-all',
              'focus:outline-none',
              // States
              error 
                ? 'border-[var(--color-danger)]' 
                : 'border-[var(--color-bg-disabled)] focus:border-[var(--color-accent)] focus:border-2',
              icon && 'pl-9',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-[var(--color-danger)] font-mono">
            {error}
          </span>
        )}
      </div>
    );
  }
);
