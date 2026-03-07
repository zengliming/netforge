import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type MessageDirectionType = 'in' | 'out' | 'resend';

export interface MessageDirectionProps extends HTMLAttributes<HTMLSpanElement> {
  direction: MessageDirectionType;
}

const directionStyles: Record<MessageDirectionType, { bg: string; icon: string; textClass: string }> = {
  in: { bg: 'bg-[var(--color-badge-running-bg)]', textClass: 'text-[var(--color-accent)]', icon: '←' },
  out: { bg: 'bg-[var(--color-bg-tertiary)]', textClass: 'text-[var(--color-text-primary)]', icon: '→' },
  resend: { bg: 'bg-[var(--color-bg-tertiary)]', textClass: 'text-[var(--color-warning)]', icon: '↻' },
};

export function MessageDirection({ className, direction, ...props }: MessageDirectionProps) {
  const style = directionStyles[direction];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm',
        'font-mono text-xs',
        style.bg,
        style.textClass,
        className
      )}
      {...props}
    >
      <span>{style.icon}</span>
      <span className="uppercase">{direction}</span>
    </span>
  );
}
