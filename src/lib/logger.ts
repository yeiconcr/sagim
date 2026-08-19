/**
 * Sistema de logging centralizado para SAGIM.
 * Los logs se guardan en archivos para facilitar soporte técnico.
 */

import { writeTextFile, mkdir, exists, readTextFile, remove } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_FILE = 'sagim.log';
const ERROR_LOG_FILE = 'sagim-errors.log';
const MAX_LOG_SIZE_MB = 5;
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLogLevel: LogLevel = 'info';
let basePath: string | null = null;
let isInitialized = false;

/**
 * Inicializa el sistema de logging
 */
export async function initLogger(level: LogLevel = 'info'): Promise<void> {
  try {
    currentLogLevel = level;
    const dataDir = await appDataDir();
    basePath = dataDir.endsWith('/') ? dataDir : `${dataDir}/`;

    // Crear directorio de logs si no existe
    const logsDir = `${basePath}logs`;
    const dirExists = await exists(logsDir);
    if (!dirExists) {
      await mkdir(logsDir, { recursive: true });
    }

    isInitialized = true;
    await log('info', 'Logger', 'Sistema de logging inicializado');
  } catch (error) {
    console.error('[Logger] Error inicializando:', error);
  }
}

/**
 * Registra un mensaje de log
 */
export async function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: unknown
): Promise<void> {
  // Siempre mostrar en consola durante desarrollo
  const consoleMethod =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  const prefix = `[${module}]`;
  if (data !== undefined) {
    consoleMethod(prefix, message, data);
  } else {
    consoleMethod(prefix, message);
  }

  // Solo escribir a archivo si el nivel es suficiente
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }

  if (!isInitialized || !basePath) {
    return;
  }

  try {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: data !== undefined ? sanitizeData(data) : undefined,
    };

    const logLine = formatLogEntry(entry);
    const logPath = `${basePath}logs/${LOG_FILE}`;

    // Escribir al archivo principal
    await writeTextFile(logPath, logLine, { append: true });

    // Si es error, también escribir al archivo de errores
    if (level === 'error') {
      const errorLogPath = `${basePath}logs/${ERROR_LOG_FILE}`;
      await writeTextFile(errorLogPath, logLine, { append: true });
    }

    // Verificar tamaño del archivo periódicamente
    await checkLogRotation();
  } catch (error) {
    console.error('[Logger] Error escribiendo log:', error);
  }
}

/**
 * Formatea una entrada de log
 */
function formatLogEntry(entry: LogEntry): string {
  let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;

  if (entry.data !== undefined) {
    try {
      line += ` | Data: ${JSON.stringify(entry.data)}`;
    } catch {
      line += ' | Data: [No serializable]';
    }
  }

  return line + '\n';
}

/**
 * Sanitiza datos para logging (evita objetos circulares, etc.)
 */
function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
  }

  if (typeof data === 'object') {
    try {
      // Intentar serializar para verificar que no hay referencias circulares
      JSON.stringify(data);
      return data;
    } catch {
      return '[Objeto no serializable]';
    }
  }

  return data;
}

/**
 * Verifica y rota los logs si exceden el tamaño máximo
 */
let lastRotationCheck = 0;
async function checkLogRotation(): Promise<void> {
  const now = Date.now();
  // Solo verificar cada 5 minutos
  if (now - lastRotationCheck < 5 * 60 * 1000) {
    return;
  }
  lastRotationCheck = now;

  try {
    if (!basePath) return;

    const logPath = `${basePath}logs/${LOG_FILE}`;
    const fileExists = await exists(logPath);

    if (!fileExists) return;

    const content = await readTextFile(logPath);
    const sizeBytes = new TextEncoder().encode(content).length;
    const sizeMB = sizeBytes / (1024 * 1024);

    if (sizeMB > MAX_LOG_SIZE_MB) {
      // Rotar: renombrar actual a .old y crear nuevo
      const oldLogPath = `${basePath}logs/${LOG_FILE}.old`;

      // Eliminar .old anterior si existe
      const oldExists = await exists(oldLogPath);
      if (oldExists) {
        await remove(oldLogPath);
      }

      // Guardar contenido actual como .old (últimas 1000 líneas)
      const lines = content.split('\n');
      const lastLines = lines.slice(-1000).join('\n');
      await writeTextFile(oldLogPath, lastLines);

      // Limpiar archivo actual
      await writeTextFile(logPath, `[${new Date().toISOString()}] [INFO] [Logger] Log rotado\n`);

      await log('info', 'Logger', `Log rotado. Tamaño anterior: ${sizeMB.toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('[Logger] Error en rotación:', error);
  }
}

/**
 * Helpers para cada nivel de log
 */
export const logger = {
  debug: (module: string, message: string, data?: unknown) => log('debug', module, message, data),
  info: (module: string, message: string, data?: unknown) => log('info', module, message, data),
  warn: (module: string, message: string, data?: unknown) => log('warn', module, message, data),
  error: (module: string, message: string, data?: unknown) => log('error', module, message, data),
};

/**
 * Lee el contenido del log actual
 */
export async function readLogs(lines: number = 100): Promise<string> {
  try {
    if (!basePath) {
      const dataDir = await appDataDir();
      basePath = dataDir.endsWith('/') ? dataDir : `${dataDir}/`;
    }

    const logPath = `${basePath}logs/${LOG_FILE}`;
    const fileExists = await exists(logPath);

    if (!fileExists) {
      return 'No hay logs disponibles.';
    }

    const content = await readTextFile(logPath);
    const allLines = content.split('\n').filter(Boolean);
    const lastLines = allLines.slice(-lines);

    return lastLines.join('\n');
  } catch (error) {
    return `Error leyendo logs: ${error}`;
  }
}

/**
 * Lee los errores recientes
 */
export async function readErrorLogs(lines: number = 50): Promise<string> {
  try {
    if (!basePath) {
      const dataDir = await appDataDir();
      basePath = dataDir.endsWith('/') ? dataDir : `${dataDir}/`;
    }

    const logPath = `${basePath}logs/${ERROR_LOG_FILE}`;
    const fileExists = await exists(logPath);

    if (!fileExists) {
      return 'No hay errores registrados.';
    }

    const content = await readTextFile(logPath);
    const allLines = content.split('\n').filter(Boolean);
    const lastLines = allLines.slice(-lines);

    return lastLines.join('\n');
  } catch (error) {
    return `Error leyendo logs de errores: ${error}`;
  }
}

/**
 * Obtiene la ruta del directorio de logs
 */
export async function getLogsPath(): Promise<string> {
  if (!basePath) {
    const dataDir = await appDataDir();
    basePath = dataDir.endsWith('/') ? dataDir : `${dataDir}/`;
  }
  return `${basePath}logs/`;
}
