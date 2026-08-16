/**
 * Módulo Cartera — CxC, CxP y Cuotas. Task 14.
 * Tabs: Cuentas por Cobrar / Cuentas por Pagar
 */
import { CreditCard, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CxCTab } from "./CxCTab";
import { CxPTab } from "./CxPTab";

export function CarteraModule() {
  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cartera</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Cuentas por cobrar a clientes y cuentas por pagar a proveedores
        </p>
      </div>

      <Tabs defaultValue="cxc" className="flex-1 flex flex-col">
        <TabsList className="self-start">
          <TabsTrigger value="cxc" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Cuentas por Cobrar
          </TabsTrigger>
          <TabsTrigger value="cxp" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Cuentas por Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cxc" className="flex-1 mt-4">
          <CxCTab />
        </TabsContent>
        <TabsContent value="cxp" className="flex-1 mt-4">
          <CxPTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
