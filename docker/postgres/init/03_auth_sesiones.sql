--
-- MS-01 Autenticación y Sesión — soporte de login por usuario, bloqueo
-- temporal persistente y revocación de tokens persistente.
-- Se ejecuta después de 01_backup_tiendatabd.sql y 02_parametros_sistema.sql
--
-- El script es idempotente: puede ejecutarse sobre una BD ya inicializada
-- (volumen existente) sin perder datos:
--   docker exec -i tiendata-postgres psql -U postgres -d tiendata < docker/postgres/init/03_auth_sesiones.sql
--

-- 1) Nombre de usuario opcional para iniciar sesión (además del correo)
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS nombre_usuario character varying(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario_lower
    ON public.usuarios USING btree (lower((nombre_usuario)::text));

UPDATE public.usuarios
   SET nombre_usuario = 'admin'
 WHERE correo = 'admin@tiendata.com'
   AND nombre_usuario IS NULL;

-- 2) Fin del bloqueo temporal por intentos fallidos.
--    bloqueado = true  y bloqueo_hasta futuro -> bloqueo temporal vigente
--    bloqueado = true  y bloqueo_hasta NULL   -> bloqueo indefinido (manual)
--    Las versiones anteriores marcaban bloqueado = true sin guardar el fin
--    del bloqueo; esos bloqueos eran temporales, así que se liberan solo al
--    crear la columna (no en ejecuciones posteriores del script).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'usuarios'
           AND column_name = 'bloqueo_hasta'
    ) THEN
        ALTER TABLE public.usuarios
            ADD COLUMN bloqueo_hasta timestamp with time zone;

        UPDATE public.usuarios
           SET bloqueado = false,
               intentos_fallidos = 0
         WHERE bloqueado = true;
    END IF;
END $$;

-- 3) Tokens revocados (logout / refresh). Se identifican por el jti del JWT
--    y se conservan solo hasta su expiración.
CREATE TABLE IF NOT EXISTS public.tokens_revocados (
    jti         character varying(64) PRIMARY KEY,
    id_usuario  integer,
    revocado_en timestamp with time zone DEFAULT now() NOT NULL,
    expira_en   timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokens_revocados_expira_en
    ON public.tokens_revocados USING btree (expira_en);

ALTER TABLE public.tokens_revocados OWNER TO postgres;
