import sagimLogo from '@/assets/sagim-logo.png';

export function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        {/* Logo SAGIM */}
        <img src={sagimLogo} alt="SAGIM Logo" className="w-32 h-32 mx-auto mb-6 object-contain" />

        <h1 className="text-4xl font-black text-white mb-2 tracking-wide">SAGIM</h1>
        <p className="text-slate-400 text-sm mb-8">Sistema Administrativo de Gimnasios</p>

        {/* Loading spinner */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
        </div>
        <p className="text-slate-500 text-xs mt-4">Inicializando base de datos...</p>
      </div>
    </div>
  );
}
