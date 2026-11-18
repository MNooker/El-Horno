---
name: sync-api-types
description: Sincronizar OpenAPI y tipos compartidos cuando modelos o contratos de API afectan web y móvil; detectar cambios incompatibles y generación no reproducible.
---

# Contratos compartidos

1. Lee el exportador OpenAPI, package.json raíz, pnpm-workspace.yaml y el generador.
   Confirma los nombres reales de paquetes; no asumas que los filtros son web/mobile.
2. Si no existen API OpenAPI ni packages/shared-types, informa la ausencia y prepara
   el contrato/migración: no declares generación exitosa ni crees tipos ficticios.
3. Modifica el schema fuente de la API; nunca parches archivos generados.
4. Exporta desde la aplicación con configuración de prueba, sin abrir ni inicializar
   la base activa. El import del exportador no debe arrancar jobs ni hacer migraciones.
5. Ejecuta el script real (ejemplo: uv run python scripts/export_openapi.py) y
   pnpm gen:types solamente si existen. Usa herramientas fijadas en el lockfile.
6. Revisa diferencias: requeridos, nullability, enums, nombres, fechas UTC,
   decimales como cadenas frente a números, respuestas de error y códigos HTTP.
7. openapi-typescript genera tipos, no un cliente HTTP ni validadores de runtime.
   El wrapper tipado debe manejar timeout, red, sesión y errores del servidor.
8. Compila web y móvil con sus scripts reales; ejecuta pruebas de consumidores
   afectados y una segunda generación para confirmar que no cambia el resultado.
9. Un contrato incompatible requiere la autorización correspondiente o una versión
   de API compatible con clientes móviles antiguos; no silencies errores con any.

Entrega archivos fuente/generados, comandos y consumidores verificados; señala ausentes.
[CLI oficial](https://openapi-ts.dev/cli).
