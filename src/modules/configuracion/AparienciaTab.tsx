/**
 * AparienciaTab — controles de zoom y modo oscuro.
 * Las preferencias se guardan en localStorage (por dispositivo, no por cuenta).
 */
import { Moon, Sun, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useThemeStore, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from '@/store/themeStore';

const ZOOM_LABELS: Record<number, string> = {
  0.7: '70% — Muy compacto',
  0.8: '80% — Compacto',
  0.9: '90% — Pequeño',
  1.0: '100% — Normal',
  1.1: '110% — Grande',
  1.2: '120% — Más grande',
  1.3: '130% — Muy grande',
  1.4: '140% — Máximo',
};

export function AparienciaTab() {
  const { darkMode, zoom, toggleDarkMode, setZoom } = useThemeStore();

  const zoomLabel = ZOOM_LABELS[zoom] ?? `${Math.round(zoom * 100)}%`;
  const canDecrease = zoom > ZOOM_MIN;
  const canIncrease = zoom < ZOOM_MAX;
  const isDefault = zoom === ZOOM_DEFAULT;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Modo oscuro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Tema de la aplicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="w-5 h-5 text-indigo-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {darkMode ? 'Modo oscuro' : 'Modo claro'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {darkMode
                    ? 'Fondo oscuro, ideal para ambientes con poca luz'
                    : 'Fondo blanco, ideal para ambientes bien iluminados'}
                </p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={toggleDarkMode}
              aria-label="Activar modo oscuro"
            />
          </div>
        </CardContent>
      </Card>

      {/* Zoom */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Zoom de la interfaz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ajusta el tamaño de todos los elementos de la aplicación. Útil para monitores con escala
            de pantalla diferente a 100%.
          </p>

          {/* Controles */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => setZoom(zoom - ZOOM_STEP)}
              disabled={!canDecrease}
              title="Reducir zoom"
              aria-label="Reducir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            {/* Barra visual */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                <div
                  className="absolute left-0 top-0 h-2 bg-primary rounded-full transition-all"
                  style={{
                    width: `${((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`,
                  }}
                />
                {/* Marcador posición actual */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow border-2 border-white dark:border-slate-800 transition-all"
                  style={{
                    left: `calc(${((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}% - 8px)`,
                  }}
                />
              </div>
              <p className="text-xs text-center font-medium text-slate-700 dark:text-slate-300">
                {zoomLabel}
              </p>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => setZoom(zoom + ZOOM_STEP)}
              disabled={!canIncrease}
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Presets rápidos */}
          <div className="flex flex-wrap gap-2">
            {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  zoom === z
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>

          {/* Restaurar */}
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 dark:text-slate-400 w-full"
              onClick={() => setZoom(ZOOM_DEFAULT)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restaurar zoom por defecto (100%)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
