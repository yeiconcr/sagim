# Guía de Revisión de Funcionalidad - SAGIM

Cuando trabajes en cualquier módulo o funcionalidad de SAGIM, revisa automáticamente estos aspectos sin esperar a que el usuario pregunte.

## 1. Validación de Duplicados

Para cualquier entidad/catálogo, verificar:
- [ ] ¿Existe validación de duplicados en código antes de guardar?
- [ ] ¿Existe constraint UNIQUE en la base de datos?
- [ ] ¿Se limpian duplicados existentes en datos históricos?
- [ ] ¿El mensaje de error es claro para el usuario?

**Campos únicos típicos:**
- Clientes: cédula
- Instructores: cédula
- Proveedores: NIT
- Artículos/Inventario: código
- Planes/Actividades: código
- Especialidades: nombre
- Formas de pago: detalle
- Usuarios: nombre

## 2. CRUD Completo

Para cualquier catálogo o entidad, verificar que tenga:
- [ ] Crear (con validación de duplicados)
- [ ] Leer/Listar (con búsqueda y paginación si aplica)
- [ ] Editar (sin permitir cambiar campo único)
- [ ] Eliminar (con validación de dependencias)
- [ ] Activar/Inactivar (soft delete)

**Validación de eliminación:**
- Antes de eliminar, verificar si el registro está siendo usado en otras tablas
- Si está en uso: mostrar mensaje claro de por qué no se puede eliminar
- Ofrecer inactivar como alternativa

## 3. Consistencia de UI

Revisar que todos los módulos mantengan:
- [ ] Iconos con texto descriptivo debajo (patrón establecido)
- [ ] Mismos colores para acciones similares (editar=gris, eliminar=rojo, activar=verde)
- [ ] Headers consistentes (con o sin iconos según decisión del proyecto)
- [ ] Mensajes de confirmación antes de acciones destructivas
- [ ] Toasts de éxito/error después de operaciones

## 4. Integridad de Datos

Verificar:
- [ ] Campos requeridos tienen validación
- [ ] Formatos correctos (email, teléfono, fechas)
- [ ] Valores por defecto sensatos
- [ ] Manejo de nulls vs strings vacíos
- [ ] Uppercase donde corresponda (nombres, apellidos, ciudades)

## 5. Relaciones entre Entidades

Cuando una entidad se relaciona con otra:
- [ ] ¿Se puede eliminar si tiene registros relacionados?
- [ ] ¿Qué pasa con los registros huérfanos?
- [ ] ¿Los selectores solo muestran opciones activas?
- [ ] ¿Se actualiza correctamente al cambiar la entidad padre?

## 6. Migración de Datos

Al modificar estructura de BD:
- [ ] ¿Funciona con bases de datos existentes?
- [ ] ¿Se migran datos antiguos correctamente?
- [ ] ¿Se limpian datos inconsistentes?

## Cómo Aplicar

1. **Al crear un nuevo módulo:** Revisar todos los puntos
2. **Al modificar un módulo existente:** Revisar puntos relacionados
3. **Al revisar código existente:** Identificar gaps y sugerir mejoras
4. **Ser proactivo:** No esperar a que el usuario pregunte, adelantarse a los problemas
