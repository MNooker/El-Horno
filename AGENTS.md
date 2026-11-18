# El Horno — instrucciones del proyecto

## Producto y estado real
- Tienda, caja, administración y reparto. La app móvil es de reparto estilo Uber Delivery.
- Hoy: Python estándar, SQLite y HTML/CSS/JavaScript; server.py y store.js.
- apps/api y apps/mobile contienen instrucciones para una migración futura, no apps ejecutables.
- No asumir FastAPI, React, shadcn, Expo, pnpm ni OpenAPI hasta verificar sus manifiestos.
- Pagos online simulados, tarjeta registrada manualmente; no hay GPS en tiempo real.

## Trabajar con los datos
- No usar la BD activa para tests ni mostrar data/accesos.json o secretos.
- Pruebas y servidores de QA con HORNO_DATA_DIR apuntando a un directorio temporal.
- No borrar ventas, reinicializar datos ni modificar migraciones ya aplicadas.
- Esquemas, nuevas dependencias y contratos incompatibles requieren autorización
  específica cuando no estén ya incluidos en la tarea. Preparar primero el cambio revisable.
- No cambiar configuración global de Codex para adaptar este proyecto.

## Reglas compartidas
- Dinero calculado en servidor con Decimal. El contrato JSON numérico heredado se
  conserva en la frontera; no hacer cálculos monetarios con float.
- Inventario y pedidos atómicos; idempotencia conserva la operación original.
- Administración anula; caja cobra; reparto recoge y entrega pedidos autorizados.
- No afirmar éxito de una escritura sin respuesta del servidor ni reintentarla
  automáticamente sin idempotencia. Un fallo del refresco no revierte un éxito confirmado.
- Conexión, carga, vacío y error visibles; botones protegidos contra doble envío.
- Accesibilidad: teclado, etiquetas, foco visible, contraste y movimiento reducido.
- No declarar offline completo cuando solo se muestran datos en memoria.

## Skills disponibles
Instaladas en /home/nooker/.codex/skills/<nombre>/SKILL.md:
- api-endpoint-fastapi: endpoints, schemas y permisos; detectar stack antes de usar.
- sync-api-types: contratos que afecten web/móvil y generación desde OpenAPI.
- shadcn-component: UI web; conservar HTML nativo mientras no exista React.
- expo-screen-offline: reparto Expo, outbox, reintentos y reconciliación.
- pos-domain-rules: dinero, caja, inventario, devoluciones y reglas comerciales.
- db-migration: esquema, Alembic/SQLite y recuperación verificable.

## Verificación actual
- python check.py (tests y sintaxis, con HORNO_DATA_DIR temporal).
- node --test test_store.cjs para errores de red y confirmación de operaciones.
- node --check store.js y scripts inline cuando se modifiquen.
- Verificar interfaz modificada y anchos móviles; reportar límites reales de QA.
- No exigir comandos uv/pnpm inexistentes ni presentarlos como ejecutados.
- Mantener instrucciones bajo 150 líneas; detalle especializado en las skills.
