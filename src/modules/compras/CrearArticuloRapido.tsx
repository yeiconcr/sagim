import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/store/toastStore";
import { createArticulo, getSiguienteCodigoArticulo } from "@/db/queries/inventario";
import type { Inventario } from "@/db/types";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (articulo: Inventario) => void;
}

export function CrearArticuloRapido({ open, onClose, onSuccess }: Props) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [ganancia, setGanancia] = useState<number>(30); // 30% default
  const [impuesto, setImpuesto] = useState<number>(0);
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (open) {
      getSiguienteCodigoArticulo().then(setCodigo).catch(console.error);
    } else {
      setCodigo("");
      setNombre("");
      setPrecioCompra(0);
      setGanancia(30);
    }
  }, [open]);

  const handleGuardar = async () => {
    if (!codigo.trim() || !nombre.trim() || precioCompra <= 0) {
      error("Datos incompletos", "El código, nombre y precio de compra son obligatorios y mayores a 0.");
      return;
    }

    setGuardando(true);
    try {
      const nuevoId = await createArticulo({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: "",
        stock: 0,
        unidad_medida: "UND",
        precio_compra: precioCompra,
        ganancia,
        impuesto,
        ubicacion: "",
        id_proveedor: null,
        estado: "A"
      });

      const nuevoArticulo: Inventario = {
        id: nuevoId,
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: "",
        stock: 0,
        unidad_medida: "UND",
        precio_compra: precioCompra,
        ganancia,
        impuesto,
        ubicacion: "",
        id_proveedor: null,
        estado: "A"
      };

      success("Artículo creado", `El artículo ${nombre} se ha guardado en el inventario.`);
      onSuccess(nuevoArticulo);
    } catch (err: any) {
      if (String(err).includes("UNIQUE constraint failed")) {
        error("Código duplicado", "Ya existe un artículo con ese código.");
      } else {
        error("Error al guardar", String(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Artículo</DialogTitle>
          <DialogDescription>
            Crea un nuevo producto en el inventario de forma rápida para añadirlo a esta compra.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <FormField label="Código" required>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: 001" autoFocus />
          </FormField>
          <FormField label="Nombre" required>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Proteína Whey" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Costo" required>
              <Input type="number" min="0" step="100" value={precioCompra || ""} onChange={(e) => setPrecioCompra(Number(e.target.value))} placeholder="$" />
            </FormField>
            <FormField label="Margen %">
              <Input type="number" min="0" step="1" value={ganancia || ""} onChange={(e) => setGanancia(Number(e.target.value))} placeholder="%" />
            </FormField>
          </div>
          <div className="bg-slate-50 p-2 rounded text-sm flex justify-between px-3 border border-slate-100">
            <span className="text-slate-500 font-medium">Precio de Venta (Calculado):</span>
            <span className="font-semibold text-slate-800">${(precioCompra + (precioCompra * (ganancia || 0) / 100)).toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>{guardando ? "Guardando..." : "Crear y Añadir"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
