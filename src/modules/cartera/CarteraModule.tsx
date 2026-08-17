import { CreditCard, TrendingUp, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CxCTab } from "./CxCTab";
import { CxPTab } from "./CxPTab";
import { PageHeader } from "@/components/shared/PageHeader";

export function CarteraModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Cartera"
        description="Gestión de cuentas por cobrar y por pagar"
        icon={Wallet}
        className="mb-0"
      />

      <Tabs defaultValue="cxc" className="flex-1 flex flex-col min-h-0">
        <TabsList className="self-start flex-shrink-0">
          <TabsTrigger value="cxc" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />Cuentas por Cobrar
          </TabsTrigger>
          <TabsTrigger value="cxp" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />Cuentas por Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cxc" className="flex-1 mt-4 pb-6">
          <CxCTab />
        </TabsContent>
        <TabsContent value="cxp" className="flex-1 mt-4 pb-6">
          <CxPTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
