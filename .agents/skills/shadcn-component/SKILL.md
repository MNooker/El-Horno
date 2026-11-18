---
name: shadcn-component
description: Agregar o modificar UI web React con shadcn/ui; inspeccionar componentes, tokens y accesibilidad y adaptar el trabajo si la web actual es HTML sin React.
---

# UI web del POS

Lee package.json, components.json, estilos y componentes vecinos antes de elegir API.
Si la web actual es HTML/JS, mejora sus componentes nativos y explica que shadcn
requiere una migración React; no añadas un framework por un cambio de interfaz.

En React con shadcn, reutiliza los componentes y tokens existentes. Comprueba la
versión y primitive (Radix/Base UI) utilizada; no mezcles APIs. Inspecciona el diff
del CLI antes de conservar sobrescrituras; evita cambiar componentes ajenos.

- Separa vistas de caja, administración y reparto; móvil de reparto no es caja.
- Datos por el wrapper de API tipado; permisos siempre validados por el servidor.
- Completa cargando, vacío, error, éxito y datos desactualizados/sin conexión.
- Nunca anuncies cobro/entrega como confirmado antes de recibir confirmación.
- Bloquea acciones mientras están pendientes y conserva el formulario ante fallos.
- Usa etiquetas, foco visible, dialog con título y retorno del foco, teclado,
  mensajes aria-live y áreas táctiles de al menos 44 px en controles operativos.
- No comuniques estado solo por color. Respeta prefers-reduced-motion.
- Evita re-render periódico que destruya selección, entradas o foco del cajero.

Verifica flujos modificados, teclado y anchos 320, 390, 768 y 1440 px.
Corre scripts reales de tipos/lint/tests; reporta lo no probado.
[Instalación oficial](https://ui.shadcn.com/docs/installation).
