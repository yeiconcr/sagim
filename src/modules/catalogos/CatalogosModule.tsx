import { BookOpen, Users2, Dumbbell, Star, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstructoresTab } from "./InstructoresTab";
import { ActividadesTab } from "./ActividadesTab";
import { EspecialidadesTab } from "./EspecialidadesTab";
import { FormaPagoTab } from "./FormaPagoTab";
import { PageHeader } from "@/components/shared/PageHeader";

export function CatalogosModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <PageHeader
          title="Catálogos"
          description="Gestión de actividades, especialidades e instructores"
          icon={BookOpen}
          className="mb-4"
        />
      </div>

      <Tabs defaultValue="instructores" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
        <TabsList className="self-start flex-shrink-0 mb-4">
          <TabsTrigger value="instructores" className="gap-1.5">
            <Users2 className="w-3.5 h-3.5" />Instructores
          </TabsTrigger>
          <TabsTrigger value="actividades" className="gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" />Actividades
          </TabsTrigger>
          <TabsTrigger value="especialidades" className="gap-1.5">
            <Star className="w-3.5 h-3.5" />Especialidades
          </TabsTrigger>
          <TabsTrigger value="formas-pago" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />Formas de Pago
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructores" className="flex-1 min-h-0">
          <InstructoresTab />
        </TabsContent>
        <TabsContent value="actividades" className="flex-1 min-h-0">
          <ActividadesTab />
        </TabsContent>
        <TabsContent value="especialidades" className="flex-1 min-h-0">
          <EspecialidadesTab />
        </TabsContent>
        <TabsContent value="formas-pago" className="flex-1 min-h-0">
          <FormaPagoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
