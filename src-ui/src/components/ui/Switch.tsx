import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, disabled, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-disabled)]',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

// Label wrapper
interface SwitchWithLabelProps extends SwitchProps {
  label: string;
  labelPosition?: 'left' | 'right';
}

export function SwitchWithLabel({ label, labelPosition = 'right', ...props }: SwitchWithLabelProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer font-mono text-sm">
      {labelPosition === 'left' && <span className={props.checked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>{label}</span>}
      <Switch {...props} />
      {labelPosition === 'right' && <span className={props.checked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>{label}</span>}
    </label>
  );
}
