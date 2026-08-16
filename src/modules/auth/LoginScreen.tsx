import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Dumbbell, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/toastStore";
import { getDb } from "@/db/database";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  usuario: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombreGimnasio, setNombreGimnasio] = useState("SAGIM");
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const { login } = useAuthStore();
  const { error, success } = useToast();

  // Cargar nombre del gimnasio para mostrar en el login
  useEffect(() => {
    async function loadNombre() {
      try {
        const db = await getDb();
        const rows = await db.select<Array<{ nombre_gimnasio: string }>>(
          "SELECT nombre_gimnasio FROM parametros LIMIT 1"
        );
        if (rows.length > 0 && rows[0].nombre_gimnasio) {
          setNombreGimnasio(rows[0].nombre_gimnasio);
        }
      } catch {
        // Silencioso — la BD puede no estar lista aún
      }
    }
    loadNombre();
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

      const users = await db.select<Array<{
        id: number;
        nombre: string;
        password_hash: string;
        cargo: string;
        nivel: number;
      }>>(
        "SELECT id, nombre, password_hash, cargo, nivel FROM usuarios WHERE nombre = $1 AND estado = 'A'",
        [data.usuario]
      );

      if (users.length === 0) {
        setIntentosFallidos((n) => n + 1);
        setError("usuario", { message: "Usuario no encontrado o inactivo" });
        error("Acceso Denegado", "Usuario no encontrado o inactivo.");
        return;
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(data.password, user.password_hash);

      if (!passwordMatch) {
        setIntentosFallidos((n) => n + 1);
        setError("password", { message: "Contraseña incorrecta" });
        error("Acceso Denegado", "Contraseña incorrecta. Vuelva a intentarlo.");
        return;
      }

      // Login exitoso
      success(
        `Bienvenido, ${user.cargo || "usuario"}`,
        user.nombre.toUpperCase()
      );

      setIntentosFallidos(0);
      login({
        id: user.id,
        nombre: user.nombre,
        cargo: user.cargo ?? "",
        nivel: user.nivel as 1 | 2,
      });
    } catch (err) {
      console.error("[Login] Error:", err);
      error("Error del Sistema", "No se pudo conectar a la base de datos. Verifique la instalación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10" />
        <div className="relative text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl">
            <Dumbbell className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">SAGIM</h1>
          <p className="text-blue-200 text-lg font-medium">{nombreGimnasio}</p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            {[
              { label: "Clientes", desc: "Gestión completa de membresías" },
              { label: "Ingresos", desc: "Control de recibos y pagos" },
              { label: "Inventario", desc: "Tienda y productos" },
              { label: "Reportes", desc: "Análisis y estadísticas" },
            ].map((feat) => (
              <div key={feat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-semibold text-sm">{feat.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">SAGIM</h1>
            <p className="text-slate-400 text-sm">{nombreGimnasio}</p>
          </div>

          <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-white text-xl font-bold">Iniciar Sesión</CardTitle>
              <CardDescription className="text-slate-400">
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Usuario */}
                <div className="space-y-1.5">
                  <Label htmlFor="usuario" className="text-slate-300 text-sm font-medium">
                    Usuario
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="usuario"
                      placeholder="Nombre de usuario"
                      className={cn(
                        "pl-9 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500",
                        "focus:border-blue-500 focus:ring-blue-500/20",
                        errors.usuario && "border-red-500"
                      )}
                      {...register("usuario")}
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                  {errors.usuario && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {errors.usuario.message}
                    </p>
                  )}
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className={cn(
                        "pl-9 pr-10 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500",
                        "focus:border-blue-500 focus:ring-blue-500/20",
                        errors.password && "border-red-500"
                      )}
                      {...register("password")}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Alerta intentos fallidos */}
                {intentosFallidos >= 3 && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-xs text-red-300">
                    Varios intentos fallidos. Verifique sus credenciales o contacte al administrador.
                  </div>
                )}

                {/* Botón submit */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 mt-2 transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando...
                    </span>
                  ) : (
                    "Ingresar al Sistema"
                  )}
                </Button>

                {/* Botón limpiar */}
                {intentosFallidos > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-slate-200 text-xs"
                    onClick={() => { reset(); setIntentosFallidos(0); }}
                  >
                    Limpiar formulario
                  </Button>
                )}
              </form>

              {/* Credenciales por defecto */}
              <div className="mt-5 pt-4 border-t border-slate-700/50">
                <p className="text-slate-500 text-xs text-center">
                  Credenciales por defecto:{" "}
                  <span className="text-slate-400 font-mono bg-slate-700/50 px-1 rounded">admin</span>
                  {" / "}
                  <span className="text-slate-400 font-mono bg-slate-700/50 px-1 rounded">sagim123</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-slate-600 text-xs text-center mt-4">
            SAGIM v1.0.0 — © {new Date().getFullYear()} Sistema Administrativo de Gimnasios
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper para cn (importado desde @/lib/utils pero necesario inline aquí)
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
