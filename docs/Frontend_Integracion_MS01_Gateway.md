# Guía de integración Frontend — MS-01 y API Gateway

**Proyecto:** TIENDATA  
**Ámbito:** consumo de autenticación y rutas protegidas desde el cliente web  
**Última actualización:** 2026-11-11

> Referencia funcional: `docs/MS01_Autenticacion_Sesion.md`.

---

## 1) Objetivo

El frontend consume la autenticación solo a través del `api-gateway`. En
desarrollo, Vite redirige `/api` a `http://localhost:3000`.

---

## 2) Endpoints

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión (límite de fallos por IP) |
| POST | `/api/auth/logout` | Cerrar sesión y revocar el token |
| POST | `/api/auth/refresh` | Renovar el token (devuelve el rol vigente) |
| GET | `/api/auth/verify` | Validar el token y obtener el usuario vigente |

---

## 3) Contratos

### 3.1 Login

```http
POST /api/auth/login
Content-Type: application/json

{ "identificador": "admin", "contrasena": "Admin1234" }
```

`identificador` acepta correo o nombre de usuario. Por compatibilidad también se
aceptan `correo` y `nombre_usuario`.

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "id_usuario": 1,
    "nombre": "Administrador Demo",
    "rol": "Administrador",
    "expires_in": 1800
  }
}
```

### 3.2 Verify

```http
GET /api/auth/verify
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": { "valid": true, "id_usuario": 1, "nombre": "Administrador Demo", "rol": "Administrador", "expira_en": 1794430000 }
}
```

`nombre` y `rol` son los **vigentes en la BD**, no los del token.

### 3.3 Refresh

```http
POST /api/auth/refresh
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": { "token": "<jwt_nuevo>", "expires_in": 1800, "id_usuario": 1, "nombre": "Administrador Demo", "rol": "Administrador" }
}
```

El token anterior queda revocado.

### 3.4 Logout

```http
POST /api/auth/logout
Authorization: Bearer <jwt>
```

```json
{ "success": true, "message": "Sesion cerrada correctamente" }
```

---

## 4) Errores

| HTTP | `error.code` | Mensaje en la interfaz |
|---|---|---|
| 400 | `VALIDATION_ERROR` | "Por favor completa todos los campos." |
| 401 | `AUTH_INVALID_CREDENTIALS` | "Usuario, correo o contraseña incorrectos." + intentos restantes (`details.intentos_restantes`) |
| 423 | `AUTH_ACCOUNT_BLOCKED` | mensaje del servidor con los minutos restantes (advertencia) |
| 403 | `AUTH_ACCOUNT_DISABLED` | "Tu cuenta está deshabilitada…" (advertencia) |
| 429 | `AUTH_TOO_MANY_ATTEMPTS` | mensaje del servidor; cabecera `Retry-After` (advertencia) |
| 401 | `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_REVOKED` / `AUTH_TOKEN_INVALID` | cerrar sesión: "Tu sesión expiró…" |
| 401 | `AUTH_ACCOUNT_DISABLED` (en verify/refresh) | cerrar sesión: "Tu cuenta fue deshabilitada…" |

---

## 5) Implementación actual

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Cliente de auth | `src/api/auth.js` | `loginRequest`, `verifyRequest`, `refreshRequest`, `logoutRequest`; errores con `status`, `code` y `details` |
| Interceptor | `src/api/sessionInterceptor.js` | envuelve `fetch`: un 401 en una petición con `Bearer` (fuera de `/auth/`) cierra la sesión |
| Contexto | `src/context/AuthContext.jsx` | estado de sesión, verificación al cargar, renovación, inactividad y sincronización entre pestañas |
| Utilidades | `src/utils/jwt.js` | leer `exp` del token (sin verificar la firma) |
| Login | `src/pages/Login/login.jsx` | formulario "Correo o usuario" y avisos de sesión finalizada |

### Ciclo de la sesión

1. **Login:** se guardan `tiendata_token` y `tiendata_user` en `localStorage`.
2. **Al cargar la app:** un token vencido se descarta; si no, se llama a `verify`
   (401 → login con aviso; sin conexión → se conserva la sesión local).
3. **Renovación:** un minuto antes de expirar, si hubo actividad (teclado, ratón,
   scroll o toque) se llama a `refresh` y se actualizan token, rol y nombre.
   Sin actividad, la sesión expira con "Tu sesión se cerró por inactividad".
4. **401 en cualquier API:** el interceptor cierra la sesión y el login muestra
   el motivo según `error.code`.
5. **Varias pestañas:** el evento `storage` propaga logout y renovación.

Las páginas solo necesitan enviar `Authorization: Bearer ${localStorage.getItem('tiendata_token')}`;
no deben manejar 401 por su cuenta.

---

## 6) Lista de verificación

- [x] Login por correo o nombre de usuario a través del gateway.
- [x] Verify al recargar la aplicación.
- [x] Renovación anticipada solo con actividad.
- [x] Logout revoca el token en el servidor y limpia la sesión local.
- [x] Cualquier 401 lleva al login con el motivo.
- [x] Avisos de bloqueo, cuenta deshabilitada y límite por IP.
