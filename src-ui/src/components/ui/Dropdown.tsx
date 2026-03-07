import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

export interface DropdownOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps<T> {
  options: DropdownOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  renderTrigger?: (selected: DropdownOption<T> | undefined, open: boolean) => ReactNode;
}

export function Dropdown<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  renderTrigger,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange(option.value);
            setOpen(false);
          }
        } else {
          setOpen(prev => !prev);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next < options.length ? next : prev;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next >= 0 ? next : prev;
          });
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }, [open, focusedIndex, options, disabled, onChange]);

  const handleSelect = (option: DropdownOption<T>) => {
    if (!option.disabled) {
      onChange(option.value);
      setOpen(false);
    }
  };

  const defaultTrigger = (selected: DropdownOption<T> | undefined, isOpen: boolean) => (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 h-9',
        'font-mono text-sm cursor-pointer',
        'bg-[var(--color-bg-primary)] rounded-md border transition-all',
        isOpen ? 'border-[var(--color-accent)]' : 'border-[var(--color-bg-disabled)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}>
        {selected?.label || placeholder}
      </span>
      <span className="text-[var(--color-text-muted)] text-xs">
        {isOpen ? '▲' : '▼'}
      </span>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative min-w-[200px]', className)}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        className="outline-none"
      >
        {renderTrigger ? renderTrigger(selectedOption, open) : defaultTrigger(selectedOption, open)}
      </div>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-10',
            'bg-[var(--color-bg-primary)] rounded-md border',
            open ? 'border-[var(--color-accent)]' : 'border-[var(--color-bg-disabled)]',
            'shadow-lg max-h-60 overflow-y-auto'
          )}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option)}
              className={cn(
                'flex items-center h-9 px-3 font-mono text-sm cursor-pointer',
                'transition-colors',
                option.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[var(--color-bg-secondary)]',
                option.value === value && 'bg-[rgba(34,197,94,0.1)]',
                index === focusedIndex && 'bg-[var(--color-bg-secondary)]'
              )}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
