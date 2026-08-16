import { create } from "zustand";

export type ModuloActivo =
  | "recepcion"
  | "clientes"
  | "catalogos"
  | "inventario"
  | "ventas-gym"
  | "ventas-tienda"
  | "compras"
  | "caja"
  | "cartera"
  | "pagos-instructores"
  | "procesos"
  | "reportes"
  | "configuracion";

interface AppState {
  moduloActivo: ModuloActivo;
  sidebarCollapsed: boolean;
  vencimientosHoy: number;
  clientePrecargado: string | null; // cedula precargada desde recepción

  setModulo: (modulo: ModuloActivo) => void;
  toggleSidebar: () => void;
  setVencimientosHoy: (count: number) => void;
  setClientePrecargado: (cedula: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  moduloActivo: "recepcion",
  sidebarCollapsed: false,
  vencimientosHoy: 0,
  clientePrecargado: null,

  setModulo: (modulo) => set({ moduloActivo: modulo }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setVencimientosHoy: (count) => set({ vencimientosHoy: count }),
  setClientePrecargado: (cedula) => set({ clientePrecargado: cedula }),
}));
