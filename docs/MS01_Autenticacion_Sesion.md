# MS-01 — Autenticación y Sesión

Estado del módulo tras la rama `feature/MS-01-mejoras-login`.

## Flujo

```
Login (React) ──► API Gateway :3000 ──► auth-service :3002 ──► PostgreSQL
                     │
                     └─ en cada ruta protegida llama a GET /api/auth/verify
                        y aplica el guard de rol (Administrador / Operador)
```

## Endpoints (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/login` | — (límite por IP en el gateway) | `{ identificador, contrasena }` → `{ token, id_usuario, nombre, rol, expires_in }` |
| GET | `/verify` | Bearer | Valida firma, expiración, revocación y que el usuario siga activo; devuelve el rol vigente |
| POST | `/refresh` | Bearer | Emite un token nuevo con el rol vigente y revoca el anterior |
| POST | `/logout` | Bearer | Revoca el token (exige firma válida; acepta tokens expirados) |

`identificador` puede ser el correo o el nombre de usuario, sin distinguir
mayúsculas. Por compatibilidad también se aceptan `correo` y `nombre_usuario`.

## Errores

| HTTP | `error.code` | Cuándo | `error.details` |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Faltan credenciales | — |
| 401 | `AUTH_INVALID_CREDENTIALS` | Usuario o contraseña incorrectos | `intentos_restantes` |
| 423 | `AUTH_ACCOUNT_BLOCKED` | Bloqueo por intentos fallidos | `bloqueo_hasta`, `reintentar_en_segundos` |
| 403 | `AUTH_ACCOUNT_DISABLED` | Cuenta inactiva (solo con contraseña correcta) | — |
| 429 | `AUTH_TOO_MANY_ATTEMPTS` | Límite de logins fallidos por IP (gateway); cabecera `Retry-After` | `reintentar_en_segundos` |
| 401 | `AUTH_ACCOUNT_DISABLED` | En verify/refresh: el usuario fue desactivado o eliminado con la sesión abierta | — |
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_REVOKED` | Token ausente, inválido, vencido o revocado | — |

## Reglas de seguridad

- **Bloqueo:** tras `max_intentos_login` fallos (tabla `parametros_sistema`,
  por defecto 3) la cuenta se bloquea `tiempo_bloqueo_minutos` (por defecto 15).
  El fin del bloqueo se guarda en `usuarios.bloqueo_hasta`, así que sobrevive a
  reinicios. `bloqueado = true` sin fecha es un bloqueo indefinido (manual).
- **Desbloqueo manual:** un Administrador puede quitar el bloqueo desde la
  pantalla Usuarios (botón "Desbloquear", visible solo en cuentas con bloqueo
  vigente) o con `POST /api/users/:id/desbloquear`. Reinicia los intentos
  fallidos y se audita como `desbloquear_usuario`.
- **Límite por IP (gateway):** como máximo `LOGIN_MAX_FALLOS_POR_IP` (20)
  logins fallidos (401 o 423) por IP en `LOGIN_VENTANA_MINUTOS` (15). Los
  logins exitosos no cuentan, para no bloquear a varios usuarios que comparten
  red. Frena a quien prueba contraseñas contra muchas cuentas distintas. El
  estado vive en memoria de cada instancia del gateway.
- **Cuenta inactiva:** con contraseña incorrecta responde como credencial
  inválida y no acumula intentos; solo con la contraseña correcta revela 403.
- **Revocación:** logout y refresh guardan el `jti` del token en
  `tokens_revocados` hasta su expiración (persistente entre reinicios y
  compartido entre instancias). Los registros vencidos se limpian solos.
- **Usuarios desactivados o con rol cambiado:** `verify` (que el gateway llama
  en cada petición protegida) y `refresh` consultan el estado y el rol actuales
  en la BD. Desactivar o eliminar a un usuario corta su sesión en la siguiente
  petición, y un cambio de rol se aplica sin volver a iniciar sesión. Un bloqueo
  por intentos fallidos no corta una sesión ya iniciada.
- **JWT:** HS256, 30 min (`JWT_EXPIRES_IN`). `JWT_SECRET` es obligatorio con
  `NODE_ENV=production`.
- **Auditoría (MS-09):** `login_exitoso`, `login_fallido` (con motivo) y `logout`.

## Sesión en el frontend

- El token se guarda en `localStorage` (`tiendata_token`, `tiendata_user`).
- Al cargar la app se valida con `/verify`; un token vencido se descarta sin
  llamar al servidor. Si el servidor no responde se conserva la sesión local.
- Un minuto antes de expirar, si hubo actividad (teclado, ratón, scroll,
  toque), se renueva con `/refresh`. Sin actividad, la sesión expira y el
  login muestra "Tu sesión se cerró por inactividad".
- Cualquier 401 de una llamada autenticada (todas las `src/api/*.js`) cierra la
  sesión y lleva al login con "Tu sesión expiró".
- Cerrar sesión o renovar en una pestaña se refleja en las demás.
- Al renovar, el frontend actualiza el rol y el nombre con los vigentes. Si la
  cuenta fue deshabilitada, el login lo indica.

## Base de datos

`docker/postgres/init/03_auth_sesiones.sql` (idempotente):

- `usuarios.nombre_usuario` (único, sin distinguir mayúsculas; `admin` para el
  usuario semilla)
- `usuarios.bloqueo_hasta`
- tabla `tokens_revocados (jti, id_usuario, revocado_en, expira_en)`

## Gestión de usuarios (MS-02)

- **Nombre de usuario** opcional al crear o editar un usuario: 3-30 caracteres
  (letras, números, `.`, `_`, `-`), sin `@` ni espacios. Se guarda en
  minúsculas y es único sin distinguir mayúsculas (`409
  USER_USERNAME_ALREADY_EXISTS`). Enviar `""` lo quita.
- **Contraseña mínima:** 8 a 128 caracteres con letras y números, validada en
  el frontend y en el user-service (crear y editar).
