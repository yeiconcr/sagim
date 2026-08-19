import { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string | null | undefined;
  onChange: (date: string | null) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  minYear = 1940,
  maxYear = new Date().getFullYear(),
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Parsear fecha actual o usar fecha de hoy para navegación
  const parsedDate = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    return null;
  }, [value]);

  // Estado para navegación del calendario
  const [viewYear, setViewYear] = useState(parsedDate?.year ?? 1990);
  const [viewMonth, setViewMonth] = useState(parsedDate?.month ?? 0);

  // Generar años para el selector
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  // Generar días del mes
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleSelectDay = (day: number) => {
    const month = (viewMonth + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    onChange(`${viewYear}-${month}-${dayStr}`);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  // Formatear fecha para mostrar
  const displayValue = useMemo(() => {
    if (!parsedDate) return null;
    return `${parsedDate.day} de ${MESES[parsedDate.month]} de ${parsedDate.year}`;
  }, [parsedDate]);

  // Sincronizar vista cuando cambia el valor
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && parsedDate) {
      setViewYear(parsedDate.year);
      setViewMonth(parsedDate.month);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {displayValue ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Header con navegación */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              <Select value={viewMonth.toString()} onValueChange={(v) => setViewMonth(parseInt(v))}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewYear.toString()} onValueChange={(v) => setViewYear(parseInt(v))}>
                <SelectTrigger className="h-8 w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="h-8 w-8 flex items-center justify-center text-xs font-medium text-slate-500"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <div key={i} className="h-8 w-8">
                {day !== null && (
                  <button
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      'hover:bg-primary hover:text-primary-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                      parsedDate?.day === day &&
                        parsedDate?.month === viewMonth &&
                        parsedDate?.year === viewYear
                        ? 'bg-primary text-primary-foreground'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Botón limpiar */}
          {value && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-500"
                onClick={handleClear}
              >
                Limpiar fecha
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
