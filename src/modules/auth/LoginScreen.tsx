import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { getDb } from '@/db/database';
import bcrypt from 'bcryptjs';

// Import Tauri APIs
import { getVersion } from '@tauri-apps/api/app';

// Import assets
import loginBg from '@/assets/login-bg.jpg';
import sagimLogo from '@/assets/sagim-logo.png';

const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombreGimnasio, setNombreGimnasio] = useState('SAGIM');
  const [logoPath, setLogoPath] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const { login } = useAuthStore();
  const { error, success } = useToast();

  useEffect(() => {
    async function init() {
      // Load app version dynamically
      try {
        const version = await getVersion();
        if (version) setAppVersion(version);
      } catch {
        // Fallback or browser mode
      }

      // Load gym name
      try {
        const db = await getDb();
        const rows = await db.select<Array<{ nombre_gimnasio: string; logo_path: string | null }>>(
          'SELECT nombre_gimnasio, logo_path FROM parametros LIMIT 1'
        );
        if (rows.length > 0) {
          if (rows[0].nombre_gimnasio) setNombreGimnasio(rows[0].nombre_gimnasio);
          if (rows[0].logo_path) setLogoPath(rows[0].logo_path);
        }
      } catch {
        // Silencioso — la BD puede no estar lista aún
      }
    }
    init();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const db = await getDb();

      const users = await db.select<
        Array<{
          id: number;
          nombre: string;
          password_hash: string;
          cargo: string;
          nivel: number;
        }>
      >(
        "SELECT id, nombre, password_hash, cargo, nivel FROM usuarios WHERE nombre = $1 AND estado = 'A'",
        [data.usuario]
      );

      if (users.length === 0) {
        setIntentosFallidos((n) => n + 1);
        setError('usuario', { message: 'Usuario no encontrado o inactivo' });
        error('Acceso Denegado', 'Usuario no encontrado o inactivo.');
        return;
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(data.password, user.password_hash);

      if (!passwordMatch) {
        setIntentosFallidos((n) => n + 1);
        setError('password', { message: 'Contraseña incorrecta' });
        error('Acceso Denegado', 'Contraseña incorrecta. Vuelva a intentarlo.');
        return;
      }

      // Login exitoso
      success(`Bienvenido, ${user.cargo || 'usuario'}`, user.nombre.toUpperCase());

      setIntentosFallidos(0);
      login({
        id: user.id,
        nombre: user.nombre,
        cargo: user.cargo ?? '',
        nivel: user.nivel as 1 | 2,
      });
    } catch (err) {
      console.error('[Login] Error:', err);
      error(
        'Error del Sistema',
        'No se pudo conectar a la base de datos. Verifique la instalación.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-slate-950">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/60 backdrop-blur-sm" />

      {/* Main Content */}
      <div className="relative z-10 flex w-full">
        {/* Left Panel: App Info (Hidden on small screens) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
          <div className="w-36 h-36 mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/50 border border-white/10 bg-slate-900 p-2">
            <img
              src={logoPath || sagimLogo}
              alt="SAGIM Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-blue-400 mb-4 tracking-tight drop-shadow-2xl">
            SAGIM
          </h1>
          <p className="text-blue-100 text-xl font-medium tracking-wide drop-shadow-md">
            {nombreGimnasio}
          </p>
        </div>

        {/* Right Panel: Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-700 fade-in">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900 p-2">
                <img
                  src={logoPath || sagimLogo}
                  alt="SAGIM Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-4xl font-black text-white">SAGIM</h1>
              <p className="text-blue-200 text-sm font-medium">{nombreGimnasio}</p>
            </div>

            <Card className="border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-black/50 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 pointer-events-none" />

              <CardHeader className="pb-4 pt-8 relative z-10">
                <CardTitle className="text-white text-3xl font-bold text-center">
                  Bienvenido
                </CardTitle>
                <CardDescription className="text-slate-300 text-center font-medium mt-2">
                  Ingresa tus credenciales para acceder al sistema
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 relative z-10 px-8 pb-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Usuario */}
                  <div className="space-y-2">
                    <Label htmlFor="usuario" className="text-slate-200 text-sm font-semibold">
                      Usuario
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="usuario"
                        placeholder="Nombre de usuario"
                        className={cn(
                          'pl-11 h-12 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-xl',
                          'focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all',
                          errors.usuario &&
                            'border-red-400 focus:border-red-400 focus:ring-red-400/50'
                        )}
                        {...register('usuario')}
                        autoFocus
                        autoComplete="off"
                      />
                    </div>
                    {errors.usuario && (
                      <p className="text-red-400 text-xs font-medium flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {errors.usuario.message}
                      </p>
                    )}
                  </div>

                  {/* Contraseña */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200 text-sm font-semibold">
                      Contraseña
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={cn(
                          'pl-11 pr-12 h-12 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 rounded-xl',
                          'focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all',
                          errors.password &&
                            'border-red-400 focus:border-red-400 focus:ring-red-400/50'
                        )}
                        {...register('password')}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs font-medium flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Alerta intentos fallidos */}
                  {intentosFallidos >= 3 && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3.5 text-sm text-red-200 backdrop-blur-md animate-in zoom-in-95">
                      Varios intentos fallidos. Verifique sus credenciales o contacte al
                      administrador.
                    </div>
                  )}

                  {/* Botón submit */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 mt-6 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verificando...
                      </span>
                    ) : (
                      'Ingresar al Sistema'
                    )}
                  </Button>

                  {/* Botón limpiar */}
                  {intentosFallidos > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-slate-300 hover:text-white hover:bg-white/10 text-sm mt-2 rounded-xl"
                      onClick={() => {
                        reset();
                        setIntentosFallidos(0);
                      }}
                    >
                      Limpiar formulario
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <p className="text-slate-400 text-xs text-center mt-6 font-medium backdrop-blur-md bg-slate-950/40 py-2.5 px-4 rounded-full border border-white/10 w-max mx-auto shadow-xl shadow-black/20">
              SAGIM v{appVersion} — © {new Date().getFullYear()} Sistema Administrativo de Gimnasios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para cn
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
