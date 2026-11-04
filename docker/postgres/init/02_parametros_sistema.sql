--
-- Tabla de parámetros del sistema (clave-valor)
-- Creada para MS-11 Config Service
-- Se ejecuta después de 01_backup_tiendatabd.sql
--

-- NOTA: PostgreSQL solo ejecuta los scripts en docker-entrypoint-initdb.d
-- cuando el volumen de datos está vacío (primera inicialización).
-- Para recargar después de la primera ejecución, eliminar el volumen:
--   docker compose down -v && docker compose up -d

CREATE TABLE IF NOT EXISTS public.parametros_sistema (
    clave       TEXT PRIMARY KEY,
    valor       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.parametros_sistema OWNER TO postgres;

-- Datos semilla: valores por defecto del sistema
INSERT INTO public.parametros_sistema (clave, valor) VALUES
    ('dias_expiracion_alertas', '30'),
    ('max_intentos_login', '3'),
    ('tiempo_bloqueo_minutos', '15')
ON CONFLICT (clave) DO NOTHING;
