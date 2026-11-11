-- =============================================================
-- MS-07 / MS-12 | Seeds de datos para reportes y proveedores
-- Base de datos: tiendata
-- Rama: feature/MS-07-MS-12-devops
-- =============================================================

-- -------------------------------------------------------
-- OBJETIVO 4: Proveedores de prueba realistas (MS-12)
-- -------------------------------------------------------
INSERT INTO public.proveedores (razon_social, nit_identificacion, telefono, direccion, correo, estado)
VALUES
  ('Distribuidora Alimentos del Sur SAS',  '900111222-1', '3001112233', 'Calle 15 #8-42, Neiva',         'compras@alimentos-sur.com',    true),
  ('Bebidas y Refrescos Colombia Ltda',    '800222333-2', '3112223344', 'Carrera 7 #12-30, Bogota',       'ventas@bebidasrc.com',         true),
  ('Lacteos del Huila SAS',               '900333444-3', '3023334455', 'Vereda El Cedral, Pitalito',     'pedidos@lacteoshuila.com',     true),
  ('Distribuidora Nacional de Aseo SA',   '800444555-4', '6018887766', 'Zona Industrial Chia',           'comercial@disnalaseo.com',     true),
  ('Snacks & Go Colombia SAS',            '900555666-5', '3185556677', 'Av. El Dorado #68-50, Bogota',   'info@snacksgocol.com',         true),
  ('Panaderia y Reposteria La Estrella',  '900666777-6', '3076667788', 'Calle 8 #5-20, Garzon',          'pedidos@laestrella.com',       true),
  ('Importadora de Productos Inactiva',   '800777888-7', '3197778899', 'Calle 100 #50-30, Medellin',     'contacto@importadora.com',     false)
ON CONFLICT (nit_identificacion) DO NOTHING;

-- -------------------------------------------------------
-- OBJETIVO 4: Movimientos históricos para reportes de ventas
-- Simula 30 días de actividad comercial
-- Requiere: productos y motivos_movimiento existentes
-- -------------------------------------------------------

-- Movimientos del mes anterior (para reporte mensual)
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_proveedor, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    numero_factura, comentarios, fecha_hora_exacta
)
SELECT
    p.id_producto,
    u.id_usuario,
    pr.id_proveedor,
    m.id_motivo,
    v.cantidad,
    p.stock_actual,
    p.stock_actual + v.cantidad,
    v.factura,
    v.comentario,
    v.fecha
FROM (VALUES
    -- Entradas de compra (semana 1)
    (1, 50, 'FAC-001-2026', 'Compra inicial mes abril',     '2026-04-01 08:00:00'::timestamp),
    (2, 30, 'FAC-002-2026', 'Reposicion bebidas',           '2026-04-02 09:00:00'::timestamp),
    (3, 40, 'FAC-003-2026', 'Compra lacteos',               '2026-04-03 10:00:00'::timestamp),
    (1, 25, 'FAC-004-2026', 'Reposicion alimentos',         '2026-04-07 08:30:00'::timestamp),
    -- Entradas semana 2
    (2, 20, 'FAC-005-2026', 'Compra bebidas semana 2',      '2026-04-08 09:00:00'::timestamp),
    (3, 15, 'FAC-006-2026', 'Reposicion lacteos',           '2026-04-10 11:00:00'::timestamp),
    (1, 30, 'FAC-007-2026', 'Compra alimentos semana 2',    '2026-04-14 08:00:00'::timestamp),
    -- Entradas semana 3
    (2, 25, 'FAC-008-2026', 'Reposicion bebidas semana 3',  '2026-04-15 09:30:00'::timestamp),
    (3, 20, 'FAC-009-2026', 'Compra lacteos semana 3',      '2026-04-17 10:00:00'::timestamp),
    (1, 35, 'FAC-010-2026', 'Compra alimentos semana 3',    '2026-04-21 08:00:00'::timestamp),
    -- Entradas semana 4
    (2, 30, 'FAC-011-2026', 'Reposicion bebidas semana 4',  '2026-04-22 09:00:00'::timestamp),
    (3, 25, 'FAC-012-2026', 'Compra lacteos semana 4',      '2026-04-24 10:30:00'::timestamp),
    (1, 20, 'FAC-013-2026', 'Compra cierre mes abril',      '2026-04-28 08:00:00'::timestamp)
) AS v(id_prod, cantidad, factura, comentario, fecha)
JOIN public.productos p ON p.id_producto = v.id_prod
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.proveedores pr ON pr.nit_identificacion = '900111222-1'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Compra / Reposicion'
    AND m.tipo_operacion = 'ENTRADA'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Salidas por ventas (para reporte de ventas)
INSERT INTO public.movimientos_inventario (
    id_producto, id_usuario, id_motivo,
    cantidad, stock_anterior, stock_posterior,
    numero_factura, comentarios, fecha_hora_exacta
)
SELECT
    p.id_producto,
    u.id_usuario,
    m.id_motivo,
    v.cantidad,
    p.stock_actual + v.cantidad,
    p.stock_actual,
    v.factura,
    v.comentario,
    v.fecha
