import { useEffect, useState, Suspense, lazy, memo, useCallback } from "react";
import { 
  Menu, X, LogOut, ChevronLeft, ChevronRight, Monitor,
  Users, Layers, Package, Dumbbell, Store, ShoppingCart, 
  Wallet, CreditCard, HandCoins, RefreshCw, PieChart, 
  Settings, Key, Image as ImageIcon, Bell 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getParametros } from "@/db/queries/configuracion";

// Logo real
import sagimLogo from "@/assets/sagim-logo.png";
import { useAuthStore } from "@/store/authStore";
import { useAppStore, type ModuloActivo } from "@/store/appStore";
import { getDb } from "@/db/database";
import { today, addDays, toISODate } from "@/lib/utils";
import { getVersion } from "@tauri-apps/api/app";
import { PageLoading } from "@/components/shared/LoadingSpinner";

// =============================================
// MÓDULOS LAZY — solo se cargan cuando se usan
// =============================================
const RecepcionModule     = lazy(() => import("@/modules/recepcion/RecepcionModule").then(m => ({ default: m.RecepcionModule })));
const ClientesModule      = lazy(() => import("@/modules/clientes/ClientesModule").then(m => ({ default: m.ClientesModule })));
const CatalogosModule     = lazy(() => import("@/modules/catalogos/CatalogosModule").then(m => ({ default: m.CatalogosModule })));
const InventarioModule    = lazy(() => import("@/modules/inventario/InventarioModule").then(m => ({ default: m.InventarioModule })));
const VentasGymModule     = lazy(() => import("@/modules/ventas-gym/VentasGymModule").then(m => ({ default: m.VentasGymModule })));
const VentasTiendaModule  = lazy(() => import("@/modules/ventas-tienda/VentasTiendaModule").then(m => ({ default: m.VentasTiendaModule })));
const ComprasModule       = lazy(() => import("@/modules/compras/ComprasModule").then(m => ({ default: m.ComprasModule })));
const CajaModule          = lazy(() => import("@/modules/caja/CajaModule").then(m => ({ default: m.CajaModule })));
const CarteraModule       = lazy(() => import("@/modules/cartera/CarteraModule").then(m => ({ default: m.CarteraModule })));
const PagosInstructoresModule = lazy(() => import("@/modules/pagos-instructores/PagosInstructoresModule").then(m => ({ default: m.PagosInstructoresModule })));
const ProcesosModule      = lazy(() => import("@/modules/procesos/ProcesosModule").then(m => ({ default: m.ProcesosModule })));
const ReportesModule      = lazy(() => import("@/modules/reportes/ReportesModule").then(m => ({ default: m.ReportesModule })));
const ConfiguracionModule = lazy(() => import("@/modules/configuracion/ConfiguracionModule").then(m => ({ default: m.ConfiguracionModule })));

// =============================================
// MODULE RENDERER — memoizado para evitar re-renders
// Solo re-renderiza cuando cambia el módulo activo
// =============================================
const ModuleRenderer = memo(function ModuleRenderer({ modulo }: { modulo: ModuloActivo }) {
  switch (modulo) {
    case "recepcion":         return <Suspense fallback={<PageLoading text="Cargando..." />}><RecepcionModule /></Suspense>;
    case "clientes":          return <Suspense fallback={<PageLoading text="Cargando..." />}><ClientesModule /></Suspense>;
    case "catalogos":         return <Suspense fallback={<PageLoading text="Cargando..." />}><CatalogosModule /></Suspense>;
    case "inventario":        return <Suspense fallback={<PageLoading text="Cargando..." />}><InventarioModule /></Suspense>;
    case "ventas-gym":        return <Suspense fallback={<PageLoading text="Cargando..." />}><VentasGymModule /></Suspense>;
    case "ventas-tienda":     return <Suspense fallback={<PageLoading text="Cargando..." />}><VentasTiendaModule /></Suspense>;
    case "compras":           return <Suspense fallback={<PageLoading text="Cargando..." />}><ComprasModule /></Suspense>;
    case "caja":              return <Suspense fallback={<PageLoading text="Cargando..." />}><CajaModule /></Suspense>;
    case "cartera":           return <Suspense fallback={<PageLoading text="Cargando..." />}><CarteraModule /></Suspense>;
    case "pagos-instructores":return <Suspense fallback={<PageLoading text="Cargando..." />}><PagosInstructoresModule /></Suspense>;
    case "procesos":          return <Suspense fallback={<PageLoading text="Cargando..." />}><ProcesosModule /></Suspense>;
    case "reportes":          return <Suspense fallback={<PageLoading text="Cargando..." />}><ReportesModule /></Suspense>;
    case "configuracion":     return <Suspense fallback={<PageLoading text="Cargando..." />}><ConfiguracionModule /></Suspense>;
    default: return null;
  }
});

