-- =============================================================
-- MS-06 / MS-09 | Alertas de Stock + Trigger de generación
-- Base de datos: tiendata
-- Rama: feature/MS-06-MS-09-devops
-- =============================================================

-- -------------------------------------------------------
-- OBJETIVO 1: Tabla de alertas de stock
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alertas_stock (
    id_alerta       INTEGER NOT NULL,
    id_producto     INTEGER NOT NULL,
    tipo_alerta     CHARACTER VARYING(20) NOT NULL,
    stock_actual    INTEGER NOT NULL,
    stock_minimo    INTEGER,
    stock_maximo    INTEGER,
    mensaje         TEXT NOT NULL,
    resuelta        BOOLEAN DEFAULT false,
    fecha_alerta    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT alertas_stock_pkey PRIMARY KEY (id_alerta),
    CONSTRAINT alertas_stock_tipo_check CHECK (
        tipo_alerta IN ('STOCK_BAJO', 'STOCK_CRITICO', 'STOCK_ALTO', 'SIN_STOCK')
    ),
    CONSTRAINT alertas_stock_id_producto_fkey
        FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto)
);

-- Secuencia para id_alerta
CREATE SEQUENCE IF NOT EXISTS public.alertas_stock_id_alerta_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER TABLE public.alertas_stock
    ALTER COLUMN id_alerta
    SET DEFAULT nextval('public.alertas_stock_id_alerta_seq'::regclass);

ALTER SEQUENCE public.alertas_stock_id_alerta_seq
    OWNED BY public.alertas_stock.id_alerta;

-- -------------------------------------------------------
-- OBJETIVO 4: Índices para consultas eficientes de alertas
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_alertas_producto
    ON public.alertas_stock (id_producto);

CREATE INDEX IF NOT EXISTS idx_alertas_tipo
    ON public.alertas_stock (tipo_alerta);

CREATE INDEX IF NOT EXISTS idx_alertas_resuelta_fecha
    ON public.alertas_stock (resuelta, fecha_alerta DESC);

-- -------------------------------------------------------
-- OBJETIVO 2: Función del trigger de alertas de stock
-- Se ejecuta AFTER INSERT/UPDATE en movimientos_inventario
-- Evalúa el stock posterior y genera la alerta correspondiente
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_alerta_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock_actual  INTEGER;
    v_stock_minimo  INTEGER;
    v_stock_maximo  INTEGER;
    v_nombre        CHARACTER VARYING(150);
    v_tipo_alerta   CHARACTER VARYING(20);
    v_mensaje       TEXT;
BEGIN
    -- Obtener datos actuales del producto
    SELECT stock_actual, stock_minimo, stock_maximo, nombre
    INTO v_stock_actual, v_stock_minimo, v_stock_maximo, v_nombre
    FROM public.productos
    WHERE id_producto = NEW.id_producto;

    -- Determinar tipo de alerta según umbrales
    IF v_stock_actual = 0 THEN
        v_tipo_alerta := 'SIN_STOCK';
        v_mensaje := format(
            'SIN STOCK: El producto "%s" (ID: %s) tiene 0 unidades disponibles.',
            v_nombre, NEW.id_producto
        );

    ELSIF v_stock_minimo IS NOT NULL AND v_stock_actual <= ROUND(v_stock_minimo * 0.5) THEN
        v_tipo_alerta := 'STOCK_CRITICO';
        v_mensaje := format(
            'STOCK CRITICO: El producto "%s" (ID: %s) tiene %s unidades (50%% o menos del minimo de %s).',
            v_nombre, NEW.id_producto, v_stock_actual, v_stock_minimo
        );

    ELSIF v_stock_minimo IS NOT NULL AND v_stock_actual <= v_stock_minimo THEN
        v_tipo_alerta := 'STOCK_BAJO';
        v_mensaje := format(
            'STOCK BAJO: El producto "%s" (ID: %s) tiene %s unidades (minimo: %s).',
            v_nombre, NEW.id_producto, v_stock_actual, v_stock_minimo
        );

    ELSIF v_stock_maximo IS NOT NULL AND v_stock_actual >= v_stock_maximo THEN
        v_tipo_alerta := 'STOCK_ALTO';
        v_mensaje := format(
            'STOCK ALTO: El producto "%s" (ID: %s) tiene %s unidades (maximo: %s).',
            v_nombre, NEW.id_producto, v_stock_actual, v_stock_maximo
        );

    ELSE
        -- Stock normal: no generar alerta
        RETURN NEW;
    END IF;

    -- Insertar alerta solo si no existe una igual sin resolver
    INSERT INTO public.alertas_stock (
        id_producto,
        tipo_alerta,
        stock_actual,
        stock_minimo,
        stock_maximo,
        mensaje,
        resuelta,
        fecha_alerta
    )
    SELECT
        NEW.id_producto,
        v_tipo_alerta,
        v_stock_actual,
        v_stock_minimo,
        v_stock_maximo,
        v_mensaje,
        false,
        CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
        SELECT 1 FROM public.alertas_stock
        WHERE id_producto = NEW.id_producto
          AND tipo_alerta = v_tipo_alerta
          AND resuelta = false
    );

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.generar_alerta_stock() OWNER TO postgres;

-- -------------------------------------------------------
-- OBJETIVO 2: Asociar el trigger a movimientos_inventario
-- Se dispara AFTER INSERT (después de actualizar el stock)
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_generar_alerta_stock
    ON public.movimientos_inventario;

CREATE TRIGGER trigger_generar_alerta_stock
    AFTER INSERT ON public.movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION public.generar_alerta_stock();

-- -------------------------------------------------------
-- OBJETIVO 4: Índices adicionales para logs de auditoría
-- Mejoran rendimiento en consultas frecuentes por fecha,
-- módulo y usuario en tablas de auditoría
-- -------------------------------------------------------

-- Índice BRIN para fechas (muy eficiente en tablas append-only)
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_brin
    ON public.auditoria_operaciones USING BRIN (fecha_hora);

-- Índice para filtrar por entidad afectada
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad
    ON public.auditoria_operaciones (entidad_afectada, id_entidad_afectada);

-- Índice para el campo módulo (agregado por ensureSchema del audit-service)
-- CREATE INDEX IF NOT EXISTS idx_auditoria_modulo_fecha
--    ON public.auditoria_operaciones (modulo, fecha_hora DESC);

-- -------------------------------------------------------
-- VERIFICACIÓN
-- -------------------------------------------------------
SELECT
    'alertas_stock'           AS objeto,
    'tabla'                   AS tipo,
    'creada'                  AS estado
UNION ALL SELECT
    'trigger_generar_alerta_stock',
    'trigger',
    'creado'
UNION ALL SELECT
    'idx_alertas_producto',
    'indice',
    'creado'
UNION ALL SELECT
    'idx_auditoria_fecha_brin',
    'indice BRIN',
    'creado';
