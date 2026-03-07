import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface FilterInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  hasValue?: boolean;
}

export const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(
  ({ className, value, hasValue, ...props }, ref) => {
    const inputHasValue = hasValue !== undefined ? hasValue : Boolean(value);
    
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md',
          'bg-[var(--color-bg-primary)] border transition-all',
          inputHasValue
            ? 'border-[var(--color-accent)]'
            : 'border-[var(--color-bg-disabled)]',
          className
        )}
      >
        <span className="text-[var(--color-text-muted)] shrink-0">
          ⌕
        </span>
        <input
          ref={ref}
          value={value}
          className={cn(
            'flex-1 bg-transparent outline-none',
            'font-mono text-sm text-[var(--color-text-primary)]',
            'placeholder:text-[var(--color-text-muted)]'
          )}
          {...props}
        />
      </div>
    );
  }
);

FilterInput.displayName = 'FilterInput';
