/**
 * Store de preferencias visuales: modo oscuro y zoom.
 * Persistido en localStorage — son preferencias del dispositivo, no del negocio.
 */
import { create } from 'zustand';

const STORAGE_KEY_DARK = 'sagim:darkMode';
const STORAGE_KEY_ZOOM = 'sagim:zoom';

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 1.4;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1.0;

interface ThemeState {
  darkMode: boolean;
  zoom: number;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  setZoom: (val: number) => void;
}

function loadDarkMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DARK) === 'true';
  } catch {
    return false;
  }
}

function loadZoom(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZOOM);
    if (!raw) return ZOOM_DEFAULT;
    const n = parseFloat(raw);
    return isNaN(n) ? ZOOM_DEFAULT : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
  } catch {
    return ZOOM_DEFAULT;
  }
}

function applyDark(val: boolean) {
  document.documentElement.classList.toggle('dark', val);
}

function applyZoom(val: number) {
  const root = document.getElementById('root');
  if (!root) return;
  if (val === 1) {
    root.style.transform = '';
    root.style.width = '';
    root.style.height = '';
    root.style.transformOrigin = '';
  } else {
    // Escalar el contenido y compensar el espacio sobrante
    // para que llene exactamente el viewport sin dejar áreas vacías
    root.style.transformOrigin = 'top left';
    root.style.transform = `scale(${val})`;
    root.style.width = `${(1 / val) * 100}%`;
    root.style.height = `${(1 / val) * 100}vh`;
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  darkMode: loadDarkMode(),
  zoom: loadZoom(),

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    localStorage.setItem(STORAGE_KEY_DARK, String(next));
    applyDark(next);
  },

  setDarkMode: (val: boolean) => {
    set({ darkMode: val });
    localStorage.setItem(STORAGE_KEY_DARK, String(val));
    applyDark(val);
  },

  setZoom: (val: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, val));
    const rounded = Math.round(clamped * 10) / 10;
    set({ zoom: rounded });
    localStorage.setItem(STORAGE_KEY_ZOOM, String(rounded));
    applyZoom(rounded);
  },
}));
