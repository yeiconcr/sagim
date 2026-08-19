import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getClientes,
  getClienteByCedula,
  getClienteByInscripcion,
  createCliente,
  updateCliente,
  inactivarCliente,
  activarCliente,
  countClientesActivos,
  getMedidasByInscripcion,
  createMedida,
  getPagosByInscripcion,
} from './clientes';

// Mock the useDb module
vi.mock('../useDb', () => ({
  dbSelect: vi.fn(),
  dbExecute: vi.fn(),
  dbTransaction: vi.fn(),
  getNextConsecutivo: vi.fn(),
}));

import { dbSelect, dbExecute, getNextConsecutivo } from '../useDb';

describe('Clientes queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientes', () => {
    it('returns paginated clients with defaults', async () => {
      vi.mocked(dbSelect)
        .mockResolvedValueOnce([{ c: 100 }]) // count query
        .mockResolvedValueOnce([
          { id: 1, inscripcion: 1, cedula: '123', nombres: 'Juan', apellidos: 'Perez' },
          { id: 2, inscripcion: 2, cedula: '456', nombres: 'Maria', apellidos: 'Lopez' },
        ]);

      const result = await getClientes();

      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.totalPages).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].nombre_completo).toBe('Juan Perez');
    });

    it('filters by search term', async () => {
      vi.mocked(dbSelect)
        .mockResolvedValueOnce([{ c: 1 }])
        .mockResolvedValueOnce([{ id: 1, cedula: '123456', nombres: 'Test', apellidos: 'User' }]);

      await getClientes({ search: 'test' });

      expect(dbSelect).toHaveBeenCalledWith(
        expect.stringContaining('cedula LIKE'),
        expect.arrayContaining(['%test%', '%test%', '%test%'])
      );
    });

    it('filters by estado', async () => {
      vi.mocked(dbSelect)
        .mockResolvedValueOnce([{ c: 50 }])
        .mockResolvedValueOnce([]);

      await getClientes({ estado: 'A' });

      expect(dbSelect).toHaveBeenCalledWith(
        expect.stringContaining('estado ='),
        expect.arrayContaining(['A'])
      );
    });

    it('handles pagination correctly', async () => {
      vi.mocked(dbSelect)
        .mockResolvedValueOnce([{ c: 150 }])
        .mockResolvedValueOnce([]);

      const result = await getClientes({ page: 3, pageSize: 25 });

      expect(result.totalPages).toBe(6);
      // offset should be (3-1)*25 = 50
      expect(dbSelect).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([25, 50])
      );
    });

    it('sanitizes orderBy to prevent SQL injection', async () => {
      vi.mocked(dbSelect)
        .mockResolvedValueOnce([{ c: 0 }])
        .mockResolvedValueOnce([]);

      await getClientes({ orderBy: 'DROP TABLE clientes; --' });

      // Should default to 'nombres' for invalid orderBy
      expect(dbSelect).toHaveBeenLastCalledWith(
        expect.stringContaining('ORDER BY nombres'),
        expect.any(Array)
      );
    });
  });

  describe('getClienteByCedula', () => {
    it('returns client when found', async () => {
      const mockClient = { id: 1, cedula: '123456', nombres: 'Test', apellidos: 'User' };
      vi.mocked(dbSelect).mockResolvedValueOnce([mockClient]);

      const result = await getClienteByCedula('123456');

      expect(result).toEqual(mockClient);
      expect(dbSelect).toHaveBeenCalledWith('SELECT * FROM clientes WHERE cedula = $1', ['123456']);
    });

    it('returns null when not found', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([]);

      const result = await getClienteByCedula('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getClienteByInscripcion', () => {
    it('returns client when found', async () => {
      const mockClient = { id: 1, inscripcion: 1234, cedula: '123', nombres: 'Test' };
      vi.mocked(dbSelect).mockResolvedValueOnce([mockClient]);

      const result = await getClienteByInscripcion(1234);

      expect(result).toEqual(mockClient);
      expect(dbSelect).toHaveBeenCalledWith(
        'SELECT * FROM clientes WHERE inscripcion = $1',
        [1234]
      );
    });

    it('returns null when not found', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([]);

      const result = await getClienteByInscripcion(9999);

      expect(result).toBeNull();
    });
  });

  describe('createCliente', () => {
    it('inserts client and returns lastInsertId', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 42 });

      const result = await createCliente({
        inscripcion: 100,
        cedula: '123456789',
        nombres: 'Juan',
        apellidos: 'Garcia',
        direccion: 'Calle 123',
        telefono: '555-1234',
        celular: '300-1234567',
        email: 'juan@email.com',
        ciudad: 'PALMIRA',
        sexo: '1',
        fecha_inscripcion: '2024-01-15',
        fecha_nacimiento: '1990-05-20',
        estado: 'A',
        foto_path: null,
      });

      expect(result).toBe(42);
      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clientes'),
        expect.arrayContaining([100, '123456789', 'Juan', 'Garcia'])
      );
    });
  });

  describe('updateCliente', () => {
    it('updates specified fields', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await updateCliente('123456', {
        nombres: 'NuevoNombre',
        telefono: '555-9999',
      });

      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE clientes SET'),
        expect.arrayContaining(['NuevoNombre', '555-9999', '123456'])
      );
    });

    it('does nothing when no fields provided', async () => {
      await updateCliente('123456', {});

      expect(dbExecute).not.toHaveBeenCalled();
    });

    it('ignores computed fields', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await updateCliente('123456', {
        nombres: 'Test',
        nombre_completo: 'Should be ignored',
        edad: 30,
        proximo_vencimiento: '2024-12-31',
        actividad_vigente: 'Gym',
      } as any);

      // Should only update nombres, not the computed fields
      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringMatching(/SET nombres/),
        expect.arrayContaining(['Test', '123456'])
      );
    });
  });

  describe('inactivarCliente', () => {
    it('sets estado to I', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await inactivarCliente('123456');

      expect(dbExecute).toHaveBeenCalledWith("UPDATE clientes SET estado = 'I' WHERE cedula = $1", [
        '123456',
      ]);
    });
  });

  describe('activarCliente', () => {
    it('sets estado to A', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 0 });

      await activarCliente('123456');

      expect(dbExecute).toHaveBeenCalledWith("UPDATE clientes SET estado = 'A' WHERE cedula = $1", [
        '123456',
      ]);
    });
  });

  describe('countClientesActivos', () => {
    it('returns count of active clients', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([{ c: 75 }]);

      const result = await countClientesActivos();

      expect(result).toBe(75);
      expect(dbSelect).toHaveBeenCalledWith(
        "SELECT COUNT(*) as c FROM clientes WHERE estado = 'A'"
      );
    });

    it('returns 0 when no results', async () => {
      vi.mocked(dbSelect).mockResolvedValueOnce([]);

      const result = await countClientesActivos();

      expect(result).toBe(0);
    });
  });
});

