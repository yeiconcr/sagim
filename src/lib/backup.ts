/**
 * Sistema de backup automático para la base de datos SQLite.
 * Mantiene copias rotativas para proteger contra corrupción de datos.
 */

import { copyFile, mkdir, exists, readDir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

const MAX_BACKUPS = 7; // Mantener últimos 7 backups
const BACKUP_FOLDER = 'backups';
const DB_NAME = 'sagim.db';

/**
 * Obtiene la ruta base de datos de la app
 */
async function getBasePath(): Promise<string> {
  const dataDir = await appDataDir();
  return dataDir.endsWith('/') ? dataDir : `${dataDir}/`;
}

/**
 * Crea un backup de la base de datos
 * @returns Nombre del archivo de backup creado
 */
export async function createBackup(): Promise<string> {
  try {
    const basePath = await getBasePath();
    const backupDir = `${basePath}${BACKUP_FOLDER}`;
    const dbPath = `${basePath}${DB_NAME}`;

    // Verificar que la BD existe
    const dbExists = await exists(dbPath);
    if (!dbExists) {
      throw new Error('Base de datos no encontrada');
    }

    // Crear directorio de backups si no existe
    const backupDirExists = await exists(backupDir);
    if (!backupDirExists) {
      await mkdir(backupDir, { recursive: true });
    }

    // Generar nombre de backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `sagim_backup_${timestamp}.db`;
    const backupPath = `${backupDir}/${backupName}`;

    // Copiar base de datos
    await copyFile(dbPath, backupPath);

    console.log(`[Backup] Backup creado: ${backupName}`);

    // Limpiar backups antiguos
    await cleanOldBackups(backupDir);

    return backupName;
  } catch (error) {
    console.error('[Backup] Error creando backup:', error);
    throw error;
  }
}

/**
 * Elimina backups antiguos, manteniendo solo los más recientes
 */
async function cleanOldBackups(backupDir: string): Promise<void> {
  try {
    const entries = await readDir(backupDir);

    // Filtrar solo archivos de backup
    const backups = entries
      .filter((e) => e.name?.startsWith('sagim_backup_') && e.name?.endsWith('.db'))
      .map((e) => e.name!)
      .sort()
      .reverse(); // Más reciente primero

    // Eliminar backups excedentes
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const fileName of toDelete) {
        await remove(`${backupDir}/${fileName}`);
        console.log(`[Backup] Backup antiguo eliminado: ${fileName}`);
      }
    }
  } catch (error) {
    console.error('[Backup] Error limpiando backups antiguos:', error);
  }
}

/**
 * Lista todos los backups disponibles
 */
export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const basePath = await getBasePath();
    const backupDir = `${basePath}${BACKUP_FOLDER}`;

    const dirExists = await exists(backupDir);
    if (!dirExists) {
      return [];
    }

    const entries = await readDir(backupDir);

    return entries
      .filter((e) => e.name?.startsWith('sagim_backup_') && e.name?.endsWith('.db'))
      .map((e) => {
        const name = e.name!;
        // Extraer fecha del nombre: sagim_backup_2024-03-15T10-30-00.db
        const dateStr = name
          .replace('sagim_backup_', '')
          .replace('.db', '')
          .replace(/-/g, (m, i) => {
            // Restaurar formato ISO
            if (i === 4 || i === 7) return '-';
            if (i === 10) return 'T';
            if (i === 13 || i === 16) return ':';
            return m;
          });

        return {
          fileName: name,
          createdAt: new Date(dateStr.slice(0, 19).replace('T', ' ')),
          path: `${backupDir}/${name}`,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('[Backup] Error listando backups:', error);
    return [];
  }
}

export interface BackupInfo {
  fileName: string;
  createdAt: Date;
  path: string;
}

/**
 * Restaura un backup específico
 * PRECAUCIÓN: Esto sobrescribe la base de datos actual
 */
export async function restoreBackup(backupFileName: string): Promise<void> {
  try {
    const basePath = await getBasePath();
    const backupDir = `${basePath}${BACKUP_FOLDER}`;
    const backupPath = `${backupDir}/${backupFileName}`;
    const dbPath = `${basePath}${DB_NAME}`;

    // Verificar que el backup existe
    const backupExists = await exists(backupPath);
    if (!backupExists) {
      throw new Error(`Backup no encontrado: ${backupFileName}`);
    }

    // Crear backup de seguridad antes de restaurar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safetyBackup = `${basePath}${DB_NAME}.pre-restore-${timestamp}`;

    const dbExists = await exists(dbPath);
    if (dbExists) {
      await copyFile(dbPath, safetyBackup);
      console.log(`[Backup] Backup de seguridad creado: ${safetyBackup}`);
    }

    // Restaurar backup
    await copyFile(backupPath, dbPath);
    console.log(`[Backup] Base de datos restaurada desde: ${backupFileName}`);
  } catch (error) {
    console.error('[Backup] Error restaurando backup:', error);
    throw error;
  }
}

/**
 * Configura backup automático al iniciar la app
 * y programado cada cierto intervalo
 */
let backupInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoBackup(intervalHours: number = 4): void {
  // Backup inmediato al iniciar
  createBackup().catch((err) => {
    console.error('[Backup] Error en backup inicial:', err);
  });

  // Programar backups periódicos
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  backupInterval = setInterval(() => {
    createBackup().catch((err) => {
      console.error('[Backup] Error en backup programado:', err);
    });
  }, intervalMs);

  console.log(`[Backup] Auto-backup configurado cada ${intervalHours} horas`);
}

export function stopAutoBackup(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('[Backup] Auto-backup detenido');
  }
}

/**
 * Obtiene información del último backup
 */
export async function getLastBackupInfo(): Promise<BackupInfo | null> {
  const backups = await listBackups();
  return backups[0] || null;
}
