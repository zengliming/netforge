import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ConnectionCardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  children: ReactNode;
}

export const ConnectionCard = forwardRef<HTMLDivElement, ConnectionCardProps>(
  ({ className, selected, children, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all',
          'bg-[var(--color-bg-secondary)]',
          'hover:bg-[var(--color-bg-tertiary)]',
          selected && 'bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-accent)]',
          !selected && 'border-2 border-transparent',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ConnectionCard.displayName = 'ConnectionCard';
