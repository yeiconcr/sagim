import { create } from "zustand";
import { useCallback } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Hook helper para usar fácilmente
export function useToast() {
  const { addToast } = useToastStore();
  
  const success = useCallback((title: string, description?: string) =>
    addToast({ title, description, variant: "success" }), [addToast]);
    
  const error = useCallback((title: string, description?: string) =>
    addToast({ title, description, variant: "destructive" }), [addToast]);
    
  const info = useCallback((title: string, description?: string) =>
    addToast({ title, description, variant: "default" }), [addToast]);

  return {
    toast: addToast,
    success,
    error,
    info,
  };
}
