# El Horno — fuentes y decisiones del diseño

Dirección: «El ritual del pan». Tipografía editorial en tienda y sans en las operaciones; crema, cacao y terracota. Se conservan la marca, las fotografías ilustrativas y las funciones del sistema existente. No se usan reseñas ficticias ni fotografías de personas presentadas como clientes.

- `assets/products.png`, `logo.jpeg`, `store.jpeg`: material incluido en el HTML proporcionado por el usuario. Fotografías ilustrativas, identificadas como tales. Se conservó su procedencia; no se afirma que sean fotos reales de la tienda o sus productos.
- `assets/fonts/`: Plus Jakarta Sans y Cormorant Garamond, descargadas de Google Fonts y servidas localmente. Licencias OFL conservadas.
- `assets/icons/`: Solar via Iconify. SVG originales de la biblioteca, sin trazos dibujados por el agente; paquete y versión en SOURCES.txt.
- `assets/vendor/`: GSAP, ScrollTrigger y Lenis descargados del registro oficial npm. Versiones y archivos de licencia junto al código. No se cargan desde CDN al abrir el sitio.

## Movimiento

GSAP y ScrollTrigger solo en la landing: presentación por transformaciones y entrada discreta de títulos. Lenis es el único motor de scroll suave, solo para ratón; no se utiliza Locomotive. Diálogos, tablas y categorías quedan fuera del scroll suave. El modo de movimiento reducido destruye Lenis y los contextos de GSAP y restaura los títulos originales; la salida de la página libera observadores y ticker. Se mantienen la primera imagen y las llamadas a la acción utilizables desde el primer fotograma.

Los diálogos nativos tienen entrada/salida breve por CSS para dar continuidad espacial. Con teclado y movimiento reducido el cambio es inmediato. No se animan números, inventario ni listas que se actualizan durante las operaciones de caja o reparto. No hay Three.js ni WebGL: no aportan información para elegir o comprar pan.

## Herramientas de diseño

Se aplicaron High End Visual Design, Awwwards Quality Sites, Building Animations, Creative Strategy y Typography Director. Se comprobó Superdesign CLI 0.14.0, pero no hay sesión autenticada; no se creó ni se atribuye un lienzo remoto de Superdesign.