FROM (VALUES
    -- Ventas semana 1
    (1,  5, 'VTA-001-2026', 'Venta mostrador',      '2026-04-01 14:00:00'::timestamp),
    (2,  8, 'VTA-002-2026', 'Venta al por mayor',   '2026-04-02 15:00:00'::timestamp),
    (3,  3, 'VTA-003-2026', 'Venta mostrador',      '2026-04-03 16:00:00'::timestamp),
    (1, 10, 'VTA-004-2026', 'Venta domicilio',      '2026-04-04 10:00:00'::timestamp),
    (2,  6, 'VTA-005-2026', 'Venta mostrador',      '2026-04-05 11:00:00'::timestamp),
    -- Ventas semana 2
    (3,  4, 'VTA-006-2026', 'Venta al por mayor',   '2026-04-08 14:00:00'::timestamp),
    (1,  7, 'VTA-007-2026', 'Venta mostrador',      '2026-04-09 15:00:00'::timestamp),
    (2, 12, 'VTA-008-2026', 'Venta especial',        '2026-04-10 09:00:00'::timestamp),
    (3,  5, 'VTA-009-2026', 'Venta mostrador',      '2026-04-11 16:00:00'::timestamp),
    (1,  8, 'VTA-010-2026', 'Venta domicilio',      '2026-04-12 10:00:00'::timestamp),
    -- Ventas semana 3
    (2,  9, 'VTA-011-2026', 'Venta mostrador',      '2026-04-15 14:00:00'::timestamp),
    (3,  6, 'VTA-012-2026', 'Venta al por mayor',   '2026-04-16 15:00:00'::timestamp),
    (1, 11, 'VTA-013-2026', 'Venta especial',        '2026-04-17 09:00:00'::timestamp),
    (2,  7, 'VTA-014-2026', 'Venta mostrador',      '2026-04-18 16:00:00'::timestamp),
    (3,  4, 'VTA-015-2026', 'Venta domicilio',      '2026-04-19 10:00:00'::timestamp),
    -- Ventas semana 4
    (1,  9, 'VTA-016-2026', 'Venta mostrador',      '2026-04-22 14:00:00'::timestamp),
    (2, 10, 'VTA-017-2026', 'Venta al por mayor',   '2026-04-23 15:00:00'::timestamp),
    (3,  5, 'VTA-018-2026', 'Venta mostrador',      '2026-04-24 09:00:00'::timestamp),
    (1,  6, 'VTA-019-2026', 'Venta domicilio',      '2026-04-25 16:00:00'::timestamp),
    (2,  8, 'VTA-020-2026', 'Venta cierre mes',     '2026-04-30 11:00:00'::timestamp)
) AS v(id_prod, cantidad, factura, comentario, fecha)
JOIN public.productos p ON p.id_producto = v.id_prod
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com'
JOIN public.motivos_movimiento m ON m.nombre_motivo = 'Venta'
    AND m.tipo_operacion = 'SALIDA'
LIMIT 1
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- OBJETIVO 4: Registros de exportaciones generadas
-- Simula historial de reportes descargados
-- -------------------------------------------------------
INSERT INTO public.exportaciones_reportes (
    tipo_reporte, formato, fecha_generacion,
    usuario_generador, ruta_archivo
)
SELECT
    v.tipo,
    v.formato,
    v.fecha::timestamp,
    u.id_usuario,
    v.ruta
FROM (VALUES
    ('Reporte de Movimientos Abril 2026',  'PDF',   '2026-05-01 08:00:00', '/exports/reportes/movimientos_abril_2026.pdf'),
    ('Reporte de Ventas Abril 2026',       'EXCEL', '2026-05-01 08:30:00', '/exports/reportes/ventas_abril_2026.xlsx'),
    ('Inventario Actual Productos',        'PDF',   '2026-05-02 09:00:00', '/exports/reportes/inventario_02mayo_2026.pdf'),
    ('Reporte de Proveedores Activos',     'EXCEL', '2026-05-02 09:30:00', '/exports/reportes/proveedores_activos.xlsx'),
    ('Movimientos Semana 17-2026',         'PDF',   '2026-05-03 10:00:00', '/exports/reportes/movimientos_sem17.pdf'),
    ('Reporte Stock Bajo y Critico',       'EXCEL', '2026-05-04 11:00:00', '/exports/reportes/stock_critico_mayo.xlsx')
) AS v(tipo, formato, fecha, ruta)
JOIN public.usuarios u ON u.correo = 'admin@tiendata.com';

-- -------------------------------------------------------
-- VERIFICACIÓN FINAL
-- -------------------------------------------------------
SELECT
    'proveedores activos'        AS tabla,
    COUNT(*)                     AS registros
FROM public.proveedores
WHERE estado = true
UNION ALL SELECT
    'movimientos historicos',
    COUNT(*)
FROM public.movimientos_inventario
UNION ALL SELECT
    'exportaciones registradas',
    COUNT(*)
FROM public.exportaciones_reportes;

-- Resumen de movimientos por tipo para reporte
SELECT
    mm.tipo_operacion,
    COUNT(*)        AS total_movimientos,
    SUM(m.cantidad) AS unidades_totales
FROM public.movimientos_inventario m
JOIN public.motivos_movimiento mm ON mm.id_motivo = m.id_motivo
GROUP BY mm.tipo_operacion
ORDER BY mm.tipo_operacion;
