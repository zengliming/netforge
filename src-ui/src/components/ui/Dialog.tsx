import type { ReactNode } from 'react';
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, message, children, actions, className }: DialogProps) {
  // Handle Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'w-[400px] rounded-xl p-6 flex flex-col gap-5',
          'bg-[var(--color-bg-secondary)]',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
      >
        {title && (
          <h2
            id="dialog-title"
            className="font-mono text-lg font-semibold text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
        )}
        {message && (
          <p className="font-mono text-sm text-[var(--color-text-secondary)]">
            {message}
          </p>
        )}
        {children}
        {actions && (
          <div className="flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Convenience components for common dialog patterns
export interface ConfirmDialogProps extends Omit<DialogProps, 'actions'> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  onConfirm,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  ...props
}: ConfirmDialogProps) {
  return (
    <Dialog
      {...props}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>
            {confirmText}
          </Button>
        </>
      }
    />
  );
}
