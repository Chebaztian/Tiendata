-- =============================================================
-- MS-06 / MS-09 | Seeds de prueba — Escenarios de stock
-- Base de datos: tiendata
-- Rama: feature/MS-06-MS-09-devops
-- Requiere: 04_alertas_stock_trigger.sql ejecutado antes
-- =============================================================

-- -------------------------------------------------------
-- OBJETIVO 3: Insertar categorías y productos con
-- diferentes escenarios de stock para pruebas
-- -------------------------------------------------------

-- Categoría de prueba
INSERT INTO public.categorias (nombre_categoria, descripcion, estado)
VALUES ('Pruebas MS06', 'Categoria para escenarios de prueba de alertas', true)
ON CONFLICT (nombre_categoria) DO NOTHING;

-- -------------------------------------------------------
-- ESCENARIO 1 — STOCK NORMAL (sin alerta)
-- stock_actual > stock_minimo y < stock_maximo
-- -------------------------------------------------------
INSERT INTO public.productos (
    id_categoria, codigo_barras_unico, nombre,
    precio_compra, precio_venta,
    stock_actual, stock_minimo, stock_maximo,
    estado, ubicacion, descripcion
)
VALUES (
    (SELECT id_categoria FROM public.categorias WHERE nombre_categoria = 'Pruebas MS06'),
    'TEST-NORMAL-001', 'Producto Stock Normal',
    5000.00, 8000.00,
    50, 10, 100,
    true, 'Bodega TEST', 'Escenario: stock normal, sin alertas esperadas'
)
ON CONFLICT (codigo_barras_unico) DO NOTHING;

-- -------------------------------------------------------
-- ESCENARIO 2 — STOCK BAJO (stock_actual <= stock_minimo)
-- Debe generar alerta tipo STOCK_BAJO
-- -------------------------------------------------------
INSERT INTO public.productos (
    id_categoria, codigo_barras_unico, nombre,
    precio_compra, precio_venta,
    stock_actual, stock_minimo, stock_maximo,
    estado, ubicacion, descripcion
)
VALUES (
    (SELECT id_categoria FROM public.categorias WHERE nombre_categoria = 'Pruebas MS06'),
    'TEST-BAJO-002', 'Producto Stock Bajo',
    5000.00, 8000.00,
    10, 10, 100,
    true, 'Bodega TEST', 'Escenario: stock igual al minimo, alerta STOCK_BAJO esperada'
)
ON CONFLICT (codigo_barras_unico) DO NOTHING;

-- -------------------------------------------------------
-- ESCENARIO 3 — STOCK CRÍTICO (stock_actual <= 50% del mínimo)
-- Debe generar alerta tipo STOCK_CRITICO
-- -------------------------------------------------------
INSERT INTO public.productos (
    id_categoria, codigo_barras_unico, nombre,
    precio_compra, precio_venta,
    stock_actual, stock_minimo, stock_maximo,
    estado, ubicacion, descripcion
)
VALUES (
    (SELECT id_categoria FROM public.categorias WHERE nombre_categoria = 'Pruebas MS06'),
    'TEST-CRITICO-003', 'Producto Stock Critico',
    5000.00, 8000.00,
    4, 10, 100,
    true, 'Bodega TEST', 'Escenario: stock al 40% del minimo, alerta STOCK_CRITICO esperada'
)
ON CONFLICT (codigo_barras_unico) DO NOTHING;

-- -------------------------------------------------------
-- ESCENARIO 4 — SIN STOCK (stock_actual = 0)
-- Debe generar alerta tipo SIN_STOCK
-- -------------------------------------------------------
INSERT INTO public.productos (
    id_categoria, codigo_barras_unico, nombre,
    precio_compra, precio_venta,
    stock_actual, stock_minimo, stock_maximo,
    estado, ubicacion, descripcion
)
VALUES (
    (SELECT id_categoria FROM public.categorias WHERE nombre_categoria = 'Pruebas MS06'),
    'TEST-CERO-004', 'Producto Sin Stock',
    5000.00, 8000.00,
    0, 10, 100,
    true, 'Bodega TEST', 'Escenario: sin stock, alerta SIN_STOCK esperada'
)
ON CONFLICT (codigo_barras_unico) DO NOTHING;

-- -------------------------------------------------------
-- ESCENARIO 5 — STOCK ALTO (stock_actual >= stock_maximo)
-- Debe generar alerta tipo STOCK_ALTO
-- -------------------------------------------------------
INSERT INTO public.productos (
    id_categoria, codigo_barras_unico, nombre,
    precio_compra, precio_venta,
    stock_actual, stock_minimo, stock_maximo,
    estado, ubicacion, descripcion
)
VALUES (
    (SELECT id_categoria FROM public.categorias WHERE nombre_categoria = 'Pruebas MS06'),
    'TEST-ALTO-005', 'Producto Stock Alto',
    5000.00, 8000.00,
    100, 10, 100,
    true, 'Bodega TEST', 'Escenario: stock igual al maximo, alerta STOCK_ALTO esperada'
)
ON CONFLICT (codigo_barras_unico) DO NOTHING;

