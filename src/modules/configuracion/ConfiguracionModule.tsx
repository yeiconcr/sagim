/**
 * Módulo Configuración — Parámetros, Usuarios y Backup/Restore. Task 18.
 */
import { useState } from "react";
import { Settings, Users, HardDrive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParametrosTab } from "./ParametrosTab";
import { UsuariosTab } from "./UsuariosTab";
import { BackupTab } from "./BackupTab";

export function ConfiguracionModule() {
  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Parámetros del sistema, usuarios y respaldo de datos
        </p>
      </div>

      <Tabs defaultValue="parametros" className="flex-1 flex flex-col">
        <TabsList className="self-start">
          <TabsTrigger value="parametros" className="gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Parámetros
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parametros" className="flex-1 mt-4">
          <ParametrosTab />
        </TabsContent>
        <TabsContent value="usuarios" className="flex-1 mt-4">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="backup" className="flex-1 mt-4">
          <BackupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
