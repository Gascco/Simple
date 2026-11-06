# Simple Market Saludable — Node.js y MySQL

Esta rama convierte el prototipo HTML/CSS/JavaScript en una aplicación con API Express y datos MySQL. Se mantiene el diseño original de Caja, Login, Roles, Pago, Cocina y Pedidos de Caja; las pantallas de WhatsApp y PedidosYa usan un editor de pedidos manuales conectado a MySQL, y Banners dispone de su propia administración.

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
- Pago: recibe el ID del pedido, consulta importes reales y registra efectivo, recibido y vuelto en MySQL. Tarjeta/Yape/Plin no son procesados automáticamente: exigen verificación manual del cobro y referencia.
- Cocina: lista pedidos reales, inicia preparación y marca listo; actualización automática cada 10 segundos.
- Pedidos de caja: estados de espera, preparación, listo y entregado; historial y filtros; actualización cada 12 segundos.
- WhatsApp/PedidosYa: alta y edición manual de pedidos con cliente, dirección, productos y personalizaciones. No reciben mensajes ni órdenes automáticas de estas plataformas.
- Banners: consulta, alta y visibilidad en MySQL; altas y modificaciones requieren rol administrador.

## Principales endpoints
POST /api/auth/login; GET /api/auth/me; POST /api/auth/logout
GET /api/productos; GET /api/ingredientes
GET /api/pedidos; GET /api/pedidos/:id; POST /api/pedidos
PUT /api/pedidos/:id/items; PATCH /api/pedidos/:id/estado; POST /api/pedidos/:id/pago
GET /api/banners; POST /api/banners; PATCH /api/banners/:id
PATCH /api/productos/:id; GET /api/usuarios; POST /api/usuarios

## Secuencia de prueba
1. Ejecuta npm run setup y npm start; inicia sesión con admin.
2. En Caja agrega productos, presiona Continuar Compra, paga en efectivo y verifica pedidos, detalle_pedidos, pagos e historial_estados en phpMyAdmin.
3. En Cocina inicia preparación y después marca como listo.
4. En Pedidos marca el pedido como entregado y revisa Historial.
5. Crea un pedido manual en WhatsApp o PedidosYa, acéptalo y verifica que aparezca en Cocina.
6. Cierra sesión y comprueba que no puedes abrir /caja.html directamente.

## Limitaciones y seguridad
No se procesan tarjetas, Yape ni Plin directamente; el registro de un pago externo requiere confirmar previamente el cobro real. No se emiten comprobantes electrónicos SUNAT. Para producción, agregar integración de pagos, documentación fiscal, HTTPS, auditoría de operaciones, respaldos, controles CSRF adicionales y pruebas end-to-end.

**No se ha comprobado una conexión a tu servidor MySQL local desde este entorno.** Debes ejecutar instalación y pruebas en tu equipo.
