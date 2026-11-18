---
name: expo-screen-offline
description: Crear o modificar pantallas Expo de reparto con SQLite, cola offline, reintentos y reconciliación; la app móvil de El Horno es para repartidores estilo Uber Delivery.
---

# Pantallas móviles y sincronización

Lee AGENTS.md, package.json, SDK, rutas, src/db, src/sync y wrapper API.
Si no existe Expo, no simules una app nativa con archivos vacíos. Separa las
mejoras de la web de reparto del trabajo de migración a Expo.
La app de este proyecto es de reparto: ofertas, recogida, ruta, entrega,
ganancias y cuenta. No convertirla en caja ni permitir ventas móviles por defecto.

## Pantalla y sesión
Expo Router según SDK instalado, TS estricto, props explícitas, sin any.
Estados de carga/vacío/error/éxito y pendientes visibles. Objetivos 44x44 pt,
accessibilityLabel/Role, fuente grande y lector de pantalla.
Tokens solo SecureStore; negocio en SQLite; nunca secretos EXPO_PUBLIC_*.
Rutas protegidas no sustituyen auth y propiedad en API. HTTPS en distribución.
Logout elimina credenciales y aísla datos por usuario: no borres operaciones
pendientes no confirmadas; bloquea su acceso y resuelve su conservación segura.

## Outbox
- Guardar operación + client_uuid estable + payload inmutable en una transacción local.
- Estados pending/syncing/synced/failed, intentos, next_retry_at y último error visible.
- Recuperar syncing abandonados tras cierre; un solo worker por cuenta/dispositivo.
- Activar al guardar, recuperar red y entrar en foreground; programar próximo reintento.
  Background del SO es oportunista: no prometer ejecución garantizada con app cerrada.
- Backoff limitado con jitter; timeout/red/5xx reintentan; 429 respeta Retry-After.
  401 pausa y pide sesión, sin perder datos; rechazo permanente requiere intervención.
- Correlacionar cada resultado por UUID; duplicados, IDs inesperados, resultados ausentes
  o malformados no confirman operaciones. Persistir respuesta y estado atómicamente.
- Nunca borrar pendientes ni marcar synced antes de confirmación del servidor.
- Servidor recalcula dinero; mostrar estimación offline y reconciliar diferencias.
- Aceptar una oferta requiere servidor para evitar doble asignación. Cola de recogida/
  entrega solo si el contrato lo soporta, con asignación y estado esperado. Offline
  muestra "pendiente de confirmar", nunca "entregada" antes de respuesta.
- SQLite parametrizado y migraciones con user_version; probar preservación de pendientes.
  Verifica withExclusiveTransactionAsync y su soporte en plataforma/SDK; las consultas
  de la transacción usan su objeto txn. No hacer red dentro de la transacción.

Para un POS móvil explícitamente solicitado, ventas offline conservan UUID, estimación,
confirmación y reconciliación; es un flujo distinto del reparto de El Horno.
Prueba reinicio, lote parcial, duplicados, caída tras commit remoto, timeout y 401.
Corre typecheck/lint/tests y expo-doctor; declara límites de dispositivo real.
Dependencias nativas, esquema local y flujo de cobro requieren autorización de la tarea.
No lanzar EAS distribución manualmente sin petición.
[SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) ·
[SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
