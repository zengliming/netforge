import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface NavItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  label: string;
  active?: boolean;
}

export const NavItem = forwardRef<HTMLDivElement, NavItemProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ className, label, active, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all w-full',
          'font-mono text-[13px]',
          active
            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] font-medium'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
        )}
        {...props}
      >
        <span className={cn(
          'text-xs w-3',
          active ? 'text-[var(--color-accent)]' : 'text-transparent'
        )}
        >
          {active ? '>' : ' '}
        </span>
        <span>{label}</span>
      </div>
    );
  }
);

NavItem.displayName = 'NavItem';
