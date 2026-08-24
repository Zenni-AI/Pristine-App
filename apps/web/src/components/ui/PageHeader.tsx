import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** The title block at the top of every dashboard screen — one consistent hierarchy, everywhere. */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-page-title text-textPrimary">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-textSecondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
