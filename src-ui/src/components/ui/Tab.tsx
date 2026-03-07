import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode;
  label: string;
  active?: boolean;
}

export const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ className, icon, label, active, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-2 px-4 py-2.5',
          'font-mono text-[13px] font-medium',
          'transition-all duration-200',
          'border-b-2',
          active
            ? 'text-[var(--color-accent)] border-[var(--color-accent)]'
            : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)] hover:border-[var(--color-bg-elevated)]',
          className
        )}
        {...props}
      >
        {icon && (
          <span className={cn(
            'text-sm transition-colors',
            active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
          )}>
            {icon}
          </span>
        )}
        <span>{label}</span>
      </button>
    );
  }
);

TabItem.displayName = 'TabItem';

export interface TabGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabGroup({ className, children, ...props }: TabGroupProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-1',
        'border-b border-[var(--color-bg-elevated)]',
        className
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}
