import { ArticulosTab } from './ArticulosTab';
import { PageHeader } from '@/components/shared/PageHeader';

export function InventarioModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <PageHeader
          title="Inventario"
          description="Gestión de artículos y kárdex de movimientos"
          className="mb-4"
        />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <ArticulosTab />
      </div>
    </div>
  );
}
