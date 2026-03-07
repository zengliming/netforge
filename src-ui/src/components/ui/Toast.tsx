import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type?: ToastType;
  message: string;
  onClose?: () => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-[var(--color-toast-success-bg)]', border: 'border-[var(--color-accent)]', icon: '✓' },
  error: { bg: 'bg-[var(--color-toast-error-bg)]', border: 'border-[var(--color-danger)]', icon: '✕' },
  warning: { bg: 'bg-[var(--color-toast-warning-bg)]', border: 'border-[var(--color-warning)]', icon: '⚠' },
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ className, type = 'success', message, onClose, ...props }, ref) => {
    const styles = toastStyles[type];
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-md border',
          'font-mono text-sm w-[400px]',
          styles.bg,
          styles.border,
          className
        )}
        {...props}
      >
        <span className="text-base">{styles.icon}</span>
        <span className="flex-1 text-[var(--color-text-primary)]">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

export interface ToastContainerProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastContainer({ children, position = 'bottom-right' }: ToastContainerProps) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };
  
  return (
    <div className={cn('fixed z-50 flex flex-col gap-2', positionStyles[position])}>
      {children}
    </div>
  );
}
