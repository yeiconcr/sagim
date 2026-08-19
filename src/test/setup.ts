import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs for testing
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(() => Promise.resolve('/mock/app/data/')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(() => Promise.resolve()),
  writeTextFile: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(() => Promise.resolve(new Uint8Array([]))),
  readTextFile: vi.fn(() => Promise.resolve('')),
  mkdir: vi.fn(() => Promise.resolve()),
  exists: vi.fn(() => Promise.resolve(false)),
  copyFile: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  readDir: vi.fn(() => Promise.resolve([])),
  BaseDirectory: {
    AppData: 'AppData',
  },
}));

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn(() =>
      Promise.resolve({
        select: vi.fn(() => Promise.resolve([])),
        execute: vi.fn(() => Promise.resolve({ rowsAffected: 0 })),
        close: vi.fn(() => Promise.resolve()),
      })
    ),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console errors during tests (optional)
// vi.spyOn(console, 'error').mockImplementation(() => {});