// =============================================
// SIDEBAR — memoizado, solo re-renderiza si cambia
// el módulo activo, el sidebar, vencimientos o usuario
// =============================================
interface MenuItem {
  id: ModuloActivo;
  label: string;
  icon: React.ElementType;
  nivelMinimo?: number;
  badge?: boolean;
  separator?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "recepcion",           label: "Recepción",          icon: Monitor },
  { id: "clientes",            label: "Clientes",            icon: Users },
  { id: "catalogos",           label: "Catálogos",           icon: Layers },
  { id: "inventario",          label: "Inventario",          icon: Package },
  { id: "ventas-gym",          label: "Ventas Gym",          icon: Dumbbell,    separator: true },
  { id: "ventas-tienda",       label: "Ventas Tienda",       icon: Store },
  { id: "compras",             label: "Compras",             icon: ShoppingCart },
  { id: "caja",                label: "Caja",                icon: Wallet,      separator: true },
  { id: "cartera",             label: "Cartera",             icon: CreditCard },
  { id: "pagos-instructores",  label: "Pagos Instructores",  icon: HandCoins },
  { id: "procesos",            label: "Procesos",            icon: RefreshCw,   separator: true, badge: true },
  { id: "reportes",            label: "Reportes",            icon: PieChart },
  { id: "configuracion",       label: "Configuración",       icon: Settings,    separator: true, nivelMinimo: 1 },
];

interface SidebarProps {
  nombreGimnasio: string;
  logoPath: string;
  moduloActivo: ModuloActivo;
  sidebarCollapsed: boolean;
  vencimientosHoy: number;
  nivelUsuario: number;
  nombreUsuario: string;
  cargoUsuario: string;
  appVersion: string;
  onSetModulo: (m: ModuloActivo) => void;
  onToggle: () => void;
  onLogout: () => void;
}

