# Guía Docker — TIENDATA

> El paso a paso para arrancar el proyecto está en el `README.md`. Este
> documento describe cómo están armados los contenedores.

## Contenedores

`docker-compose.yml` define el proyecto `tiendata` con 12 contenedores:

| Servicio | Contenedor | Puerto host → contenedor | Construcción |
|---|---|---|---|
| `postgres` | `tiendata-postgres` | 5433 → 5432 | imagen `postgres:16-alpine` |
| `auth-service` | `tiendata-auth-service` | 3002 | `services/auth-service` |
| `user-service` | `tiendata-user-service` | 3004 | `services/user-service` |
| `product-service` | `tiendata-product-service` | 3001 | raíz + `services/product-service/Dockerfile` |
| `category-service` | `tiendata-category-service` | 3003 | raíz + `services/category-service/Dockerfile` |
| `inventory-service` | `tiendata-inventory-service` | 3005 | raíz + `services/inventory-service/Dockerfile` |
| `audit-service` | `tiendata-audit-service` | 3006 | raíz + `services/audit-service/Dockerfile` |
| `export-service` | `tiendata-export-service` | 3007 | raíz + `services/export-service/Dockerfile` |
| `supplier-service` | `tiendata-supplier-service` | 3008 | raíz + `services/supplier-service/Dockerfile` |
| `config-service` | `tiendata-config-service` | 3009 | raíz + `services/config-service/Dockerfile` |
| `barcode-service` | `tiendata-barcode-service` | 3010 | raíz + `services/barcode-service/Dockerfile` |
| `api-gateway` | `tiendata-api-gateway` | 3000 | raíz + `api-gateway/Dockerfile` |

- Los servicios que se construyen desde la raíz copian también `shared/`. El
  `.dockerignore` de la raíz excluye `node_modules`, `frontend`, `.git` y los
  `.env` para que la construcción sea rápida y no copie secretos.
- Todos los microservicios esperan a que `postgres` esté `healthy`
  (`pg_isready`) antes de arrancar.
- Dentro de la red de Docker los servicios se llaman por nombre
  (`http://auth-service:3002`, `postgres:5432`).

## Base de datos

- Volumen persistente: `tiendata_pg_data`.
- `./docker/postgres/init` se monta en `/docker-entrypoint-initdb.d`: los
  scripts `01` a `07` se ejecutan en orden **solo** cuando el volumen está
  vacío. Para recrear la BD: `docker compose down -v` y `docker compose up -d --build`.
- Conexión desde el host (p. ej. pgAdmin o DBeaver): `localhost:5433`,
  usuario `postgres`, contraseña `tiendata`, base `tiendata`.
- El dump original se generó en PostgreSQL 18 y se ajustó para la imagen 16;
  se usa el usuario `postgres` por las sentencias `OWNER TO postgres`.

## Configuración relevante

| Variable | Servicio | Valor por defecto |
|---|---|---|
| `JWT_SECRET` | auth-service | `tiendata-dev-secret` (obligatorio con `NODE_ENV=production`) |
| `JWT_EXPIRES_IN` | auth-service | `30m` |
| `LOGIN_MAX_FALLOS_POR_IP` / `LOGIN_VENTANA_MINUTOS` | api-gateway | `20` / `15` |
| `MS09_AUDIT_WEBHOOK_URL` | auth, user, inventory… | `http://audit-service:3006/api/audit/events` |

El máximo de intentos por cuenta y el tiempo de bloqueo se leen de la tabla
`parametros_sistema` (`max_intentos_login`, `tiempo_bloqueo_minutos`) y se
pueden cambiar desde la pantalla **Configuración**.

## Comandos útiles

```bash
docker compose up -d --build          # construir y levantar en segundo plano
docker compose ps                     # estado de los contenedores
docker compose logs -f api-gateway    # logs de un servicio
docker compose restart auth-service   # reiniciar un servicio
docker compose down                   # apagar (conserva datos)
docker compose down -v                # apagar y borrar la BD
docker exec -it tiendata-postgres psql -U postgres -d tiendata   # consola SQL
```