describe('Medidas queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMedidasByInscripcion', () => {
    it('returns medidas ordered by fecha', async () => {
      const mockMedidas = [
        { id: 1, inscripcion: 100, fecha: '2024-01-01', peso: 70 },
        { id: 2, inscripcion: 100, fecha: '2024-02-01', peso: 69 },
      ];
      vi.mocked(dbSelect).mockResolvedValueOnce(mockMedidas);

      const result = await getMedidasByInscripcion(100);

      expect(result).toEqual(mockMedidas);
      expect(dbSelect).toHaveBeenCalledWith(
        'SELECT * FROM medidas WHERE inscripcion = $1 ORDER BY fecha ASC',
        [100]
      );
    });
  });

  describe('createMedida', () => {
    it('inserts medida with all fields', async () => {
      vi.mocked(dbExecute).mockResolvedValueOnce({ rowsAffected: 1, lastInsertId: 5 });

      const result = await createMedida({
        inscripcion: 100,
        fecha: '2024-03-15',
        peso: 72.5,
        talla: 175,
        cintura: 80,
        brazos: 35,
        muslos: 55,
        pantorrilla: 38,
        torax: 100,
        cadera: 95,
        estatura: 175,
      });

      expect(result).toBe(5);
      expect(dbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medidas'),
        expect.arrayContaining([100, '2024-03-15', 72.5, 175])
      );
    });
  });
});

describe('PagosCli queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPagosByInscripcion', () => {
    it('returns pagos with actividad info', async () => {
      const mockPagos = [
        {
          id: 1,
          inscripcion: 100,
          fecha_pag: '2024-03-01',
          nombre_actividad: 'Mensualidad',
          factor: 30,
        },
      ];
      vi.mocked(dbSelect).mockResolvedValueOnce(mockPagos);

      const result = await getPagosByInscripcion(100);

      expect(result).toEqual(mockPagos);
      expect(dbSelect).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN actividades'),
        [100]
      );
    });
  });
});
