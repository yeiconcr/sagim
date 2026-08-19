import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getParametros,
  updateParametros,
  getUsuarios,
  getUsuarioByNombre,
  createUsuario,
  updateUsuario,
  cambiarPassword,
  toggleUsuarioEstado,
} from './configuracion';

// Mock the useDb module
vi.mock('../useDb', () => ({
  dbSelect: vi.fn(),
  dbExecute: vi.fn(),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  },
}));

import { dbSelect, dbExecute } from '../useDb';
import bcrypt from 'bcryptjs';

describe('Parametros queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getParametros', () => {
    it('returns parametros when exists', async () => {
      const mockParams = {
        id: 1,
        nombre_gimnasio: 'Test Gym',
        nit: '123456',
        direccion: 'Calle 123',
        telefono: '555-1234',
      };
      vi.mocked(dbSelect).mockResolvedValueOnce([mockParams]);

      const result = await getParametros();

      expect(result).toEqual(mockParams);
      expect(dbSelect).toHaveBeenCalledWith('SELECT * FROM parametros LIMIT 1');
    });

    it('returns null when no parametros', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([]);

      const result = await getParametros();

      expect(result).toBeNull();
    });
  });

  describe('updateParametros', () => {
    it('updates all specified fields', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await updateParametros({
        nombre_gimnasio: 'New Gym Name',
        nit: '999888777',
        direccion: 'New Address',
        telefono: '999-8888',
        dias_inactivar: 60,
        dias_alerta_vencimiento: 7,
        color_primario: '#ff0000',
      });

      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE parametros SET'),
        expect.arrayContaining(['New Gym Name', '999888777', 'New Address'])
      );
    });
  });
});

describe('Usuarios queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsuarios', () => {
    it('returns list of users without password_hash', async () => {
      const mockUsers = [
        { id: 1, nombre: 'admin', cargo: 'Administrador', nivel: 1, estado: 'A' },
        { id: 2, nombre: 'user1', cargo: 'Recepcionista', nivel: 2, estado: 'A' },
      ];
      vi.mocked(dbSelect).mockResolvedValueOnce(mockUsers);

      const result = await getUsuarios();

      expect(result).toEqual(mockUsers);
      expect(dbSelect).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, nombre, cargo, nivel, estado')
      );
      expect(dbSelect).toHaveBeenCalledWith(expect.not.stringContaining('password_hash'));
    });
  });

  describe('getUsuarioByNombre', () => {
    it('returns user when found and active', async () => {
      const mockUser = {
        id: 1,
        nombre: 'admin',
        password_hash: '$2b$10$hashedpassword',
        cargo: 'Administrador',
        nivel: 1,
        estado: 'A',
      };
      vi.mocked(dbSelect).mockResolvedValueOnce([mockUser]);

      const result = await getUsuarioByNombre('admin');

      expect(result).toEqual(mockUser);
      expect(dbSelect).toHaveBeenCalledWith(
        "SELECT * FROM usuarios WHERE nombre = $1 AND estado = 'A'",
        ['admin']
      );
    });

    it('returns null when user not found', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([]);

      const result = await getUsuarioByNombre('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUsuario', () => {
    it('creates user with hashed password', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 5 });

      const result = await createUsuario('newuser', 'password123', 'Recepcionista', 2);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(dbExecute).toHaveBeenCalledWith(
        'INSERT INTO usuarios (nombre, password_hash, cargo, nivel) VALUES ($1,$2,$3,$4)',
        ['newuser', '$2b$10$hashedpassword', 'Recepcionista', 2]
      );
      expect(result).toBe(5);
    });
  });

  describe('updateUsuario', () => {
    it('updates specified fields', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await updateUsuario(1, { cargo: 'Manager', nivel: 1 });

      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios SET'),
        expect.arrayContaining(['Manager', 1, 1])
      );
    });

    it('does nothing when no fields provided', async () => {
      await updateUsuario(1, {});

      expect(dbExecute).not.toHaveBeenCalled();
    });
  });

  describe('cambiarPassword', () => {
    it('updates password with new hash', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await cambiarPassword(1, 'newpassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(dbExecute).toHaveBeenCalledWith(
        'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
        ['$2b$10$hashedpassword', 1]
      );
    });
  });

  describe('toggleUsuarioEstado', () => {
    it('activates user', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await toggleUsuarioEstado(1, 'A');

      expect(dbExecute).toHaveBeenCalledWith('UPDATE usuarios SET estado = $1 WHERE id = $2', [
        'A',
        1,
      ]);
    });

    it('inactivates user', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await toggleUsuarioEstado(1, 'I');

      expect(dbExecute).toHaveBeenCalledWith('UPDATE usuarios SET estado = $1 WHERE id = $2', [
        'I',
        1,
      ]);
    });
  });
});
