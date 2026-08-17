import { Package, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticulosTab } from "./ArticulosTab";
import { ProveedoresTab } from "./ProveedoresTab";
import { PageHeader } from "@/components/shared/PageHeader";

export function InventarioModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <PageHeader
          title="Inventario"
          description="Gestión de artículos, kárdex de movimientos y proveedores"
          icon={Package}
          className="mb-4"
        />
      </div>

      <Tabs defaultValue="articulos" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
        {/* TabsList fija */}
        <TabsList className="self-start flex-shrink-0 mb-4">
          <TabsTrigger value="articulos" className="gap-1.5">
            <Package className="w-3.5 h-3.5" />Artículos
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-1.5">
            <Truck className="w-3.5 h-3.5" />Proveedores
          </TabsTrigger>
        </TabsList>

        {/* Contenido: flex-1 min-h-0 hace que el tab se expanda y permita scroll interno */}
        <TabsContent value="articulos" className="flex-1 min-h-0">
          <ArticulosTab />
        </TabsContent>
        <TabsContent value="proveedores" className="flex-1 min-h-0">
          <ProveedoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
