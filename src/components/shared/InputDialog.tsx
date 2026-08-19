/**
 * InputDialog — Dialog reutilizable con campo de input numérico.
 * Usado para pagos, abonos, y cualquier acción que requiera un valor.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from './FormField';

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  inputLabel: string;
  inputType?: 'number' | 'text';
  inputPlaceholder?: string;
  initialValue?: string;
  min?: number;
  max?: number;
  step?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  loading?: boolean;
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  inputType = 'number',
  inputPlaceholder,
  initialValue = '',
  min,
  max,
  step = 1000,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  loading = false,
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);

  // Reset value when dialog opens with new initialValue
  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  const handleConfirm = () => {
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FormField label={inputLabel} htmlFor="input-dialog-value">
          <Input
            id="input-dialog-value"
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            min={min}
            max={max}
            step={step}
            autoFocus
            className="h-9"
          />
        </FormField>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