-- -------------------------------------------------------
-- Proveedor de prueba para movimientos
-- -------------------------------------------------------
INSERT INTO public.proveedores (razon_social, nit_identificacion, telefono, direccion, correo, estado)
VALUES ('Proveedor Pruebas MS06', '999888777-0', '3009998877', 'Calle Test #1', 'pruebas@ms06.com', true)
ON CONFLICT (nit_identificacion) DO NOTHING;

-- -------------------------------------------------------
-- DISPARAR ALERTAS: insertar movimientos de prueba
-- El trigger generar_alerta_stock se ejecuta AFTER INSERT
-- en movimientos_inventario y genera las alertas automáticamente
-- -------------------------------------------------------

-- Movimiento para producto STOCK_BAJO (entrada mínima para que quede en stock_minimo)
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_proveedor, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    comentarios
)
SELECT
    p.id_producto,
    u.id_usuario,
    pr.id_proveedor,
    m.id_motivo,
    1,
    p.stock_actual,
    p.stock_actual,
    'Movimiento de prueba — escenario STOCK_BAJO'
FROM public.productos p
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.proveedores pr ON pr.nit_identificacion = '999888777-0'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Ajuste sobrante'
WHERE p.codigo_barras_unico = 'TEST-BAJO-002'
LIMIT 1;

-- Movimiento para producto STOCK_CRITICO
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_proveedor, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    comentarios
)
SELECT
    p.id_producto,
    u.id_usuario,
    pr.id_proveedor,
    m.id_motivo,
    1,
    p.stock_actual,
    p.stock_actual,
    'Movimiento de prueba — escenario STOCK_CRITICO'
FROM public.productos p
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.proveedores pr ON pr.nit_identificacion = '999888777-0'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Ajuste sobrante'
WHERE p.codigo_barras_unico = 'TEST-CRITICO-003'
LIMIT 1;

-- Movimiento para producto SIN_STOCK
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_proveedor, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    comentarios
)
SELECT
    p.id_producto,
    u.id_usuario,
    pr.id_proveedor,
    m.id_motivo,
    1,
    p.stock_actual,
    p.stock_actual,
    'Movimiento de prueba — escenario SIN_STOCK'
FROM public.productos p
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.proveedores pr ON pr.nit_identificacion = '999888777-0'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Ajuste sobrante'
WHERE p.codigo_barras_unico = 'TEST-CERO-004'
LIMIT 1;

-- Movimiento para producto STOCK_ALTO
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_proveedor, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    comentarios
)
SELECT
    p.id_producto,
    u.id_usuario,
    pr.id_proveedor,
    m.id_motivo,
    1,
    p.stock_actual,
    p.stock_actual,
    'Movimiento de prueba — escenario STOCK_ALTO'
FROM public.productos p
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.proveedores pr ON pr.nit_identificacion = '999888777-0'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Ajuste sobrante'
WHERE p.codigo_barras_unico = 'TEST-ALTO-005'
LIMIT 1;

-- -------------------------------------------------------
-- SEEDS DE AUDITORÍA: registros de prueba en audit log
-- -------------------------------------------------------
INSERT INTO public.acciones_auditoria (nombre_accion)
VALUES
    ('login'),
    ('logout'),
    ('crear'),
    ('actualizar'),
    ('eliminar'),
    ('consultar')
ON CONFLICT (nombre_accion) DO NOTHING;

-- -------------------------------------------------------
-- VERIFICACIÓN FINAL
-- -------------------------------------------------------
SELECT
    'categorias prueba'   AS tabla,
    COUNT(*)              AS registros
FROM public.categorias
WHERE nombre_categoria = 'Pruebas MS06'

UNION ALL SELECT
    'productos prueba',
    COUNT(*)
FROM public.productos
WHERE codigo_barras_unico LIKE 'TEST-%'

UNION ALL SELECT
    'alertas generadas',
    COUNT(*)
FROM public.alertas_stock

UNION ALL SELECT
    'acciones auditoria',
    COUNT(*)
FROM public.acciones_auditoria;

-- Ver detalle de alertas generadas por los triggers
SELECT
    a.tipo_alerta,
    p.nombre         AS producto,
    a.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    a.mensaje,
    a.resuelta,
    a.fecha_alerta
FROM public.alertas_stock a
JOIN public.productos p ON p.id_producto = a.id_producto
ORDER BY a.fecha_alerta DESC;
