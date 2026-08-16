# SAGIM — Guía de Migración Access → SQLite

## ¿Qué hace este script?

Migra todos los datos del sistema SAGIM original (Visual Basic 6 + Microsoft Access) 
al nuevo SAGIM moderno (Tauri + React + SQLite).

**Se ejecuta UNA SOLA VEZ** antes de arrancar el nuevo sistema por primera vez.

---

## Requisitos

- Node.js 18 o superior
- Acceso al archivo `Datos.accdb` del sistema original

---

## Ejecución

### Opción 1 — Rutas por defecto (recomendada)

Si el repositorio está en la misma carpeta que la carpeta `SAGIM`:

```
Sagim/
├── SAGIM/BD/Datos.accdb    ← original
└── sagim-app/              ← nuevo proyecto
```

Desde la carpeta `sagim-app/`:

```bash
node src/migration/migrate.js
```

El archivo `sagim.db` se creará automáticamente en `~/.sagim/sagim.db`.

### Opción 2 — Rutas personalizadas

```bash
node src/migration/migrate.js "C:\ruta\a\Datos.accdb" "C:\ruta\destino\sagim.db"
```

---

## Qué se migra

| Tabla Access      | Tabla SQLite        | Registros esperados |
|-------------------|---------------------|---------------------|
| Clientes          | clientes            | ~3,758              |
| Medidas           | medidas             | ~3,840              |
| Instructor        | instructores        | ~53                 |
| Actividades       | actividades         | ~26                 |
| FormaDePago       | forma_pago          | ~5                  |
| Especialidades    | especialidades      | ~23                 |
| Inventario        | inventario          | ~29                 |
| Proveedores       | proveedores         | ~7                  |
| Usuario           | usuarios            | ~3                  |
| PagosCli          | pagos_cli           | ~21,715             |
| ReciboPago        | recibos             | ~23,688             |
| detReciboPago     | det_recibo_pago     | ~23,690             |
| FactuTienda       | factu_tienda        | ~1                  |
| detFactuTienda    | det_factu_tienda    | ~1                  |
| MovCaja           | mov_caja            | ~29,364             |
| PagosIns          | pagos_ins           | ~4,140              |
| CtasPorCobrar     | ctas_por_cobrar     | 0                   |
| CtasPorPagar      | ctas_por_pagar      | 0                   |
| CuotasCli         | cuotas_cli          | 0                   |
| AbonoCuota        | abono_cuota         | 0                   |
| Compra            | compras             | 0                   |
| detCompra         | det_compra          | 0                   |
| Parametros        | parametros          | 1                   |

---

## Fotos de clientes

Las fotos almacenadas como OLE Object en Access se extraen automáticamente 
y se guardan como archivos `.jpg` en la carpeta `fotos/` junto al archivo `sagim.db`.

El campo `foto_path` de cada cliente almacena el nombre del archivo (ej: `1234.jpg`).

---

## Contraseñas de usuarios

Por seguridad, las contraseñas originales (cifradas con el algoritmo VB6 personalizado) 
**NO se migran**. En su lugar, todos los usuarios migrados reciben la contraseña temporal:

```
sagim123
```

**Es obligatorio cambiar las contraseñas** desde el módulo Configuración → Usuarios
después de la migración.

---

## Log de migración

Al finalizar se genera el archivo `migration_log.txt` en la misma carpeta que `sagim.db`.
Contiene el conteo de registros migrados por tabla y cualquier error encontrado.

---

## Solución de problemas

**Error: archivo .accdb no encontrado**
→ Verifica la ruta al archivo y pásala como primer argumento.

**Error: módulo not found (mdb-reader / better-sqlite3)**
→ Ejecuta `npm install` desde la carpeta `sagim-app/`.

**Registros con errores en el log**
→ Son filas con datos inválidos en el Access original (campos vacíos obligatorios, 
  cédulas duplicadas, etc.). El script continúa con los demás registros.

**La migración se ejecuta dos veces**
→ El script hace backup automático del `sagim.db` anterior con timestamp 
  antes de sobrescribirlo.
