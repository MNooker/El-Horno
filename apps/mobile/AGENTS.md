# App móvil — reparto Expo / React Native

Hereda ../../AGENTS.md. Este directorio solo contiene instrucciones de migración.
La interfaz operativa actual es ../../repartidor.html, una web móvil.

## Producto
Reparto estilo Uber Delivery: disponibilidad, ofertas, recogida, ruta, entrega,
ganancias, historial y cuenta. No es el POS del cajero.
No presentar Maps como seguimiento GPS ni ganancias como transferencias bancarias.

## Stack objetivo
Expo según SDK real de package.json, React Native, TypeScript estricto y Expo Router.
Cliente API tipado generado; expo-sqlite para negocio y expo-secure-store para tokens.
pnpm según manifiesto y lockfile, sin asumir filtros de paquetes inexistentes.

## Estructura
- app/: rutas; src/components/: UI; src/api/: wrapper de cliente tipado.
- src/auth/: sesión; src/db/: SQLite y migraciones; src/sync/: outbox y reintentos.
- No editar tipos generados ni escribir fetch dispersos en pantallas.
- Sin any ni assertions para ocultar errores; props explícitas y límites de entrada.

## Sesión y offline
- Tokens solo SecureStore; sin secretos en EXPO_PUBLIC_*, SQLite o logs.
- HTTPS en distribución. HTTP LAN actual es desarrollo local, no despliegue público.
- Rutas protegidas según SDK no sustituyen permisos del backend.
- Logout limpia credenciales y bloquea datos sensibles; conserva de forma segura
  operaciones pendientes por cuenta hasta confirmación, sin transferirlas a otra sesión.
- Usar expo-screen-offline para UUID, outbox, backoff, recuperación y reconciliación.
- Oferta solo aceptada con respuesta del servidor. Recogida/entrega offline requiere
  contrato compatible y estado visible "pendiente de confirmar".
- pending/syncing/synced/failed y contador de pendientes; nunca borrar sin confirmación.
- No garantizar segundo plano con app cerrada; sincronizar también en foreground.
- Mostrar antigüedad del catálogo/datos. Servidor es autoridad de importes.

## UX
- Cargando, vacío, error y éxito; distinguir red, timeout, sesión y error del servidor.
- accessibilityLabel/Role, 44x44 pt, contraste y estados con texto además de color.
- Bloquear doble envío; confirmación visible tras respuesta.
- Probar lector de pantalla y fuente grande; informar si no hubo dispositivo real.

## Comandos objetivo (solo cuando exista el paquete y sus scripts)
- pnpm --filter mobile start
- pnpm --filter mobile exec expo install <paquete>
- Ejecutar expo-doctor con el mecanismo disponible; no asumir que viene instalado.
- pnpm --filter mobile typecheck
- pnpm --filter mobile lint
- pnpm --filter mobile test

## Límites
Dependencias nativas, esquema local y flujo de cobro requieren autorización de la tarea.
No lanzar builds de distribución EAS manualmente sin petición.
Probar cola con duplicados, fallo parcial, red intermitente, reinicio y token vencido.
No afirmar Expo/offline nativo implementados por la existencia de estas instrucciones.
