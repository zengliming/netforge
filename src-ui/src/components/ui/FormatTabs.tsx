import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type DataFormat = 'hex' | 'text' | 'json';

export interface FormatTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: DataFormat;
  onChange: (format: DataFormat) => void;
}

const tabs: { key: DataFormat; label: string }[] = [
  { key: 'hex', label: 'Hex' },
  { key: 'text', label: 'Text' },
  { key: 'json', label: 'JSON' },
];

export function FormatTabs({ className, value, onChange, ...props }: FormatTabsProps) {
  return (
    <div className={cn('flex bg-[var(--color-bg-secondary)] rounded-md p-1 gap-1', className)} {...props}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-3 py-1.5 rounded-sm font-mono text-xs cursor-pointer',
            'transition-all',
            value === tab.key
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
