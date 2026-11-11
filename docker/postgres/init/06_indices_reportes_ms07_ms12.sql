-- =============================================================
-- MS-07 / MS-12 | Índices para consultas pesadas de reportes
-- Base de datos: tiendata
-- Rama: feature/MS-07-MS-12-devops
-- =============================================================

-- -------------------------------------------------------
-- OBJETIVO 5: Optimizar consultas pesadas
-- Los reportes de exportación usan las vistas:
--   - vista_movimientos_export
--   - vista_productos_export
-- y la tabla exportaciones_reportes
-- -------------------------------------------------------

-- -------------------------------------------------------
-- ÍNDICES PARA REPORTES DE MOVIMIENTOS (MS-07)
-- La vista vista_movimientos_export hace JOIN entre:
--   movimientos_inventario + productos + usuarios +
--   motivos_movimiento + proveedores
-- -------------------------------------------------------

-- Índice compuesto para filtros por fecha + producto (reporte de movimientos)
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha_producto
    ON public.movimientos_inventario (fecha_hora_exacta DESC, id_producto);

-- Índice para filtros por usuario en reportes de auditoría
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha
    ON public.movimientos_inventario (id_usuario, fecha_hora_exacta DESC);

-- Índice para filtros por tipo de operación via motivo
CREATE INDEX IF NOT EXISTS idx_motivos_tipo_operacion
    ON public.motivos_movimiento (tipo_operacion);

-- Índice para JOIN proveedores en reportes
CREATE INDEX IF NOT EXISTS idx_movimientos_proveedor
    ON public.movimientos_inventario (id_proveedor)
    WHERE id_proveedor IS NOT NULL;

-- -------------------------------------------------------
-- ÍNDICES PARA REPORTES DE PRODUCTOS (MS-07)
-- La vista vista_productos_export hace JOIN entre:
--   productos + categorias
-- -------------------------------------------------------

-- Índice para filtros por categoría en reportes de productos
CREATE INDEX IF NOT EXISTS idx_productos_categoria_estado
    ON public.productos (id_categoria, estado);

-- Índice para reportes de stock (bajo, crítico, alto)
CREATE INDEX IF NOT EXISTS idx_productos_stock_estado
    ON public.productos (stock_actual, stock_minimo, stock_maximo)
    WHERE estado = true;

-- Índice para reportes de vencimiento
CREATE INDEX IF NOT EXISTS idx_productos_vencimiento
    ON public.productos (fecha_vencimiento)
    WHERE fecha_vencimiento IS NOT NULL AND estado = true;

-- -------------------------------------------------------
-- ÍNDICES PARA TABLA exportaciones_reportes (MS-07)
-- Optimizan consultas de historial de exportaciones
-- -------------------------------------------------------

-- Índice para listar exportaciones por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_exportaciones_usuario_fecha
    ON public.exportaciones_reportes (usuario_generador, fecha_generacion DESC);

-- Índice para filtrar por tipo de reporte
CREATE INDEX IF NOT EXISTS idx_exportaciones_tipo
    ON public.exportaciones_reportes (tipo_reporte, fecha_generacion DESC);

-- Índice BRIN para fechas de exportación (tabla append-only)
CREATE INDEX IF NOT EXISTS idx_exportaciones_fecha_brin
    ON public.exportaciones_reportes USING BRIN (fecha_generacion);

-- -------------------------------------------------------
-- ÍNDICES PARA PROVEEDORES (MS-12)
-- Optimizan búsquedas y filtros en supplier-service
-- -------------------------------------------------------

-- Índice para búsqueda por nombre/razón social
CREATE INDEX IF NOT EXISTS idx_proveedores_razon_social_lower
    ON public.proveedores (LOWER(razon_social));

-- Índice para filtrar proveedores activos
CREATE INDEX IF NOT EXISTS idx_proveedores_estado
    ON public.proveedores (estado)
    WHERE estado = true;

-- Índice para búsqueda por NIT
CREATE INDEX IF NOT EXISTS idx_proveedores_nit
    ON public.proveedores (nit_identificacion);

-- -------------------------------------------------------
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- -------------------------------------------------------
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'movimientos_inventario',
    'productos',
    'exportaciones_reportes',
    'proveedores',
    'motivos_movimiento'
  )
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
