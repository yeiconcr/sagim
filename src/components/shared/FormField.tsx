/**
 * FormField — wrapper para campos de formulario con label + error + descripción.
 * Reduce el boilerplate de React Hook Form en todos los módulos.
 */

import { type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
