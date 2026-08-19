/**
 * StatusBadge — badge de estado reutilizable en toda la app.
 */

import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  estado: 'A' | 'I' | 'X' | 'P' | 'C' | 'V' | string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  }
> = {
  A: { label: 'ACTIVO', variant: 'success' },
  I: { label: 'INACTIVO', variant: 'secondary' },
  X: { label: 'ANULADO', variant: 'destructive' },
  P: { label: 'PENDIENTE', variant: 'warning' },
  C: { label: 'CANCELADO', variant: 'secondary' },
  V: { label: 'VENCIDO', variant: 'destructive' },
};

export function StatusBadge({ estado }: StatusBadgeProps) {
  const config = STATUS_CONFIG[estado] ?? { label: estado, variant: 'outline' as const };
  return (
    <Badge variant={config.variant as 'default'} className="text-xs font-medium">
      {config.label}
    </Badge>
  );
}
