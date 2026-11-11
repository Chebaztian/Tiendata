# TIENDATA — Sistema de Gestión y Control de Inventarios

Arquitectura de microservicios (Node.js + Express + PostgreSQL) con un API
Gateway único y un frontend en React (Vite).

| Componente | Puerto | Dónde corre |
|---|---|---|
| `frontend` (React + Vite) | 5173 | En tu PC, con `npm run dev` |
| `api-gateway` | 3000 | Docker |
| `product-service` (MS-04) | 3001 | Docker |
| `auth-service` (MS-01) | 3002 | Docker |
| `category-service` (MS-03) | 3003 | Docker |
| `user-service` (MS-02) | 3004 | Docker |
| `inventory-service` (MS-05/06) | 3005 | Docker |
| `audit-service` (MS-09) | 3006 | Docker |
| `export-service` (MS-07/12) | 3007 | Docker |
| `supplier-service` (MS-10) | 3008 | Docker |
| `config-service` (MS-11) | 3009 | Docker |
| `barcode-service` (MS-08) | 3010 | Docker |
| `postgres` (BD `tiendata`) | 5433 | Docker |

---

# Guía de arranque (Windows)

## 1. Requisitos

| Programa | Versión | Cómo comprobarlo |
|---|---|---|
| **Docker Desktop** (con WSL 2) | 4.x o superior | `docker --version` y `docker compose version` |
| **Node.js** | **20.19 o superior** (o 22.12+) | `node -v` |
| **Git** | cualquiera | `git --version` |

- Vite 8 **no funciona con Node 20.18 o anterior**. Si `node -v` muestra una
  versión menor, instala la LTS desde https://nodejs.org.
- Docker Desktop necesita unos **4 GB de RAM** libres y **3 GB de disco** para
  las imágenes.
- La **primera vez** se necesita internet (descarga de imágenes y paquetes npm).
  Después, el proyecto arranca sin conexión.

## 2. Antes de arrancar

1. **Abre Docker Desktop** y espera a que diga *Engine running*.
2. **Libera los puertos.** Si tienes otros proyectos con contenedores
   (PostgreSQL, APIs…), apágalos. Para ver qué está corriendo:

   ```bash
   docker ps
   ```

   Para comprobar un puerto concreto en PowerShell:

   ```powershell
   netstat -ano | findstr ":5433 :3000 :5173"
   ```

   Si no aparece nada, están libres.

## 3. Obtener el código

```bash
git clone https://github.com/Chebaztian/tiendata.git
cd tiendata
```

Si ya lo tienes clonado, actualiza la rama `main`:

```bash
git checkout main
git pull
```

## 4. Levantar el backend (Docker)

Desde la raíz del proyecto (`tiendata`):

```bash
docker compose up -d --build
```

- La primera vez tarda **5-10 minutos**: descarga `node:20-alpine` y
  `postgres:16-alpine` y construye 11 imágenes. Las siguientes, segundos.
- `-d` deja los contenedores en segundo plano y libera la terminal.

Comprueba que todo quedó arriba:

```bash
docker compose ps
```

Deben aparecer **12 contenedores** `tiendata-*` en estado `running`, y
`tiendata-postgres` como `healthy`.

En el primer arranque PostgreSQL crea la base de datos con los scripts de
`docker/postgres/init/`, en orden:

| Script | Contenido |
|---|---|
| `01_backup_tiendatabd.sql` | Tablas, roles y usuario administrador |
| `02_parametros_sistema.sql` | Parámetros (intentos de login, bloqueo, alertas) |
| `03_auth_sesiones.sql` | Nombre de usuario, bloqueo persistente, tokens revocados |
| `04_alertas_stock_trigger.sql` | Trigger de alertas de stock |
| `05_seed_escenarios_prueba.sql` | Productos de prueba (stock normal, bajo, crítico, alto, sin stock) |
| `06_indices_reportes_ms07_ms12.sql` | Índices para reportes |
| `07_seed_reportes_proveedores.sql` | Proveedores y movimientos de ejemplo |

## 5. Levantar el frontend

En **otra terminal**, desde la raíz del proyecto:

```bash
cd frontend
npm ci
npm run dev
```

- `npm ci` solo hace falta la primera vez o cuando cambie `package-lock.json`.
- Al terminar verás `Local: http://localhost:5173/`. Deja esa terminal abierta.

