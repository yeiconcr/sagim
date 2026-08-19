import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Usuario {
  id: number;
  nombre: string;
  cargo: string;
  nivel: number; // 1=Admin, 2=Operador
}

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (usuario: Usuario) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      login: (usuario) => set({ usuario, isAuthenticated: true }),
      logout: () => set({ usuario: null, isAuthenticated: false }),
    }),
    {
      name: 'sagim-auth',
    }
  )
);
