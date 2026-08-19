import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * Error Boundary global para capturar errores de React.
 * Muestra una pantalla de error amigable en lugar de una pantalla en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error para debugging
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({
      errorInfo: errorInfo.componentStack || null,
    });

    // Intentar guardar en log de archivo (si está disponible)
    this.logErrorToFile(error, errorInfo.componentStack);
  }

  private async logErrorToFile(error: Error, componentStack: string | null | undefined) {
    try {
      // Importar dinámicamente para evitar errores si no está en Tauri
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const timestamp = new Date().toISOString();
      const logEntry = `
[${timestamp}] ERROR BOUNDARY
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${componentStack}
---
`;
      await writeTextFile('error.log', logEntry, {
        baseDir: BaseDirectory.AppData,
        append: true,
      });
    } catch {
      // Silenciar si no está en entorno Tauri
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
              <p className="text-muted-foreground">
                Ha ocurrido un error inesperado. Puedes intentar recargar la aplicación o volver al
                inicio.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted p-4 rounded-lg text-left">
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Si el problema persiste, contacta a soporte técnico.
              <br />
              Los detalles del error se han guardado en el registro.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar con componentes funcionales que necesitan
 * resetear el error boundary programáticamente.
 */
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Error al cargar este componente</p>
          <p className="text-xs text-muted-foreground font-mono">{error.message}</p>
          <Button size="sm" variant="outline" onClick={resetError}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
