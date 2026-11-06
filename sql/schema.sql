CREATE DATABASE IF NOT EXISTS Simple CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Simple;

CREATE TABLE IF NOT EXISTS usuarios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(120) NOT NULL,
 usuario VARCHAR(60) NOT NULL UNIQUE,
 correo VARCHAR(190) NULL,
 clave_hash VARCHAR(255) NOT NULL,
 rol ENUM('administrador','caja','cocina') NOT NULL DEFAULT 'caja',
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL,
 slug VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 categoria_id BIGINT UNSIGNED NOT NULL,
 nombre VARCHAR(190) NOT NULL UNIQUE,
 descripcion VARCHAR(500) NOT NULL DEFAULT '',
 precio DECIMAL(10,2) NOT NULL,
 imagen VARCHAR(350) NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
 CONSTRAINT chk_producto_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ingredientes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(120) NOT NULL,
 tipo ENUM('yogurt','fruta','topping') NOT NULL,
 precio_extra DECIMAL(10,2) NOT NULL DEFAULT 0,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE KEY uq_ingrediente_tipo (nombre,tipo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(140) NOT NULL,
 telefono VARCHAR(35) NULL,
 direccion VARCHAR(300) NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(30) UNIQUE NULL,
 canal ENUM('tienda','whatsapp','pedidosya') NOT NULL,
 entrega ENUM('tienda','recojo','delivery') NOT NULL DEFAULT 'tienda',
 cliente_id BIGINT UNSIGNED NULL,
 usuario_id BIGINT UNSIGNED NULL,
 estado ENUM('pendiente_pago','pendiente','aceptado','preparando','listo','despachado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
 referencia_externa VARCHAR(120) NULL,
 codigo_entrega VARCHAR(40) NULL,
 notas TEXT NULL,
 subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
 igv DECIMAL(10,2) NOT NULL DEFAULT 0,
 envio DECIMAL(10,2) NOT NULL DEFAULT 0,
 total DECIMAL(10,2) NOT NULL DEFAULT 0,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (cliente_id) REFERENCES clientes(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 KEY idx_pedido_estado_canal (estado,canal),
 KEY idx_pedido_creado (creado_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_pedidos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 pedido_id BIGINT UNSIGNED NOT NULL,
 producto_id BIGINT UNSIGNED NULL,
 nombre_producto VARCHAR(190) NOT NULL,
 cantidad INT UNSIGNED NOT NULL,
 precio_unitario DECIMAL(10,2) NOT NULL,
 total_linea DECIMAL(10,2) NOT NULL,
 personalizacion JSON NULL,
 nota VARCHAR(500) NULL,
 FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
 FOREIGN KEY (producto_id) REFERENCES productos(id),
 CHECK (cantidad > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 pedido_id BIGINT UNSIGNED NOT NULL,
 metodo ENUM('efectivo','tarjeta','yape','plin') NOT NULL,
 monto DECIMAL(10,2) NOT NULL,
 recibido DECIMAL(10,2) NULL,
 vuelto DECIMAL(10,2) NOT NULL DEFAULT 0,
 referencia VARCHAR(120) NULL,
 verificacion ENUM('manual') NOT NULL DEFAULT 'manual',
 estado ENUM('confirmado','rechazado') NOT NULL DEFAULT 'confirmado',
 registrado_por BIGINT UNSIGNED NOT NULL,
 registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
 FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
 UNIQUE KEY uq_pago_confirmado (pedido_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_estados (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 pedido_id BIGINT UNSIGNED NOT NULL,
 usuario_id BIGINT UNSIGNED NULL,
 estado_anterior VARCHAR(30) NULL,
 estado_nuevo VARCHAR(30) NOT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS banners (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 titulo VARCHAR(140) NOT NULL,
 imagen VARCHAR(350) NOT NULL,
 orden INT NOT NULL DEFAULT 0,
 activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;
