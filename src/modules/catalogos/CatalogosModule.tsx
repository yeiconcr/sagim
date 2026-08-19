import { Users2, CalendarDays, Star, CreditCard, Truck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstructoresTab } from './InstructoresTab';
import { PlanesTab } from './PlanesTab';
import { EspecialidadesTab } from './EspecialidadesTab';
import { FormaPagoTab } from './FormaPagoTab';
import { ProveedoresTab } from './ProveedoresTab';
import { PageHeader } from '@/components/shared/PageHeader';

export function CatalogosModule() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <PageHeader
          title="Catálogos"
          description="Gestión de planes, instructores, especialidades, formas de pago y proveedores"
          className="mb-4"
        />
      </div>

      <Tabs defaultValue="planes" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
        <TabsList className="self-start flex-shrink-0 mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="planes" className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="instructores" className="gap-1.5">
            <Users2 className="w-3.5 h-3.5" />
            Instructores
          </TabsTrigger>
          <TabsTrigger value="especialidades" className="gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Especialidades
          </TabsTrigger>
          <TabsTrigger value="formas-pago" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Formas de Pago
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planes" className="flex-1 min-h-0">
          <PlanesTab />
        </TabsContent>
        <TabsContent value="instructores" className="flex-1 min-h-0">
          <InstructoresTab />
        </TabsContent>
        <TabsContent value="especialidades" className="flex-1 min-h-0">
          <EspecialidadesTab />
        </TabsContent>
        <TabsContent value="formas-pago" className="flex-1 min-h-0">
          <FormaPagoTab />
        </TabsContent>
        <TabsContent value="proveedores" className="flex-1 min-h-0">
          <ProveedoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
