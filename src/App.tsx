import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/shared/Toaster';
import { LoginScreen } from '@/modules/auth/LoginScreen';
import { AppShell } from '@/modules/auth/AppShell';
import { SplashScreen } from '@/modules/auth/SplashScreen';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { initDatabase } from '@/db/database';
import { startAutoBackup } from '@/lib/backup';
import { initLogger, logger } from '@/lib/logger';

import { hexToHsl } from '@/lib/utils';

function App() {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        // Inicializar logger primero
        await initLogger('info');
        logger.info('App', 'Iniciando SAGIM...');

        await initDatabase();
        logger.info('App', 'Base de datos inicializada');

        // Iniciar backup automático (cada 4 horas)
        startAutoBackup(4);
        logger.info('App', 'Backup automático configurado');

        // Load custom color
        const { getParametros } = await import('@/db/queries/configuracion');
        const p = await getParametros();
        if (p?.color_primario) {
          document.documentElement.style.setProperty('--primary', hexToHsl(p.color_primario));
        }

        logger.info('App', 'SAGIM iniciado correctamente');
      } catch (err) {
        logger.error('App', 'Error inicializando', err);
        setDbError(String(err));
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  if (dbError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error al inicializar SAGIM</h1>
          <p className="text-muted-foreground mb-4">{dbError}</p>
          <p className="text-sm text-muted-foreground">
            Por favor contacte al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {isAuthenticated ? <AppShell /> : <LoginScreen />}
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
