import { Settings, Users, HardDrive, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParametrosTab } from './ParametrosTab';
import { UsuariosTab } from './UsuariosTab';
import { BackupTab } from './BackupTab';
import { AparienciaTab } from './AparienciaTab';
import { PageHeader } from '@/components/shared/PageHeader';

export function ConfiguracionModule() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <PageHeader
          title="Configuración"
          description="Parámetros del sistema, usuarios y respaldo de datos"
          className="mb-0"
        />

        <Tabs defaultValue="parametros" className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start flex-shrink-0">
            <TabsTrigger value="parametros" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Parámetros
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="apariencia" className="gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parametros" className="flex-1 mt-4 pb-6">
            <ParametrosTab />
          </TabsContent>
          <TabsContent value="usuarios" className="flex-1 mt-4 pb-6">
            <UsuariosTab />
          </TabsContent>
          <TabsContent value="apariencia" className="flex-1 mt-4 pb-6">
            <AparienciaTab />
          </TabsContent>
          <TabsContent value="backup" className="flex-1 mt-4 pb-6">
            <BackupTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
