---
name: api-endpoint-fastapi
description: Crear o modificar endpoints, schemas y permisos en una API FastAPI de POS; comprobar primero si el backend usa realmente FastAPI.
---

# Endpoints del POS

## Antes de editar
Lee AGENTS.md, pyproject.toml, lockfile, routers, dependencias y tests vecinos.
Si el backend es Python estándar, no introduzcas FastAPI por activar esta skill:
aplica las invariantes de dominio y documenta la migración por separado.
Usa uv si el proyecto lo usa; de lo contrario sigue su gestor real.

## Implementación
- Router: validación HTTP, dependencias, servicio y respuesta; negocio en services.
- Schemas pydantic v2 separados de ORM, entrada extra="forbid", límites explícitos.
- Declara response_model, status_code y errores esperados; contempla respuestas sin cuerpo.
- Inyecta sesión y usuario. Sesión con yield y cierre garantizado; transacción en servicio.
- Funciones síncronas con ORM síncrono; async solo con cadena compatible.
- Auth por defecto; rutas públicas explícitas. Security declara scopes; la dependencia
  debe comprobarlos, junto con propiedad/asignación de cada recurso.
- PyJWT: algoritmos fijados, exp obligatorio, iss/aud configurados y validados.
- Contraseñas con hash aprobado, secretos en entorno, sin tokens ni datos de pago en logs.
- Roles del proyecto: caja no anula ventas ni consulta reportes administrativos;
  reparto solo opera entregas autorizadas. No inventes un rol manager sin migración.
- UUID idempotente con restricción única y respuesta original ante reintentos.
  Misma clave con otro contenido: conflicto; autenticar antes de buscar duplicados.
- Decimal para negocio, Numeric para modelos nuevos; venta/inventario/pago atómicos.
- Lotes: una transacción o savepoint por elemento; no un commit parcial sin informar.
- Errores específicos de dominio traducidos a HTTP; no capturar Exception indiscriminadamente.

## Cierre
Prueba éxito, validación, 401, 403, propiedad, duplicados concurrentes y rollback.
Ejecuta pytest, ruff check, ruff format --check y mypy si están configurados.
Regenera OpenAPI y tipos al cambiar el contrato; verifica ambos consumidores.
No añadas dependencias, cambies esquemas o rompas contratos sin autorización de la tarea.
Consulta la documentación correspondiente a la versión instalada:
[FastAPI scopes](https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/).
