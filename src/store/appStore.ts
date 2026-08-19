import { create } from 'zustand';

export type ModuloActivo =
  | 'recepcion'
  | 'clientes'
  | 'catalogos'
  | 'inventario'
  | 'ventas-gym'
  | 'ventas-tienda'
  | 'compras'
  | 'caja'
  | 'cartera'
  | 'pagos-instructores'
  | 'procesos'
  | 'reportes'
  | 'configuracion';

export type ClienteVistaInicial = 'lista' | 'pagos' | 'medidas' | null;

interface AppState {
  moduloActivo: ModuloActivo;
  sidebarCollapsed: boolean;
  vencimientosHoy: number;
  clientePrecargado: string | null; // cedula precargada desde recepción
  clienteVistaInicial: ClienteVistaInicial; // vista a abrir en módulo clientes

  setModulo: (modulo: ModuloActivo) => void;
  toggleSidebar: () => void;
  setVencimientosHoy: (count: number) => void;
  setClientePrecargado: (cedula: string | null) => void;
  setClienteVistaInicial: (vista: ClienteVistaInicial) => void;
  navegarAClientePagos: (cedula: string) => void;
  navegarAClienteMedidas: (cedula: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  moduloActivo: 'recepcion',
  sidebarCollapsed: false,
  vencimientosHoy: 0,
  clientePrecargado: null,
  clienteVistaInicial: null,

  setModulo: (modulo) => set({ moduloActivo: modulo }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setVencimientosHoy: (count) => set({ vencimientosHoy: count }),
  setClientePrecargado: (cedula) => set({ clientePrecargado: cedula }),
  setClienteVistaInicial: (vista) => set({ clienteVistaInicial: vista }),
  navegarAClientePagos: (cedula) =>
    set({
      moduloActivo: 'clientes',
      clientePrecargado: cedula,
      clienteVistaInicial: 'pagos',
    }),
  navegarAClienteMedidas: (cedula) =>
    set({
      moduloActivo: 'clientes',
      clientePrecargado: cedula,
      clienteVistaInicial: 'medidas',
    }),
}));