## 6. Entrar

Abre **http://localhost:5173** e inicia sesión:

| Usuario | Correo | Contraseña | Rol |
|---|---|---|---|
| `admin` | `admin@tiendata.com` | `Admin1234` | Administrador |

Puedes escribir el nombre de usuario o el correo.

## 7. Comprobación rápida

En **Git Bash** (en PowerShell usa `curl.exe` en lugar de `curl`):

```bash
curl http://localhost:3000/
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"identificador\":\"admin\",\"contrasena\":\"Admin1234\"}"
```

El segundo comando debe devolver `"success":true` con un `token`.

En la aplicación, el **Inicio** debe mostrar 5 productos registrados y 2 en
stock bajo, y **Proveedores** debe listar los proveedores de ejemplo.

## 8. Apagar

```bash
docker compose down        # apaga y conserva los datos
docker compose down -v     # apaga y BORRA la base de datos (se recrea al volver a levantar)
```

En la terminal del frontend: `Ctrl + C`.

---

## Para la sustentación

**El día anterior** (con internet):

1. Haz todos los pasos de arriba al menos una vez, para que queden descargadas
   las imágenes de Docker y los paquetes del frontend.
2. Si quieres empezar con datos limpios, ejecuta `docker compose down -v` y
   luego `docker compose up -d --build`.

**El día de la presentación:**

1. Abre Docker Desktop y espera a *Engine running*.
2. `docker compose up -d` en la raíz (sin `--build`: ya están construidas).
3. `npm run dev` en `frontend`.
4. Abre http://localhost:5173.

Un guion de demostración de MS-01 (login, bloqueo, desbloqueo, sesión) está en
`docs/QA_Guia_Verificacion_MS01_Gateway.md`, sección 5.

---

## Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| `port is already allocated` / `address already in use` | Otro programa o contenedor usa ese puerto | `docker ps` y apaga el otro proyecto (`docker compose down` en su carpeta) |
| `Cannot connect to the Docker daemon` / `pipe/docker_engine` | Docker Desktop no está abierto | Ábrelo y espera a *Engine running* |
| Un contenedor queda en `Restarting` | Falló al arrancar | `docker compose logs <servicio>` (p. ej. `docker compose logs auth-service`) |
| El login responde 500 o "No se pudo conectar con el servidor" | El backend no terminó de arrancar | Espera unos segundos; revisa `docker compose ps` |
| Login: "Demasiados intentos fallidos desde esta red" | Límite de 20 fallos por IP en 15 min | Espera o reinicia el gateway: `docker compose restart api-gateway` |
| Cuenta `admin` bloqueada | 3 contraseñas erróneas seguidas | Espera 15 min, o desbloquea todas las cuentas: `docker exec tiendata-postgres psql -U postgres -d tiendata -c "UPDATE usuarios SET bloqueado=false, bloqueo_hasta=NULL, intentos_fallidos=0"` |
| `npm run dev` falla con un error de versión o de sintaxis | Node menor a 20.19 | Actualiza Node.js (`node -v`) |
| Faltan datos o tablas nuevas | El volumen de la BD es de antes de los scripts | `docker compose down -v` y `docker compose up -d --build` |
| Cambiaste código del backend y no se refleja | Las imágenes no se reconstruyeron | `docker compose up -d --build` |

> PostgreSQL ejecuta los scripts de `docker/postgres/init/` **solo** cuando el
> volumen está vacío. Para aplicar `03_auth_sesiones.sql` sobre una BD existente
> sin perder datos (en Git Bash):
>
> ```bash
> docker exec -i tiendata-postgres psql -U postgres -d tiendata < docker/postgres/init/03_auth_sesiones.sql
> ```

---

## Pruebas automáticas

Requieren instalar las dependencias de cada servicio (`npm ci` en su carpeta):

```bash
npm --prefix services/auth-service test
npm --prefix services/user-service test
npm --prefix api-gateway test
npm --prefix frontend test
```

## Documentación técnica

- `docs/MS01_Autenticacion_Sesion.md`: funcionamiento del login y la sesión
- `docs/QA_Guia_Verificacion_MS01_Gateway.md`: verificación y guion de demostración de MS-01
- `docs/Frontend_Integracion_MS01_Gateway.md`: integración del frontend con MS-01
- `docs/DOCKER.md`: detalles de los contenedores
