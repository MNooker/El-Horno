# El Horno

Web de pedidos, punto de venta, administración y reparto con servidor Python y base SQLite en esta PC. No necesita instalar paquetes de Python ni servicios de base de datos adicionales.

Actualización del 17 de noviembre: reglas y seis skills de desarrollo, dinero decimal,
recuperación de ticket tras fallos de conexión y bloqueo de acciones de reparto sin red.
Detalle y próximos pasos en [Avances](docs/AVANCES-2026-11-17.md).
FastAPI y Expo están documentados como destino de migración, todavía no implementados.

## Abrir

- En esta PC: http://localhost:8000/
- Desde teléfono/tablet/otra PC en la misma red Wi-Fi: http://192.168.100.10:8000/
- Caja: `/pos.html`
- Administración: `/admin.html`
- Repartidor: `/repartidor.html`

La IP de la PC puede cambiar al reconectarse al router. La PC debe estar encendida y conectada a la misma red. Si un dispositivo no conecta, revisar primero aislamiento Wi-Fi y firewall; no se configuró acceso por Internet ni se abrieron puertos en el router.

## Accesos

Las claves generadas de los perfiles `admin`, `caja` y `repartidor` están en `data/accesos.json`, accesible únicamente desde el sistema de archivos de la PC. Ese archivo y la base de datos están bloqueados por el servidor web. Elegir el perfil correspondiente en el formulario de acceso. Administración puede abrir todos los módulos.

Las sesiones duran 12 horas y se invalidan cuando se reinicia el servidor. El perfil de reparto actual corresponde a Repartidor 1.

## Servidor

Ya está instalado y habilitado como servicio **de usuario**, por lo que arranca al iniciar tu sesión de Linux:

```sh
systemctl --user status el-horno.service
systemctl --user restart el-horno.service
systemctl --user stop el-horno.service
journalctl --user -u el-horno.service -n 50
```

El servicio se define en `/home/nooker/.config/systemd/user/el-horno.service`.

Para iniciarlo manualmente, detener primero el servicio para liberar el puerto, entrar a esta carpeta y ejecutar:

```sh
python server.py --port 8000
```

`python serve.py` conserva el acceso al mismo servidor. Se escucha en todas las interfaces de red para permitir dispositivos de la LAN. Esta configuración HTTP es para una red local de confianza. La publicación por Internet requiere HTTPS y una configuración de despliegue adicional.

## Flujos

1. El cliente elige productos, cantidad, recoger o domicilio, nombre, teléfono y horario.
2. El servidor valida precios, existencia y anticipación; crea el folio y descuenta las piezas en una transacción SQLite.
3. Administración pasa el pedido de recibido a preparación y listo. Solo administración puede cancelarlo antes de la ruta y devolver las piezas una sola vez.
4. Para recoger, administración confirma cobro y entrega. Para domicilio, el repartidor acepta, recoge y confirma cobro y entrega. Puede abrir navegación o llamar al cliente.
5. El cliente consulta el estado con folio y teléfono. Las pantallas del personal consultan cambios cada dos segundos.
6. Caja registra ventas en efectivo con cambio, o cobros hechos manualmente con una terminal; ofrece ticket imprimible.
7. Administración gestiona existencias, precios, productos nuevos, textos del sitio y tarifas; muestra ventas completadas, favoritos, gráfico semanal y exportación CSV.

El servidor impide existencias negativas, cobros en efectivo insuficientes, cambios de estado repetidos y duplicados al reintentar un mismo pedido. La venta de una última pieza desde dos clientes se resuelve dentro de una transacción.

## Base y respaldo

- Base: `data/elhorno.sqlite3`.
- Tablas: `settings`, `products`, `orders`, `meta`.
- Los pedidos conservan una copia del nombre y precio de los artículos vendidos.
- Los archivos SQLite auxiliares `-wal` y `-shm` son normales mientras el servidor está abierto.
- La base se inicializa solo si está vacía y conserva los datos al reiniciar.
- Los datos anteriores de localStorage permanecen en el navegador; no se borran ni se importan automáticamente.

Para hacer un respaldo consistente incluso mientras el servidor está activo:

```sh
python backup.py
```

La copia queda en `data/backups/`. Guardar también `data/accesos.json` de forma privada. No sustituir una base activa con una copia mientras el servidor esté funcionando.

## Material de ejemplo y límites

Se conservaron 16 productos y tres pedidos de ejemplo iniciales, marcados como tales y excluidos de ventas y ganancias. Los precios, dirección, teléfono, horarios, reseñas y textos legales iniciales son de demostración; personalizarlos antes de atender clientes. Las imágenes y el logo se extrajeron del HTML proporcionado y se usan como ilustraciones.

Los pagos en línea son simulados; no existe una integración bancaria ni una pasarela. Elegir pago online no marca el pedido como pagado: se requiere confirmación manual al entregar. Tarjeta en caja es únicamente el registro de un cobro realizado fuera del sistema. La navegación abre Google Maps; no hay seguimiento GPS de la ubicación del repartidor.

## Verificación

```sh
python check.py
```

19 pruebas del servidor sobre datos temporales y 8 del cliente con red simulada, más sintaxis JS y JSON-LD. La verificación requiere Python y Node; no instala paquetes. Incluye pedidos, entrega, cancelaciones, permisos, dinero decimal, concurrencia, persistencia, privacidad y recuperación ante fallos de red. El detalle de la revisión actual está en el informe de avances. Las pruebas de navegador usan una base separada y no añaden ventas a la base principal.

## Revisión responsive y app de reparto

Reparto tiene interfaz propia con navegación inferior, disponibilidad, ofertas, entrega activa, confirmación explícita de cobro, ganancias, historial y cuenta. No representa seguimiento GPS: la navegación se abre en Maps. Caja ofrece ticket desplegable desde una barra inferior en móvil. Se midieron las cuatro rutas a 320, 390, 768 y 1440 px sin desbordamiento horizontal, y se probaron entrega y cobro móvil sobre la base de pruebas.

## Dirección visual: El ritual del pan

Rediseño editorial con Plus Jakarta Sans y Cormorant Garamond locales, tarjetas con superficies anidadas y acentos terracota/cacao. La landing organiza selección, oficio, formas de pedir, visita, preguntas y cierre; se retiraron reseñas ficticias. Las operaciones mantienen la interfaz de caja, panel de administración y app de reparto. Detalles y licencias: ASSETS.md.

GSAP y ScrollTrigger presentan la landing; Lenis es el único motor de scroll suave y no se activa con puntero táctil o movimiento reducido. Diálogos nativos con transiciones cortas y respuesta inmediata al teclado. Sin Three.js.

Validación de esta revisión: las cuatro rutas a 320, 390, 768 y 1440 px sin desbordamiento; detalle, bolsa y venta móvil de $38 con $100 recibidos y $62 de cambio; 14 pruebas del servidor. El navegador de pruebas dejó de responder durante la comprobación final de movimiento reducido y sin JavaScript; esa comprobación visual no se dio por completada. Los datos principales no se usaron para las operaciones de prueba.
