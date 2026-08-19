import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-white shadow-sm hover:bg-slate-900/80',
        secondary: 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200/80',
        destructive: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80',
        warning: 'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
