/**
 * BackupTab — Respaldar y Recuperar la base de datos.
 * Equivalente a frmRespaldo del VB6.
 */
import { useState } from 'react';
import { HardDrive, Upload, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/store/toastStore';

export function BackupTab() {
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [backupMsg, setBackupMsg] = useState('');
  const { success, error, info } = useToast();

  const handleRespaldar = async () => {
    try {
      // Usar la API de Tauri para guardar archivo
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { copyFile } = await import('@tauri-apps/plugin-fs');
      const { appDataDir, join } = await import('@tauri-apps/api/path');

      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, 'sagim.db');

      const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultName = `sagim_backup_${fecha}.db`;

      const destino = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
        title: 'Guardar copia de seguridad',
      });

      if (!destino) {
        info('Backup cancelado');
        return;
      }

      await copyFile(dbPath, destino);
      setBackupStatus('success');
      setBackupMsg(`Backup guardado en: ${destino}`);
      success('Backup exitoso', `Copia guardada: ${defaultName}`);
    } catch (err) {
      setBackupStatus('error');
      setBackupMsg(String(err));
      error('Error en backup', String(err));
    }
  };

  const handleRecuperar = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { copyFile } = await import('@tauri-apps/plugin-fs');
      const { appDataDir, join } = await import('@tauri-apps/api/path');

      const origen = await open({
        filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
        title: 'Seleccionar backup a restaurar',
      });

      if (!origen || Array.isArray(origen)) {
        info('Restauración cancelada');
        return;
      }

      const dataDir = await appDataDir();
      const dbPath = await join(dataDir, 'sagim.db');

      // Crear backup de la BD actual antes de restaurar
      const fechaAhora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupActual = await join(dataDir, `sagim_prerestauracion_${fechaAhora}.db`);
      await copyFile(dbPath, backupActual);

      await copyFile(origen, dbPath);
      success(
        'Restauración exitosa',
        'La base de datos fue restaurada. Reinicie la aplicación para aplicar los cambios.'
      );
      setBackupStatus('success');
      setBackupMsg(`BD restaurada desde: ${origen}`);
    } catch (err) {
      setBackupStatus('error');
      setBackupMsg(String(err));
      error('Error en restauración', String(err));
    }
  };

  return (
    <div className="max-w-2xl space-y-5 overflow-y-auto flex-1 min-h-0 pb-4">
      {/* Respaldar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-1">Respaldar Base de Datos</h3>
              <p className="text-sm text-slate-500 mb-4">
                Genera una copia del archivo{' '}
                <code className="bg-slate-100 px-1 rounded text-xs">sagim.db</code> en la ubicación
                que elija. Se recomienda hacer un backup diario al final de la jornada.
              </p>
              <Button onClick={handleRespaldar} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-1.5" />
                Crear Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recuperar */}
      <Card className="border-orange-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-1">Restaurar desde Backup</h3>
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700">
                  <strong>Atención:</strong> Esta operación reemplazará TODOS los datos actuales con
                  el backup seleccionado. Los datos actuales serán guardados automáticamente como
                  respaldo antes de restaurar. Reinicie la aplicación después de restaurar.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
                onClick={handleRecuperar}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Restaurar Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado */}
      {backupStatus !== 'idle' && (
        <Card
          className={
            backupStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }
        >
          <CardContent className="p-4 flex items-start gap-3">
            {backupStatus === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm break-all">{backupMsg}</p>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700 text-sm">Información del sistema</h3>
          </div>
          <div className="space-y-2 text-sm text-slate-500">
            <p>• La base de datos se almacena en el directorio de datos de la aplicación.</p>
            <p>
              • Se recomienda guardar copias en una ubicación externa (USB, nube) periódicamente.
            </p>
            <p>• El formato de backup es un archivo SQLite estándar (.db).</p>
            <p>• Antes de cualquier restauración se crea automáticamente un backup de seguridad.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
