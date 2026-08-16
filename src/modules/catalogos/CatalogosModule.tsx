/**
 * Módulo Catálogos — 4 sub-módulos: Instructores, Actividades, Especialidades, Forma de Pago.
 * Task 8.
 */
import { useState } from "react";
import { BookOpen, Users2, Dumbbell, Star, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstructoresTab } from "./InstructoresTab";
import { ActividadesTab } from "./ActividadesTab";
import { EspecialidadesTab } from "./EspecialidadesTab";
import { FormaPagoTab } from "./FormaPagoTab";

export function CatalogosModule() {
  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Catálogos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de instructores, actividades, especialidades y formas de pago
        </p>
      </div>

      <Tabs defaultValue="instructores" className="flex-1 flex flex-col">
        <TabsList className="self-start">
          <TabsTrigger value="instructores" className="gap-1.5">
            <Users2 className="w-3.5 h-3.5" />
            Instructores
          </TabsTrigger>
          <TabsTrigger value="actividades" className="gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" />
            Actividades
          </TabsTrigger>
          <TabsTrigger value="especialidades" className="gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Especialidades
          </TabsTrigger>
          <TabsTrigger value="formas-pago" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Formas de Pago
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructores" className="flex-1 mt-4">
          <InstructoresTab />
        </TabsContent>
        <TabsContent value="actividades" className="flex-1 mt-4">
          <ActividadesTab />
        </TabsContent>
        <TabsContent value="especialidades" className="flex-1 mt-4">
          <EspecialidadesTab />
        </TabsContent>
        <TabsContent value="formas-pago" className="flex-1 mt-4">
          <FormaPagoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
