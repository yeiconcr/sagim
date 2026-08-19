import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Save, Key, ToggleLeft, ToggleRight } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { useToast } from '@/store/toastStore';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  cambiarPassword,
  toggleUsuarioEstado,
  usuarioNombreExiste,
} from '@/db/queries/configuracion';
import { cn } from '@/lib/utils';

type ModoForm = 'nuevo' | 'editar' | 'password' | null;

interface UsuarioRow {
  id: number;
  nombre: string;
  cargo: string | null;
  nivel: number;
  estado: string;
  fecha_creacion: string;
}

export function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [modo, setModo] = useState<ModoForm>(null);
  const [editando, setEditando] = useState<UsuarioRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [nivel, setNivel] = useState<'1' | '2'>('2');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => setUsuarios((await getUsuarios()) as UsuarioRow[]), []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setNombre('');
    setCargo('');
    setNivel('2');
    setPassword('');
    setPasswordConfirm('');
    setEditando(null);
    setModo('nuevo');
  };
  const abrirEditar = (u: UsuarioRow) => {
    setCargo(u.cargo ?? '');
    setNivel(String(u.nivel) as '1' | '2');
    setEditando(u);
    setModo('editar');
  };
  const abrirPassword = (u: UsuarioRow) => {
    setPassword('');
    setPasswordConfirm('');
    setEditando(u);
    setModo('password');
  };
  const cerrar = () => {
    setModo(null);
    setEditando(null);
  };

  const handleGuardar = async () => {
    if (modo === 'nuevo') {
      if (!nombre.trim()) {
        error('Falta nombre', 'El nombre de usuario es requerido.');
        return;
      }

      // Validar nombre duplicado
      const existe = await usuarioNombreExiste(nombre.trim());
      if (existe) {
        error('Usuario duplicado', 'Ya existe un usuario con este nombre.');
        return;
      }

      if (password.length < 6) {
        error('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== passwordConfirm) {
        error('No coinciden', 'Las contraseñas no coinciden.');
        return;
      }
      setGuardando(true);
      try {
        await createUsuario(nombre.trim(), password, cargo, Number(nivel) as 1 | 2);
        success('Usuario creado', `Usuario '${nombre}' creado exitosamente.`);
        cerrar();
        cargar();
      } catch (err) {
        error('Error', String(err));
      } finally {
        setGuardando(false);
      }
    } else if (modo === 'editar' && editando) {
      setGuardando(true);
      try {
        await updateUsuario(editando.id, {
          cargo: cargo || undefined,
          nivel: Number(nivel) as 1 | 2,
        });
        success('Usuario actualizado');
        cerrar();
        cargar();
      } catch (err) {
        error('Error', String(err));
      } finally {
        setGuardando(false);
      }
    } else if (modo === 'password' && editando) {
      if (password.length < 6) {
        error('Contraseña débil', 'Mínimo 6 caracteres.');
        return;
      }
      if (password !== passwordConfirm) {
        error('No coinciden', 'Las contraseñas no coinciden.');
        return;
      }
      setGuardando(true);
      try {
        await cambiarPassword(editando.id, password);
        success('Contraseña cambiada', `Contraseña de '${editando.nombre}' actualizada.`);
        cerrar();
      } catch (err) {
        error('Error', String(err));
      } finally {
        setGuardando(false);
      }
    }
  };

  const handleToggle = async (u: UsuarioRow) => {
    if (u.nombre === 'admin' && u.estado === 'A') {
      error('Operación no permitida', 'No se puede desactivar el usuario admin.');
      return;
    }
    try {
      await toggleUsuarioEstado(u.id, u.estado === 'A' ? 'I' : 'A');
      success(u.estado === 'A' ? 'Usuario desactivado' : 'Usuario activado');
      cargar();
    } catch (err) {
      error('Error', String(err));
    }
  };

  const columns: ColumnDef<UsuarioRow>[] = [
    {
      accessorKey: 'nombre',
      header: 'Usuario',
      size: 140,
      cell: ({ getValue }) => <span className="text-sm font-mono">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'cargo',
      header: 'Cargo',
      size: 160,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'nivel',
      header: 'Nivel',
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<number>() === 1 ? 'default' : 'secondary'} className="text-xs">
          {getValue<number>() === 1 ? 'Admin' : 'Operador'}
        </Badge>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === 'A' ? 'success' : 'secondary'} className="text-xs">
          {getValue<string>() === 'A' ? 'ACTIVO' : 'INACTIVO'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      size: 160,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={() => abrirEditar(row.original)}
          >
            <Pencil className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] text-slate-600">Editar</span>
          </button>
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={() => abrirPassword(row.original)}
          >
            <Key className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] text-slate-600">Clave</span>
          </button>
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={() => handleToggle(row.original)}
          >
            {row.original.estado === 'A' ? (
              <ToggleRight className="w-4 h-4 text-green-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-[10px] text-slate-600">
              {row.original.estado === 'A' ? 'Inactivar' : 'Activar'}
            </span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-2xl flex-1 min-h-0">
      {modo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              {modo === 'nuevo'
                ? 'Nuevo Usuario'
                : modo === 'editar'
                  ? `Editar: ${editando?.nombre}`
                  : `Cambiar contraseña: ${editando?.nombre}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {modo === 'nuevo' && (
              <FormField label="Nombre de usuario" required htmlFor="u-nom">
                <Input
                  id="u-nom"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: recepcion1"
                  className="h-9 font-mono"
                />
              </FormField>
            )}
            {(modo === 'nuevo' || modo === 'editar') && (
              <>
                <FormField label="Cargo" htmlFor="u-car">
                  <Input
                    id="u-car"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Recepcionista"
                    className="h-9"
                  />
                </FormField>
                <FormField label="Nivel de acceso">
                  <Select value={nivel} onValueChange={(v) => setNivel(v as '1' | '2')}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Administrador (acceso total)</SelectItem>
                      <SelectItem value="2">Operador (sin configuración)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </>
            )}
            {(modo === 'nuevo' || modo === 'password') && (
              <>
                <FormField
                  label={modo === 'nuevo' ? 'Contraseña' : 'Nueva contraseña'}
                  htmlFor="u-pass"
                >
                  <Input
                    id="u-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-9"
                  />
                </FormField>
                <FormField label="Confirmar contraseña" htmlFor="u-pass2">
                  <Input
                    id="u-pass2"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={cn(
                      'h-9',
                      passwordConfirm && password !== passwordConfirm && 'border-red-400'
                    )}
                  />
                </FormField>
              </>
            )}
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cerrar}>
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleGuardar} disabled={guardando}>
                {guardando ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {usuarios.filter((u) => u.estado === 'A').length} usuarios activos
        </p>
        {!modo && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={usuarios}
        showSearch={false}
        emptyMessage="No hay usuarios."
        pageSize={10}
      />
    </div>
  );
}
