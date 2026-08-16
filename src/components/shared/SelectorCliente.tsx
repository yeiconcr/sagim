/**
 * SelectorCliente — buscador de cliente reutilizable en formularios de venta.
 * Al encontrar el cliente muestra sus datos y permite confirmar la selección.
 */
import { useState, useRef } from "react";
import { Search, X, UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db/database";
import { cn } from "@/lib/utils";

export interface ClienteSeleccionado {
  cedula: string;
  inscripcion: number;
  nombres: string;
  apellidos: string;
  ciudad: string | null;
  direccion: string | null;
  estado: "A" | "I";
  nombre_completo: string;
}

interface SelectorClienteProps {
  value: ClienteSeleccionado | null;
  onChange: (cliente: ClienteSeleccionado | null) => void;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export function SelectorCliente({ value, onChange, disabled, required, autoFocus }: SelectorClienteProps) {
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const buscar = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setNoEncontrado(false);
    try {
      const db = await getDb();
      const isNum = /^\d+$/.test(busqueda.trim());
      const rows = await db.select<ClienteSeleccionado[]>(
        isNum
          ? `SELECT cedula, inscripcion, nombres, apellidos, ciudad, direccion, estado,
               nombres || ' ' || apellidos as nombre_completo
             FROM clientes WHERE (cedula = $1 OR CAST(inscripcion AS TEXT) = $1) LIMIT 1`
          : `SELECT cedula, inscripcion, nombres, apellidos, ciudad, direccion, estado,
               nombres || ' ' || apellidos as nombre_completo
             FROM clientes WHERE nombres LIKE $1 OR apellidos LIKE $1 ORDER BY nombres LIMIT 1`,
        [isNum ? busqueda.trim() : `%${busqueda.trim()}%`]
      );
      if (rows.length > 0) {
        onChange(rows[0]);
        setBusqueda("");
      } else {
        setNoEncontrado(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscando(false);
    }
  };

  if (value) {
    return (
      <div className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-md border",
        value.estado === "I" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {value.estado === "A"
            ? <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            : <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
          }
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{value.nombre_completo}</p>
            <p className="text-xs text-slate-500 leading-tight">
              {value.cedula} · Insc. #{value.inscripcion}
              {value.ciudad ? ` · ${value.ciudad}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={value.estado === "A" ? "success" : "destructive"} className="text-xs">
            {value.estado === "A" ? "ACTIVO" : "INACTIVO"}
          </Badge>
          {!disabled && (
            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => onChange(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            ref={inputRef}
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setNoEncontrado(false); }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscar())}
            placeholder="Cédula, inscripción o nombre..."
            className={cn("pl-8 h-9", noEncontrado && "border-red-300")}
            disabled={disabled}
            autoFocus={autoFocus}
          />
        </div>
        <Button
          type="button" size="sm" className="h-9"
          onClick={buscar}
          disabled={buscando || !busqueda.trim() || disabled}
        >
          {buscando
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Search className="w-3.5 h-3.5" />
          }
        </Button>
      </div>
      {noEncontrado && (
        <p className="text-xs text-red-500">Cliente no encontrado: {busqueda}</p>
      )}
      {required && !value && (
        <p className="text-xs text-slate-400">Requerido — busque por cédula, inscripción o nombre</p>
      )}
    </div>
  );
}
