import { useState, useCallback } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onToggle'> {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  onToggle?: (expanded: boolean) => void;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, title, icon, defaultExpanded = true, children, onToggle, ...props }, ref) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
      setExpanded(prev => {
        const newValue = !prev;
        onToggle?.(newValue);
        return newValue;
      });
    }, [onToggle]);

    return (
      <div
        ref={ref}
        className={cn(
          'bg-[var(--color-bg-secondary)] rounded-md overflow-hidden',
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          className={cn(
            'w-full h-12 px-3 flex items-center justify-between',
            'cursor-pointer transition-colors',
            'hover:bg-[var(--color-bg-tertiary)]',
            'font-mono text-sm text-[var(--color-text-primary)]'
          )}
        >
          <span className="flex items-center gap-2">
            {icon && <span className="text-[var(--color-text-muted)]">{icon}</span>}
            {title}
          </span>
          <span className="text-[var(--color-text-muted)] text-xs">
            {expanded ? '▼' : '▶'}
          </span>
        </button>
        <div
          className={cn(
            'transition-all duration-[var(--transition-slow)] overflow-hidden',
            expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="p-3">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';
