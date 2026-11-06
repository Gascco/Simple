# Simple Market Saludable — Node.js y MySQL

Esta rama convierte el prototipo HTML/CSS/JavaScript en una aplicación con API Express y datos MySQL. Se mantiene el diseño original de Caja, Login, Roles, Pago, Cocina y Pedidos de Caja; las pantallas originales de WhatsApp y PedidosYa conservan su HTML, tarjetas y modales de Figma mientras utilizan pedidos guardados en MySQL. Banners conserva el diseño original y permite marcar productos agotados.

## Requisitos
Node.js 20 o superior, MySQL 8 o superior, puerto 3000 disponible.

## Configuración
1. Clona esta rama: git clone -b feat/node-mysql-persistencia https://github.com/Gascco/Simple.git
2. Entra en la carpeta Simple.
3. Ejecuta npm install.
4. Copia .env.example a .env.
5. Configura DB_HOST=localhost, DB_PORT=3306, DB_NAME=Simple, DB_USER=root, DB_PASSWORD=123456 (solo en tu archivo local).
6. Configura ADMIN_USER=admin y ADMIN_PASSWORD con una contraseña de 8 o más caracteres. Se creará ese usuario si todavía no existe.
7. Configura SESSION_SECRET con una cadena aleatoria de al menos 32 caracteres.
8. Ejecuta npm run setup. Crea la base de datos y tablas, importa el catálogo original de 24 productos, el Parfait Personalizado y los ingredientes, y registra el administrador.
9. Ejecuta npm start.
10. Ingresa en http://localhost:3000/login.html (no uses Live Server ni abras archivos con file://).

Nota: .env está excluido mediante .gitignore. No subas contraseñas ni credenciales al repositorio.

## Funcionamiento
- Login: valida contraseña con bcrypt, sesión almacenada en MySQL y protección de rutas según rol.
- Roles: administrador puede acceder a Caja y Cocina; caja solo a Caja; cocina solo a Cocina.
- Caja: productos cargados de MySQL; al continuar se crea un pedido pendiente de pago.
- Pago: recibe el ID del pedido, consulta importes reales y conserva los modales originales. Efectivo se confirma desde el teclado numérico; tarjeta y Yape/Plin simulan el tiempo de espera, éxito automático y error al cancelar. Solo los cobros simulados exitosos quedan registrados en MySQL.
- Cocina: lista pedidos reales, inicia preparación y marca listo; actualización automática cada 10 segundos.
- Pedidos de caja: estados de espera, preparación, listo y entregado; historial y filtros; actualización cada 12 segundos.
- WhatsApp/PedidosYa: recuperan sus diseños originales; muestran pedidos de prueba precargados y permiten confirmar, modificar y despachar según su estado. No reciben mensajes ni órdenes automáticas de estas plataformas.
- Banners: se mantiene el panel original con 18 productos/ingredientes; haz clic sobre cada tarjeta para marcar Agotado o Disponible. La disponibilidad persiste en MySQL. /banners_tv.html muestra los mismos banners en modo pantalla, sin controles de edición.

## Principales endpoints
POST /api/auth/login; GET /api/auth/me; POST /api/auth/logout
GET /api/productos; GET /api/ingredientes
GET /api/pedidos; GET /api/pedidos/:id; POST /api/pedidos
PUT /api/pedidos/:id/items; PATCH /api/pedidos/:id/estado; POST /api/pedidos/:id/pago
GET /api/banners; GET /api/banners/disponibilidad; PUT /api/banners/disponibilidad
PATCH /api/productos/:id; GET /api/usuarios; POST /api/usuarios

## Secuencia de prueba
1. Ejecuta npm run setup y npm start; inicia sesión con admin.
2. En Caja agrega productos, presiona Continuar Compra, paga en efectivo y verifica pedidos, detalle_pedidos, pagos e historial_estados en phpMyAdmin.
3. En Cocina inicia preparación y después marca como listo.
4. En Pedidos marca el pedido como entregado y revisa Historial.
5. Crea un pedido manual en WhatsApp o PedidosYa, acéptalo y verifica que aparezca en Cocina.
6. Cierra sesión y comprueba que no puedes abrir /caja.html directamente.

## Limitaciones y seguridad
Los pagos de tarjeta, Yape y Plin se simulan únicamente para el curso, sin integración bancaria. El backend admite registros simulados solo cuando NODE_ENV no es production. No se emiten comprobantes electrónicos SUNAT. Para producción, agregar integración de pagos, documentación fiscal, HTTPS, auditoría de operaciones, respaldos, controles CSRF adicionales y pruebas end-to-end.

**No se ha comprobado una conexión a tu servidor MySQL local desde este entorno.** Debes ejecutar instalación y pruebas en tu equipo.

## Actualización desde una instalación anterior de esta rama

Si ya clonaste el proyecto, ejecuta en PowerShell desde la carpeta Simple:

```powershell
git pull origin feat/node-mysql-persistencia
npm run setup
npm start
```

La inicialización **no borra pedidos existentes** y añade solo los ejemplos que falten (identificados por DEMO-SIMPLE). Incluye 10 pedidos de muestra repartidos entre Tienda, WhatsApp y PedidosYa en estados distintos, además de 18 tarjetas de banner inicializadas según los estados del diseño original. No debes eliminar tu archivo local .env.

Para un televisor inicia sesión como usuario autorizado y abre /banners_tv.html; puedes usar F11 para pantalla completa.

## Simulación de pagos para el curso

La pantalla de Pago mantiene los modales de espera de tarjeta y Yape/Plin. Tras unos 10 segundos se muestra el éxito y se registra un pago simulado en MySQL. Al pulsar Cancelar se muestra el modal de error y el pedido sigue pendiente de pago. El efectivo también se guarda una sola vez después de confirmar. No existe una pasarela de cobro real.

La boleta de Caja se corrigió para que agregar varias unidades o productos distintos no cause un error cuando se elimina temporalmente el mensaje del carrito vacío.

## Cocina y Pedidos de Caja — diseño original

Las dos pantallas conservan sus columnas y clases CSS originales. Las tarjetas se generan desde MySQL dentro de las columnas existentes, sin reemplazar el diseño. Al pulsar una tarjeta, Cocina muestra su vista original de receta y Pedidos de Caja abre un detalle con imágenes de yogur, frutas y toppings; se visualizan separadamente todos los productos del pedido. Las recetas para productos estándar usan los ingredientes descritos en el catálogo; las personalizaciones usan el JSON almacenado en detalle_pedidos.

Los pedidos pendientes de aceptación de WhatsApp y PedidosYa se muestran solo en «En Espera» de Caja. Cocina **no muestra** pedidos con estado pendiente: aparecen allí una vez aceptados. Los estados de Cocina son aceptado → En Espera, preparando → En Preparación y listo → Listo. Se incluyen estilos para garantizar textos de al menos 14 px.

Para comprobar estados, recetas y estructura, ejecuta `npm test` después de `npm install`. Estas pruebas no reemplazan la validación visual en el navegador.