const Sidebar = memo(function Sidebar({
  nombreGimnasio, logoPath, moduloActivo, sidebarCollapsed, vencimientosHoy,
  nivelUsuario, nombreUsuario, cargoUsuario, appVersion,
  onSetModulo, onToggle, onLogout,
}: SidebarProps) {
  const menuItemsVisible = MENU_ITEMS.filter(
    item => item.nivelMinimo === undefined || nivelUsuario <= item.nivelMinimo
  );

  return (
    <aside className={cn(
      "flex flex-col bg-slate-900 text-slate-100 flex-shrink-0 border-r border-slate-700",
      sidebarCollapsed ? "w-[60px]" : "w-[220px]"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-slate-700/60 flex-shrink-0",
        sidebarCollapsed ? "px-3 justify-center" : "px-4 gap-3"
      )}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-transparent overflow-hidden">
          <img src={logoPath || sagimLogo} alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm text-white line-clamp-2 leading-tight break-words">{nombreGimnasio}</p>
            <span className="text-xs text-emerald-400 mt-0.5 font-medium">{appVersion}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {menuItemsVisible.map(item => {
          const Icon = item.icon;
          const isActive = moduloActivo === item.id;
          const showBadge = item.badge && vencimientosHoy > 0;
          return (
            <div key={item.id}>
              {item.separator && (
                <div className={cn("border-t border-slate-700/50 my-1", sidebarCollapsed ? "mx-2" : "mx-3")} />
              )}
              <button
                onClick={() => onSetModulo(item.id)}
                className={cn(
                  "w-full flex items-center text-sm",
                  "hover:bg-slate-800/70 active:bg-slate-700",
                  sidebarCollapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5",
                  isActive ? "bg-blue-600/15 text-blue-400 border-r-2 border-blue-400" : "text-slate-400 hover:text-slate-100"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={cn("w-4 h-4", isActive && "text-blue-400")} />
                  {showBadge && sidebarCollapsed && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full border border-slate-900" />
                  )}
                </div>
                {!sidebarCollapsed && (
                  <>
                    <span className={cn("flex-1 truncate text-left text-[13px]", isActive && "text-blue-400 font-medium")}>
                      {item.label}
                    </span>
                    {showBadge && (
                      <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full">
                        {vencimientosHoy > 99 ? "99+" : vencimientosHoy}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/60 p-2 flex-shrink-0">
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md",
            sidebarCollapsed ? "justify-center h-9" : "gap-3 px-2 py-2"
          )}
          title={sidebarCollapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-[13px]">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
});

// =============================================
// TOPBAR — memoizado, solo re-renderiza si cambia
// el módulo, vencimientos o info de usuario.
// El reloj está en RelojTopbar que maneja su propio estado.
// =============================================
interface TopbarProps {
  tituloModulo: string;
  vencimientosHoy: number;
  sidebarCollapsed: boolean;
  nombreUsuario: string;
  nivelUsuario: number;
  onToggleSidebar: () => void;
  onIrProcesos: () => void;
}

const Topbar = memo(function Topbar({
  tituloModulo, vencimientosHoy, sidebarCollapsed,
  nombreUsuario, nivelUsuario,
  onToggleSidebar, onIrProcesos,
}: TopbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-white flex-shrink-0 shadow-sm relative z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" title="Alternar Menú" aria-label="Alternar Menú" onClick={onToggleSidebar} className="h-8 w-8 text-slate-500 hover:text-slate-700">
          {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm font-semibold text-slate-700">{tituloModulo}</span>
      </div>

      <div className="flex items-center gap-4">
        {vencimientosHoy > 0 && (
          <button
            onClick={onIrProcesos}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold"
          >
            <Bell className="w-3.5 h-3.5" />
            {vencimientosHoy} vencimiento{vencimientosHoy !== 1 ? "s" : ""}
          </button>
        )}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-800 leading-tight">{nombreUsuario}</span>
            <span className="text-xs text-slate-500 leading-tight font-medium">
              {nivelUsuario === 1 ? "Administrador" : "Operador"}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-1 ring-primary/20">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
});

// =============================================
// APP SHELL PRINCIPAL
// Solo gestiona el estado global. Sus hijos memoizados
// solo re-renderizan cuando sus props específicas cambian.
// =============================================
export function AppShell() {
  const { usuario, logout } = useAuthStore();
  const { moduloActivo, sidebarCollapsed, vencimientosHoy, setModulo, toggleSidebar, setVencimientosHoy } = useAppStore();
  const [nombreGimnasio, setNombreGimnasio] = useState("SAGIM");
  const [logoPath, setLogoPath] = useState("");
  const [appVersion, setAppVersion] = useState("");

  // Cargar nombre del gimnasio y vencimientos UNA SOLA VEZ al montar
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const db = await getDb();
        const params = await db.select<Array<{ nombre_gimnasio: string; dias_alerta_vencimiento: number; logo_path: string | null }>>(
          "SELECT nombre_gimnasio, dias_alerta_vencimiento, logo_path FROM parametros LIMIT 1"
        );
        if (cancelled || params.length === 0) return;

        setNombreGimnasio(params[0].nombre_gimnasio || "SAGIM");
        if (params[0].logo_path) setLogoPath(params[0].logo_path);

        const diasAlerta = params[0].dias_alerta_vencimiento || 5;
        const hoy = today();
        const limite = toISODate(addDays(new Date(), diasAlerta));

        const countRows = await db.select<Array<{ c: number }>>(`
          SELECT COUNT(DISTINCT sub.inscripcion) as c
          FROM (
            SELECT p.inscripcion,
              MAX(date(p.fecha_pag, '+' || a.factor || ' days')) as venc
            FROM pagos_cli p
            JOIN actividades a ON a.codigo = p.id_actividad
            JOIN clientes cl ON cl.inscripcion = p.inscripcion
            WHERE p.estado = 'A' AND p.periodicidad = 'M' AND cl.estado = 'A'
            GROUP BY p.inscripcion
          ) sub
          WHERE sub.venc BETWEEN $1 AND $2
        `, [hoy, limite]);

        if (!cancelled) setVencimientosHoy(countRows[0]?.c ?? 0);
      } catch (err) {
        console.error("[AppShell] Error:", err);
      }
    }
    loadData();
    getVersion().then(v => { if(!cancelled) setAppVersion("v" + v) }).catch(console.error);
    return () => { cancelled = true; };
  }, [setVencimientosHoy]);

  // Callbacks estables — no recrean en cada render
  const handleLogout = useCallback(() => logout(), [logout]);
  const handleToggleSidebar = useCallback(() => toggleSidebar(), [toggleSidebar]);
  const handleSetModulo = useCallback((m: ModuloActivo) => setModulo(m), [setModulo]);
  const handleIrProcesos = useCallback(() => setModulo("procesos"), [setModulo]);

  const tituloModulo = MENU_ITEMS.find(m => m.id === moduloActivo)?.label ?? moduloActivo;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        nombreGimnasio={nombreGimnasio}
        logoPath={logoPath}
        moduloActivo={moduloActivo}
        sidebarCollapsed={sidebarCollapsed}
        vencimientosHoy={vencimientosHoy}
        nivelUsuario={usuario?.nivel ?? 2}
        nombreUsuario={usuario?.nombre ?? ""}
        cargoUsuario={usuario?.cargo ?? ""}
        appVersion={appVersion}
        onSetModulo={handleSetModulo}
        onToggle={handleToggleSidebar}
        onLogout={handleLogout}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar
          tituloModulo={tituloModulo}
          vencimientosHoy={vencimientosHoy}
          sidebarCollapsed={sidebarCollapsed}
          nombreUsuario={usuario?.nombre ?? ""}
          nivelUsuario={usuario?.nivel ?? 2}
          onToggleSidebar={handleToggleSidebar}
          onIrProcesos={handleIrProcesos}
        />

        <main className="flex-1 min-h-0 overflow-hidden bg-slate-50 relative z-0">
          <ModuleRenderer modulo={moduloActivo} />
        </main>
      </div>
    </div>
  );
}
