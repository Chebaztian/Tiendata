# Guía QA — Verificación de MS-01 (Autenticación y Sesión) + API Gateway

**Proyecto:** TIENDATA  
**Alcance:** login, sesión, bloqueo, revocación, límite por IP y protección de rutas  
**Última actualización:** 2026-11-11

> Referencia funcional: `docs/MS01_Autenticacion_Sesion.md`.

---

## 1) Objetivo

Verificar que `services/auth-service`, `api-gateway`, la gestión de usuarios
(`services/user-service`) y el frontend cumplen el contrato de autenticación,
con resultados reproducibles.

---

## 2) Precondiciones

1. Docker Desktop y Node.js 20+.
2. Estar en la raíz del repositorio (`tiendata`).
3. Entorno levantado:

```bash
docker compose up --build
```

4. Credenciales semilla: usuario `admin` o correo `admin@tiendata.com`, contraseña `Admin1234`.

> Si el volumen de BD es anterior a `03_auth_sesiones.sql`, aplicarlo (ver README).

---

## 3) Pruebas automáticas

```bash
npm --prefix services/auth-service test   # 18 pruebas
npm --prefix services/user-service test   # 15 pruebas
npm --prefix api-gateway test             # incluye auth, límite por IP y desbloqueo
npm --prefix frontend test                # sesión, login y API de auth
```

Resultado esperado: sin fallos en auth-service, user-service ni en las pruebas
de gateway de MS-01 (`gateway-auth`, `login-rate-limit`, `user-unlock`).

> Las 2 pruebas de `ReportsPage.test.jsx` (frontend) fallan desde antes y no
> corresponden a MS-01.

---

## 4) Matriz de casos automatizados

### 4.1 auth-service (`tests/auth.integration.test.js`)

| # | Caso | Esperado |
|---|---|---|
| 1 | Login con credenciales válidas | 200 + token |
| 2 | 3 fallos seguidos | 423 `AUTH_ACCOUNT_BLOCKED` |
| 3 | Verify de token emitido | 200 |
| 4 | Logout y verify posterior | 401 `AUTH_TOKEN_REVOKED` |
| 5 | Refresh | token nuevo; el anterior queda revocado |
| 6 | Login por correo o usuario, sin distinguir mayúsculas | 200 |
| 7 | Sin identificador o contraseña | 400 `VALIDATION_ERROR` |
| 8 | Fallo informa intentos restantes | 401 con `details.intentos_restantes` |
| 9 | Cuenta bloqueada informa minutos reales | 423 con `reintentar_en_segundos` |
| 10 | Bloqueo vencido | 200 |
| 11 | Cuenta inactiva | 401 con contraseña errónea (sin sumar intentos), 403 con la correcta |
| 12 | Logout con firma falsa | 401 `AUTH_TOKEN_INVALID` |
| 13 | Verify de token expirado / logout de token expirado | 401 `AUTH_TOKEN_EXPIRED` / 200 |
| 14 | Logout se audita | evento `logout` |
| 15 | Usuario desactivado con sesión abierta | verify y refresh → 401 `AUTH_ACCOUNT_DISABLED` |
| 16 | Usuario eliminado con sesión abierta | 401 |
| 17 | Cambio de rol con sesión abierta | verify y refresh devuelven el rol nuevo |
| 18 | Bloqueo por intentos con sesión abierta | la sesión sigue válida |

### 4.2 api-gateway

| Archivo | Casos |
|---|---|
| `gateway-auth.integration.test.js` | acceso con token válido; 401 sin token; 401 con token revocado |
| `login-rate-limit.test.js` | 429 + `Retry-After` al superar el máximo; los éxitos no cuentan; los fallos vencen con la ventana; cuentan 401 y 423, no 400 |
| `user-unlock.routes.test.js` | desbloqueo reenviado con el actor; 403 para Operador |

### 4.3 user-service

Desbloqueo (`bloqueo_vigente`, `POST /:id/desbloquear`, 404), nombre de usuario
(normalización, opcional, formato, duplicado al crear y editar, quitarlo) y
política de contraseña.

---

## 5) Pruebas manuales (gateway en `http://localhost:3000`)

### 5.1 Login y sesión

```http
POST /api/auth/login
Content-Type: application/json

{ "identificador": "admin", "contrasena": "Admin1234" }
```

1. Repetir con `"identificador": "ADMIN@tiendata.com"` → 200.
2. `GET /api/auth/verify` con `Authorization: Bearer <token>` → 200.
3. `POST /api/auth/logout` con el token → 200; repetir verify → 401 `AUTH_TOKEN_REVOKED`.
4. Reiniciar el contenedor `tiendata-auth-service` y repetir verify → sigue 401 (revocación persistente).

### 5.2 Bloqueo y desbloqueo

1. Crear un operador desde la pantalla Usuarios.
2. Iniciar sesión 3 veces con contraseña errónea → la 3.ª responde 423 con minutos restantes.
3. En Usuarios aparece la etiqueta **Bloqueado**; pulsar **Desbloquear**.
4. El operador inicia sesión con su contraseña → 200.

### 5.3 Usuario desactivado o con rol cambiado

1. Iniciar sesión como operador en una ventana privada.
2. Como admin, cambiar su rol a Administrador → en la siguiente petición el operador ya tiene permisos de admin (y viceversa).
3. Como admin, deshabilitarlo → su siguiente acción lo lleva al login con "Tu cuenta fue deshabilitada".

### 5.4 Límite por IP

Con `LOGIN_MAX_FALLOS_POR_IP=20` (por defecto), hacer 20 logins fallidos con
cuentas distintas → el siguiente intento, incluso correcto, responde 429
`AUTH_TOO_MANY_ATTEMPTS` con cabecera `Retry-After`.

### 5.5 Frontend

1. Recargar la página con sesión iniciada → sigue dentro (verify al cargar).
2. Revocar el token (logout desde otra pestaña) → la otra pestaña vuelve al login.
3. Dejar la sesión sin actividad 30 min → vuelve al login con "Tu sesión se cerró por inactividad".

---

## 6) Criterios de aceptación QA

- [ ] Pruebas automáticas de MS-01 sin fallos.
- [ ] Login por correo y por nombre de usuario.
- [ ] Bloqueo, revocación y desbloqueo persisten tras reiniciar servicios.
- [ ] Usuario desactivado pierde la sesión; cambio de rol se aplica sin re-login.
- [ ] Límite por IP responde 429 con `Retry-After`.
- [ ] Errores con `success=false` y bloque `error { code, message, details? }`.
- [ ] Ninguna respuesta expone contraseñas ni hashes.

---

## 7) Limitaciones conocidas

1. El token se guarda en `localStorage` (no en cookie `HttpOnly`).
2. No hay recuperación de contraseña por correo.
3. El límite por IP vive en memoria de cada instancia del gateway; detrás de un
   proxy inverso, todas las peticiones pueden compartir IP.
4. HTTPS se configura en el despliegue.
