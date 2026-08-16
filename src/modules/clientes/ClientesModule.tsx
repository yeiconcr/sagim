/**
 * Módulo Clientes — punto de entrada con enrutamiento interno.
 * Vistas: lista → formulario (crear/editar) → detalle de pagos → medidas
 */

import { useState } from "react";
import type { Cliente } from "@/db/types";
import { ClientesLista } from "./ClientesLista";
import { ClienteFormulario } from "./ClienteFormulario";
import { ClientePagos } from "./ClientePagos";
import { ClienteMedidas } from "./ClienteMedidas";

type Vista =
  | { tipo: "lista" }
  | { tipo: "nuevo" }
  | { tipo: "editar"; cliente: Cliente }
  | { tipo: "pagos"; cliente: Cliente }
  | { tipo: "medidas"; cliente: Cliente };

export function ClientesModule() {
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = () => setRefetchKey((k) => k + 1);
  const irLista = () => setVista({ tipo: "lista" });

  switch (vista.tipo) {
    case "lista":
      return (
        <ClientesLista
          refetchKey={refetchKey}
          onNuevo={() => setVista({ tipo: "nuevo" })}
          onEditar={(c) => setVista({ tipo: "editar", cliente: c })}
          onVerPagos={(c) => setVista({ tipo: "pagos", cliente: c })}
          onVerMedidas={(c) => setVista({ tipo: "medidas", cliente: c })}
        />
      );
    case "nuevo":
      return (
        <ClienteFormulario
          modo="nuevo"
          onGuardar={() => { refetch(); irLista(); }}
          onCancelar={irLista}
        />
      );
    case "editar":
      return (
        <ClienteFormulario
          modo="editar"
          cliente={vista.cliente}
          onGuardar={() => { refetch(); irLista(); }}
          onCancelar={irLista}
        />
      );
    case "pagos":
      return (
        <ClientePagos
          cliente={vista.cliente}
          onVolver={irLista}
        />
      );
    case "medidas":
      return (
        <ClienteMedidas
          cliente={vista.cliente}
          onVolver={irLista}
        />
      );
  }
}
