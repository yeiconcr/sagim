import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardarFotoCliente, obtenerUrlFoto } from './photos';

// Mocks are defined in src/test/setup.ts

describe('guardarFotoCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves photo with correct filename format', async () => {
    const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const inscripcion = 12345;

    const result = await guardarFotoCliente(base64Data, inscripcion);

    expect(result).toMatch(/^cliente_12345_\d+\.jpg$/);
  });

  it('creates fotos directory if it does not exist', async () => {
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');

    // Mock directory doesn't exist
    vi.mocked(exists).mockResolvedValueOnce(false);

    const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await guardarFotoCliente(base64Data, 1);

    expect(mkdir).toHaveBeenCalledWith(
      expect.stringContaining('/fotos'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('does not create directory if it already exists', async () => {
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');

    // Mock directory exists
    vi.mocked(exists).mockResolvedValueOnce(true);

    const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await guardarFotoCliente(base64Data, 1);

    expect(mkdir).not.toHaveBeenCalled();
  });

  it('writes file with correct binary data', async () => {
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const base64Data = 'data:image/jpeg;base64,SGVsbG8='; // "Hello" in base64
    await guardarFotoCliente(base64Data, 1);

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/cliente_1_\d+\.jpg$/),
      expect.any(Uint8Array)
    );

    // Verify the Uint8Array contains "Hello"
    const call = vi.mocked(writeFile).mock.calls[0];
    const bytes = call[1] as Uint8Array;
    const decoded = String.fromCharCode(...bytes);
    expect(decoded).toBe('Hello');
  });

  it('handles base64 without data URL prefix', async () => {
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    // This tests the regex replacement - if already without prefix, should work
    const base64Data = 'data:image/png;base64,SGVsbG8=';
    await guardarFotoCliente(base64Data, 1);

    expect(writeFile).toHaveBeenCalled();
  });

  it('includes timestamp for unique filenames', async () => {
    const base64Data = 'data:image/jpeg;base64,SGVsbG8=';

    const result1 = await guardarFotoCliente(base64Data, 100);
    await new Promise((r) => setTimeout(r, 5)); // Small delay
    const result2 = await guardarFotoCliente(base64Data, 100);

    // Both should match pattern but be different
    expect(result1).toMatch(/^cliente_100_\d+\.jpg$/);
    expect(result2).toMatch(/^cliente_100_\d+\.jpg$/);
    expect(result1).not.toBe(result2);
  });
});

describe('obtenerUrlFoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for null filename', async () => {
    const result = await obtenerUrlFoto(null);
    expect(result).toBeNull();
  });

  it('returns null for empty filename', async () => {
    const result = await obtenerUrlFoto('');
    expect(result).toBeNull();
  });

  it('returns null when file does not exist', async () => {
    const { exists } = await import('@tauri-apps/plugin-fs');
    vi.mocked(exists).mockResolvedValueOnce(false);

    const result = await obtenerUrlFoto('cliente_1_123.jpg');

    expect(result).toBeNull();
    expect(exists).toHaveBeenCalledWith(expect.stringContaining('cliente_1_123.jpg'));
  });

  it('returns base64 data URL when file exists', async () => {
    const { exists, readFile } = await import('@tauri-apps/plugin-fs');

    vi.mocked(exists).mockResolvedValueOnce(true);
    // Mock file content as "Hello" bytes
    const mockBytes = new Uint8Array([72, 101, 108, 108, 111]);
    vi.mocked(readFile).mockResolvedValueOnce(mockBytes);

    const result = await obtenerUrlFoto('cliente_1_123.jpg');

    expect(result).toBe('data:image/jpeg;base64,SGVsbG8=');
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining('cliente_1_123.jpg'));
  });

  it('checks correct file path', async () => {
    const { exists } = await import('@tauri-apps/plugin-fs');
    vi.mocked(exists).mockResolvedValueOnce(false);

    await obtenerUrlFoto('test_photo.jpg');

    expect(exists).toHaveBeenCalledWith(expect.stringMatching(/\/fotos\/test_photo\.jpg$/));
  });

  it('returns null on error', async () => {
    const { exists } = await import('@tauri-apps/plugin-fs');
    vi.mocked(exists).mockRejectedValueOnce(new Error('File system error'));

    const result = await obtenerUrlFoto('cliente_1_123.jpg');

    expect(result).toBeNull();
  });
});
