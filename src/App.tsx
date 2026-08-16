import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Toaster } from "@/components/shared/Toaster";
import { LoginScreen } from "@/modules/auth/LoginScreen";
import { AppShell } from "@/modules/auth/AppShell";
import { SplashScreen } from "@/modules/auth/SplashScreen";
import { initDatabase } from "@/db/database";

function App() {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        await initDatabase();
      } catch (err) {
        console.error("Error inicializando base de datos:", err);
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
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Error al inicializar SAGIM
          </h1>
          <p className="text-muted-foreground mb-4">{dbError}</p>
          <p className="text-sm text-muted-foreground">
            Por favor contacte al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <AppShell /> : <LoginScreen />}
      <Toaster />
    </>
  );
}

export default App;
