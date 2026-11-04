# TIENDATA — Backend MS-01

Implementación backend para **MS-01 Servicio de Autenticación y Sesión** con integración por API Gateway y utilidades compartidas.

## Componentes incluidos

- `services/auth-service` (login/logout/refresh/verify)
- `api-gateway` (pasarela para consumo de cliente web)
- `shared` (roles, respuestas, JWT, manejo de errores)
- `docker-compose.yml` para levantar entorno local con contenedores

## Requisitos

- Docker Desktop (o Docker Engine + Docker Compose)
- Puertos libres: `3000`, `3002`, `5433`

## Levantar entorno con Docker

Desde la raíz del repositorio:

```bash
docker compose up --build
```

La base de datos se inicializa automáticamente con el backup SQL ubicado en:

`docker/postgres/init/01_backup_tiendatabd.sql`

## Verificar funcionamiento

### 1) Health básico

```bash
curl http://localhost:3000/
curl http://localhost:3002/
```

### 2) Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombre_usuario":"admin","contrasena":"Admin1234"}'
```

### 3) Apagar contenedores

```bash
docker compose down
```

Para eliminar también volumen de base de datos:

```bash
docker compose down -v
```

> Importante: PostgreSQL solo ejecuta los scripts de `docker-entrypoint-initdb.d` cuando el volumen está vacío. Si querés reimportar el backup, usá `docker compose down -v` y luego `docker compose up --build`.

## Notas de alcance

- Este compose deja operativo el **backend MS-01 + gateway + PostgreSQL**.
- El `auth-service` actual funciona con repositorio en memoria para autenticación demo y deja preparada la configuración de base de datos para iteración siguiente.

## Documentación técnica

- `docs/Backend_Entregable_MS01.md`
- `docs/QA_Guia_Verificacion_MS01_Gateway.md`
- `docs/Frontend_Integracion_MS01_Gateway.md`
- `MS-01_Reporte_Tecnico_Integracion.md`
