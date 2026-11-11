# Guía Docker — TIENDATA Backend MS-01

## Objetivo

Levantar un entorno reproducible para backend usando contenedores:

- API Gateway
- Auth Service (MS-01)
- PostgreSQL

## Servicios definidos

### `api-gateway`
- Puerto host: `3000`
- Dependencia: `auth-service`
- Variable clave: `AUTH_SERVICE_URL=http://auth-service:3002`

### `auth-service`
- Puerto host: `3002`
- Dependencia: `postgres`
- Variables JWT y credenciales demo incluidas en compose para entorno local

### `postgres`
- Imagen: `postgres:16-alpine`
- Puerto host: `5433` (interno del contenedor: `5432`)
- Volumen persistente: `tiendata_pg_data`
- Inicialización automática con backup: `docker/postgres/init/01_backup_tiendatabd.sql`

## Inicialización de base de datos desde backup

El servicio PostgreSQL ejecuta automáticamente los scripts ubicados en:

`/docker-entrypoint-initdb.d`

En este proyecto se monta:

`./docker/postgres/init:/docker-entrypoint-initdb.d:ro`

Por eso el backup SQL se importa en el primer arranque del contenedor (cuando el volumen de datos está vacío).

## Comandos

### Construir y levantar

```bash
docker compose up --build
```

### Levantar en background

```bash
docker compose up -d --build
```

### Ver logs

```bash
docker compose logs -f
```

### Detener entorno

```bash
docker compose down
```

### Detener y borrar datos de PostgreSQL

```bash
docker compose down -v
```

Luego, para recrear e importar nuevamente el backup:

```bash
docker compose up --build
```

## Prueba rápida de integración

1. Login por gateway:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identificador":"admin","contrasena":"Admin1234"}'
```

2. Copiar el `token` de la respuesta y validar:

```bash
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer <TOKEN>"
```

## Consideraciones

- `.env` reales no se versionan.
- Para producción, mover secretos a gestor seguro y no dejar credenciales por defecto.
- El auth-service usa PostgreSQL para usuarios, bloqueos y tokens revocados
  (requiere `docker/postgres/init/03_auth_sesiones.sql`).
- `JWT_SECRET` es obligatorio con `NODE_ENV=production`.
- El gateway limita los logins fallidos por IP con `LOGIN_MAX_FALLOS_POR_IP`
  (20) y `LOGIN_VENTANA_MINUTOS` (15).

## Solución de problemas

### 1) Error de puerto PostgreSQL ocupado

Si `5432` está ocupado por otro servicio local, este proyecto expone PostgreSQL en `5433` del host.

### 2) El backup no se reimporta

La importación de scripts ocurre solo en inicialización. Ejecutar:

```bash
docker compose down -v
docker compose up --build
```

### 3) Compatibilidad del dump

El backup recibido fue generado en PostgreSQL 18 y se ajustó para ejecutarse en imagen PostgreSQL 16 del proyecto.
También se usa el usuario `postgres` en el contenedor para mantener compatibilidad con sentencias `OWNER TO postgres` presentes en el dump.
