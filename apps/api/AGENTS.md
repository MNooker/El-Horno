# API del POS — destino FastAPI

Hereda ../../AGENTS.md. Este directorio todavía no contiene una API ejecutable.
La API activa está en ../../server.py. No sustituirla ni migrar datos implícitamente.

## Stack al implementar la migración
Python compatible con el manifiesto, FastAPI, pydantic v2, SQLAlchemy 2.x,
Alembic, pytest y PyJWT. uv si existe uv.lock; respetar gestor real en otro caso.
Nueva dependencia requiere autorización si no está incluida en la tarea.

## Organización
- app/routers: HTTP y dependencias; app/services: negocio y transacciones.
- app/models: SQLAlchemy; app/schemas: entradas/salidas pydantic separadas.
- app/core: configuración, seguridad, errores y dependencias.
- alembic/versions: revisiones inmutables una vez aplicadas; tests aislados.

## Contrato y seguridad
- response_model/códigos explícitos; validar límites y rechazar campos extra.
- Inyectar sesión/usuario con Depends; auth por defecto y públicos explícitos.
- Security declara scopes, la dependencia verifica scopes y propiedad real del recurso.
- JWT: algoritmos fijados, exp obligatorio, iss/aud verificados; secretos en entorno.
- Hash de contraseñas aprobado; sin tokens/contraseñas/datos de tarjeta en logs.
- SQL parametrizado. Funciones async solo con toda la cadena compatible.
- Caja no anula ni ve reportes administrativos; reparto opera asignaciones propias.
- Conservar roles heredados o migrarlos explícitamente; manager no existe hoy.

## Dominio y persistencia
- Decimal y Numeric; recalcular precios, totales e impuestos en servidor.
- UUID idempotente con restricción única; colisión de payload devuelve conflicto.
- Venta/inventario/pagos en una transacción. Cancelaciones por estado y devoluciones
  referenciadas, nunca DELETE de registros contables.
- Sync por elemento con transacciones independientes o savepoints.
- Usar las skills api-endpoint-fastapi, pos-domain-rules y db-migration.
- Preparar migración y rollback en BD aislada antes de solicitar aplicación autorizada.

## Comandos objetivo (verificar manifiesto y rutas antes de ejecutar)
- uv run fastapi dev app/main.py
- uv run pytest -v
- uv run ruff check .; uv run ruff format --check .
- uv run mypy app
- uv run alembic revision --autogenerate -m "descripcion"
- uv run alembic upgrade head (solo destino autorizado)
- uv run python scripts/export_openapi.py y pnpm gen:types en raíz

## Cierre
Pruebas de éxito, 422/401/403, propiedad, dinero, duplicados y concurrencia.
Regenerar contratos con sync-api-types y compilar ambos consumidores reales.
Reportar herramientas ausentes y límites; no afirmar FastAPI implementado por este archivo.
