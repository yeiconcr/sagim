/**
 * Módulo Inventario — Artículos, Kardex y Proveedores.
 * Task 9.
 */
import { useState } from "react";
import { Package, Truck, BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticulosTab } from "./ArticulosTab";
import { ProveedoresTab } from "./ProveedoresTab";

export function InventarioModule() {
  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Inventario</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de artículos, kárdex de movimientos y proveedores
        </p>
      </div>

      <Tabs defaultValue="articulos" className="flex-1 flex flex-col">
        <TabsList className="self-start">
          <TabsTrigger value="articulos" className="gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Artículos
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articulos" className="flex-1 mt-4">
          <ArticulosTab />
        </TabsContent>
        <TabsContent value="proveedores" className="flex-1 mt-4">
          <ProveedoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
