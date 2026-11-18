---
name: db-migration
description: Preparar, revisar y verificar migraciones Alembic y rollback; conservar datos de negocio y cola offline al cambiar esquemas de servidor o SQLite local.
---

# Migraciones verificables

Identifica motor, gestor, revisiones actuales y entorno antes de ejecutar comandos.
Si el proyecto no tiene Alembic, documenta una adopción explícita; no finjas una
migración creando carpetas o ejecutando create_all sobre datos activos.
Cambiar esquema requiere autorización de la tarea; preparar y probar en una copia
es parte del trabajo previo. Nunca aplicar automáticamente a la base activa.

## Servidor Alembic
1. Respaldo consistente, revisión actual y plan de recuperación. Prueba restauración
   aislada y verifica filas/saldos, sin exponer datos privados en logs.
2. Genera candidato con herramienta del repo; revisa cada operación. Renombres de
   columnas/tablas no son drop/add. Usa operaciones compatibles con el motor.
3. compare_type=True explícito para claridad (en versiones actuales ya es el default).
4. No edites revisiones aplicadas. Constraints e índices nombrados; backfill antes de
   NOT NULL; expansión/contracción cuando clientes viejos deban seguir funcionando.
5. downgrade funcional cuando conserva datos; si implica pérdida, no presentes el
   rollback como seguro: documenta pérdida, backup/restore y alternativa forward fix.
6. Prueba upgrade desde revisión previa con datos, downgrade y re-upgrade en copia.
   Valida saldos, referencias, duplicados y pendientes. Considera locks y transacciones
   DDL según motor; para SQLite evalúa batch_alter_table en vez de asumir ALTER completo.

## SQLite móvil
Versiona PRAGMA user_version y migra en transacción. Conserva payload/UUID/estado
pendiente y recupera errores sin resetear ni borrar el archivo. Prueba todos los saltos
soportados, una migración interrumpida y reapertura con ventas/entregas sin sincronizar.

Entrega revisión, evidencia, impacto y comando concreto de aplicación/recuperación.
No aplicar a datos activos ni solicitar aprobación antes de tener el cambio revisable.
[Autogenerate oficial](https://alembic.sqlalchemy.org/en/latest/autogenerate.html).
