import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The one card shape used everywhere: 18px radius, a hairline border, an
 * almost-imperceptible shadow. No nested cards — a Card's children should
 * be text, lists, or a single ListItem stack, never another Card.
 */
export function Card({ title, action, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-section-title text-textPrimary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
