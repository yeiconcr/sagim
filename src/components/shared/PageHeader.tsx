/**
 * PageHeader — encabezado consistente para todos los módulos.
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 pb-6 border-b border-slate-200 mb-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {description && (
        <p className={cn('text-slate-500 text-sm', Icon ? 'ml-[52px]' : '')}>{description}</p>
      )}
    </div>
  );
}
