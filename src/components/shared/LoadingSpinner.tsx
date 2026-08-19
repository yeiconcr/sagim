import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }[size];

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <span
        className={cn('rounded-full border-current/20 border-t-current animate-spin', sizeClass)}
      />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function PageLoading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
