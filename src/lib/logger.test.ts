import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initLogger, log, logger, readLogs, readErrorLogs, getLogsPath } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initLogger', () => {
    it('creates logs directory if not exists', async () => {
      const { exists, mkdir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValueOnce(false);
      vi.mocked(mkdir).mockResolvedValue();

      await initLogger('info');

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('does not create directory if exists', async () => {
      const { exists, mkdir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValueOnce(true);

      await initLogger('info');

      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('writes to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await log('info', 'TestModule', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Test message');
      consoleSpy.mockRestore();
    });

    it('uses console.error for error level', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await log('error', 'TestModule', 'Error message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Error message');
      consoleSpy.mockRestore();
    });

    it('uses console.warn for warn level', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await log('warn', 'TestModule', 'Warning message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Warning message');
      consoleSpy.mockRestore();
    });

    it('includes data in console output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const testData = { foo: 'bar' };

      await log('info', 'TestModule', 'With data', testData);

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'With data', testData);
      consoleSpy.mockRestore();
    });
  });

  describe('logger helpers', () => {
    it('logger.debug calls log with debug level', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await logger.debug('Module', 'Debug message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logger.info calls log with info level', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await logger.info('Module', 'Info message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logger.warn calls log with warn level', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await logger.warn('Module', 'Warn message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logger.error calls log with error level', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await logger.error('Module', 'Error message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('readLogs', () => {
    it('returns message if no logs exist', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValueOnce(false);

      const result = await readLogs();

      expect(result).toBe('No hay logs disponibles.');
    });

    it('returns last N lines of log', async () => {
      const { exists, readTextFile } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValueOnce(true);
      vi.mocked(readTextFile).mockResolvedValueOnce('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n');

      const result = await readLogs(3);

      expect(result).toContain('Line 3');
      expect(result).toContain('Line 4');
      expect(result).toContain('Line 5');
    });
  });

  describe('readErrorLogs', () => {
    it('returns message if no error logs exist', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValueOnce(false);

      const result = await readErrorLogs();

      expect(result).toBe('No hay errores registrados.');
    });
  });

  describe('getLogsPath', () => {
    it('returns logs directory path', async () => {
      const result = await getLogsPath();

      expect(result).toContain('logs');
      expect(result).toMatch(/\/$/); // Ends with /
    });
  });
});
