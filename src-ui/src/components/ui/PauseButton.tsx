import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface PauseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  isPaused: boolean;
  onToggle: () => void;
  pausedText?: string;
  playingText?: string;
}

export const PauseButton = forwardRef<HTMLButtonElement, PauseButtonProps>(
  ({ 
    className, 
    isPaused, 
    onToggle, 
    pausedText = 'resume_stream',
    playingText = 'pause_stream',
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md',
          'font-mono text-sm text-white cursor-pointer transition-all',
          isPaused
            ? 'bg-[var(--color-warning)] hover:opacity-90'
            : 'bg-[var(--color-accent)] hover:opacity-90',
          className
        )}
        {...props}
      >
        <span>{isPaused ? '▶' : '⏸'}</span>
        <span>{isPaused ? pausedText : playingText}</span>
      </button>
    );
  }
);

PauseButton.displayName = 'PauseButton';
