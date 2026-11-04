# TIENDATA — Sistema de Gestión y Control de Inventarios

Arquitectura de microservicios (Node.js + Express + PostgreSQL) con un API Gateway
único y un frontend en React (Vite).

## Componentes

| Componente | Puerto | Descripción |
|---|---|---|
| `frontend` | 5173 | React + Vite (proxy `/api` → gateway) |
| `api-gateway` | 3000 | Punto de entrada único, valida JWT y rol |
| `services/auth-service` (MS-01) | 3002 | Login, logout, refresh, verify |
| `services/user-service` (MS-02) | 3004 | Gestión de usuarios |
| demás `services/*` | 3001-3010 | Categorías, productos, inventario, auditoría, etc. |
| `postgres` | 5433 | PostgreSQL 16 (`tiendata`) |
| `shared` | — | Roles, respuestas, JWT, manejo de errores |

## Requisitos

- Docker Desktop (o Docker Engine + Docker Compose)
- Node.js 20+ para el frontend
- Puertos libres: `3000-3010`, `5433`, `5173`

## Levantar el entorno

Desde la raíz del repositorio:

```bash
docker compose up --build
```

En otra terminal, el frontend:

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 e ingresar con:

| Usuario | Correo | Contraseña |
|---|---|---|
| `admin` | `admin@tiendata.com` | `Admin1234` |

La base de datos se inicializa con los scripts de `docker/postgres/init/`
(en orden): `01_backup_tiendatabd.sql`, `02_parametros_sistema.sql`,
`03_auth_sesiones.sql`.

> PostgreSQL solo ejecuta esos scripts cuando el volumen está vacío.
> Para reinicializar: `docker compose down -v` y luego `docker compose up --build`.
>
> Si ya tenías un volumen creado antes de `03_auth_sesiones.sql`, aplicalo sin
> perder datos (es idempotente):
>
> ```bash
> docker exec -i tiendata-postgres psql -U postgres -d tiendata < docker/postgres/init/03_auth_sesiones.sql
> ```

## Verificar funcionamiento

```bash
# Health
curl http://localhost:3000/
curl http://localhost:3002/

# Login (con usuario o correo)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identificador":"admin","contrasena":"Admin1234"}'
```

Pruebas automáticas:

```bash
npm --prefix services/auth-service test   # MS-01
npm --prefix api-gateway test             # gateway
npm --prefix frontend test                # frontend (Vitest)
```

## Apagar

```bash
docker compose down        # conserva la BD
docker compose down -v     # borra también el volumen tiendata_pg_data
```

## Documentación técnica

- `docs/MS01_Autenticacion_Sesion.md` — funcionamiento actual del login y la sesión
- `docs/Backend_Entregable_MS01.md`
- `docs/QA_Guia_Verificacion_MS01_Gateway.md`
- `docs/Frontend_Integracion_MS01_Gateway.md`
- `docs/DOCKER.md`
- `MS-01_Reporte_Tecnico_Integracion.md`
