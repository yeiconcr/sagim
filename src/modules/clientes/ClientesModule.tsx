/**
 * Módulo Clientes — punto de entrada con enrutamiento interno.
 * Vistas: lista → formulario (crear/editar) → detalle de pagos → medidas
 */

import { useState, useEffect, useCallback } from "react";
import type { Cliente } from "@/db/types";
import { ClientesLista } from "./ClientesLista";
import { ClienteFormulario } from "./ClienteFormulario";
import { ClientePagos } from "./ClientePagos";
import { ClienteMedidas } from "./ClienteMedidas";
import { useAppStore } from "@/store/appStore";
import { getDb } from "@/db/database";

type Vista =
  | { tipo: "lista" }
  | { tipo: "nuevo" }
  | { tipo: "editar"; cliente: Cliente }
  | { tipo: "pagos"; cliente: Cliente }
  | { tipo: "medidas"; cliente: Cliente };

export function ClientesModule() {
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [refetchKey, setRefetchKey] = useState(0);
  const { clientePrecargado, clienteVistaInicial, setClientePrecargado, setClienteVistaInicial } = useAppStore();

  const refetch = () => setRefetchKey((k) => k + 1);
  const irLista = () => setVista({ tipo: "lista" });

  // Manejar navegación desde otros módulos (recepción)
  const cargarClienteYNavegar = useCallback(async (cedula: string, destino: "pagos" | "medidas") => {
    try {
      const db = await getDb();
      const rows = await db.select<Cliente[]>(
        "SELECT * FROM clientes WHERE cedula = $1 LIMIT 1",
        [cedula]
      );
      if (rows.length > 0) {
        const cliente = rows[0];
        if (destino === "pagos") {
          setVista({ tipo: "pagos", cliente });
        } else {
          setVista({ tipo: "medidas", cliente });
        }
      }
    } catch (err) {
      console.error("Error al cargar cliente:", err);
    }
  }, []);

  useEffect(() => {
    if (clientePrecargado && clienteVistaInicial && clienteVistaInicial !== "lista") {
      cargarClienteYNavegar(clientePrecargado, clienteVistaInicial as "pagos" | "medidas");
      // Limpiar después de usar
      setClientePrecargado(null);
      setClienteVistaInicial(null);
    }
  }, [clientePrecargado, clienteVistaInicial, cargarClienteYNavegar, setClientePrecargado, setClienteVistaInicial]);

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
