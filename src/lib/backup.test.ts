import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBackup,
  listBackups,
  startAutoBackup,
  stopAutoBackup,
  getLastBackupInfo,
} from './backup';

// Mocks are defined in src/test/setup.ts

describe('backup system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopAutoBackup();
    vi.useRealTimers();
  });

  describe('createBackup', () => {
    it('creates backup with timestamp filename', async () => {
      const { exists, copyFile, mkdir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(copyFile).mockResolvedValue();

      const result = await createBackup();

      expect(result).toMatch(/^sagim_backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/);
      expect(copyFile).toHaveBeenCalled();
    });

    it('creates backup directory if not exists', async () => {
      const { exists, copyFile, mkdir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists)
        .mockResolvedValueOnce(true) // DB exists
        .mockResolvedValueOnce(false); // Backup dir doesn't exist
      vi.mocked(mkdir).mockResolvedValue();
      vi.mocked(copyFile).mockResolvedValue();

      await createBackup();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('throws error if database not found', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValueOnce(false);

      await expect(createBackup()).rejects.toThrow('Base de datos no encontrada');
    });
  });

  describe('listBackups', () => {
    it('returns empty array if backup dir does not exist', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValueOnce(false);

      const result = await listBackups();

      expect(result).toEqual([]);
    });

    it('returns sorted backups (newest first)', async () => {
      const { exists, readDir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readDir).mockResolvedValueOnce([
        {
          name: 'sagim_backup_2024-03-10T10-00-00.db',
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        },
        {
          name: 'sagim_backup_2024-03-15T10-00-00.db',
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        },
        {
          name: 'sagim_backup_2024-03-12T10-00-00.db',
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        },
        { name: 'other-file.txt', isFile: true, isDirectory: false, isSymlink: false },
      ]);

      const result = await listBackups();

      expect(result).toHaveLength(3);
      expect(result[0].fileName).toBe('sagim_backup_2024-03-15T10-00-00.db');
      expect(result[1].fileName).toBe('sagim_backup_2024-03-12T10-00-00.db');
      expect(result[2].fileName).toBe('sagim_backup_2024-03-10T10-00-00.db');
    });
  });

  describe('startAutoBackup', () => {
    it('creates initial backup', async () => {
      const { exists, copyFile } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(copyFile).mockResolvedValue();

      startAutoBackup(4);

      // Wait for initial backup
      await vi.advanceTimersByTimeAsync(100);

      expect(copyFile).toHaveBeenCalled();
    });

    it('schedules periodic backups', async () => {
      const { exists, copyFile } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(copyFile).mockResolvedValue();

      startAutoBackup(1); // 1 hour interval

      await vi.advanceTimersByTimeAsync(100); // Initial backup
      vi.mocked(copyFile).mockClear();

      // Advance 1 hour
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      expect(copyFile).toHaveBeenCalled();
    });
  });

  describe('getLastBackupInfo', () => {
    it('returns null if no backups', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValueOnce(false);

      const result = await getLastBackupInfo();

      expect(result).toBeNull();
    });

    it('returns most recent backup', async () => {
      const { exists, readDir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readDir).mockResolvedValueOnce([
        {
          name: 'sagim_backup_2024-03-10T10-00-00.db',
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        },
        {
          name: 'sagim_backup_2024-03-15T10-00-00.db',
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        },
      ]);

      const result = await getLastBackupInfo();

      expect(result?.fileName).toBe('sagim_backup_2024-03-15T10-00-00.db');
    });
  });
});
