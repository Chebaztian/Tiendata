# Guía de integración Frontend — MS-01 y API Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Ámbito:** Consumo desde cliente web de autenticación y rutas protegidas  
**Última actualización:** 2026-04-04

---

## 1) Objetivo

Definir un contrato claro para que frontend consuma autenticación a través del `api-gateway`, sin acoplarse internamente al `auth-service`.

Base URL local recomendada:

```text
http://localhost:3000
```

---

## 2) Endpoints disponibles por Gateway

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión y obtener token |
| POST | `/api/auth/logout` | Cerrar sesión y revocar token |
| POST | `/api/auth/refresh` | Renovar token activo |
| GET | `/api/auth/verify` | Verificar token actual |
| GET | `/api/protected/ping` | Ruta protegida de prueba de integración |

---

## 3) Contratos de request/response

## 3.1 Login

### Request

```http
POST /api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "admin",
  "contrasena": "Admin1234"
}
```

### Response exitosa (200)

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

### Errores frecuentes

- `401` credenciales inválidas
- `423` cuenta bloqueada temporalmente

## 3.2 Verify

### Request

```http
GET /api/auth/verify
Authorization: Bearer <jwt>
```

### Response exitosa (200)

```json
{
  "success": true,
  "data": {
    "valid": true,
    "id_usuario": 1,
    "nombre": "Administrador Demo",
    "rol": "Administrador"
  }
}
```

## 3.3 Refresh

### Request

```http
POST /api/auth/refresh
Authorization: Bearer <jwt>
```

### Response exitosa (200)

```json
{
  "success": true,
  "data": {
    "token": "<jwt_nuevo>",
    "expires_in": 1800
  }
}
```

## 3.4 Logout

### Request

```http
POST /api/auth/logout
Authorization: Bearer <jwt>
```

### Response exitosa (200)

```json
{
  "success": true,
  "message": "Sesion cerrada correctamente"
}
```

---

## 4) Estructura recomendada de sesión en frontend

```ts
type UsuarioSesion = {
  id_usuario: number;
  nombre: string;
  rol: 'Administrador' | 'Operador';
};

type EstadoSesion = {
  token: string;
  expires_in: number;
  usuario: UsuarioSesion;
};
```

---

## 5) Estrategia de integración recomendada

1. Guardar token en un almacenamiento seguro (preferente: cookie `HttpOnly` con backend intermedio).
2. En cada solicitud protegida, enviar `Authorization: Bearer <token>`.
3. Si llega `401` por token expirado:
   - intentar `refresh` una sola vez,
   - actualizar token en memoria,
   - reintentar la solicitud original.
4. Si `refresh` falla:
   - limpiar sesión local,
   - redirigir a login.

---

## 6) Interceptor HTTP de referencia (pseudocódigo)

```ts
requestInterceptor(req) {
  const token = session.token;
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
}

responseInterceptor(error) {
  if (error.status === 401 && !error.request._retried) {
    error.request._retried = true;
    const refreshed = refreshToken();
    if (refreshed.ok) {
      updateSession(refreshed.token);
      return retry(error.request);
    }
    clearSession();
    redirectToLogin();
  }
  throw error;
}
```

---

## 7) Manejo de errores en interfaz

- `AUTH_INVALID_CREDENTIALS` → mostrar "Usuario o contraseña incorrectos".
- `AUTH_ACCOUNT_BLOCKED` → informar bloqueo temporal de cuenta.
- `AUTH_TOKEN_EXPIRED` → renovar sesión automáticamente (una vez).
- `AUTH_TOKEN_REVOKED` → cerrar sesión y enviar al login.

---

## 8) Lista de verificación para integración frontend

- [ ] Login consume gateway y guarda token correctamente.
- [ ] Verify permite recuperar usuario autenticado al recargar la aplicación.
- [ ] Refresh se ejecuta una sola vez por expiración.
- [ ] Logout limpia sesión y bloquea reutilización de token.
- [ ] Rutas protegidas en frontend dependen de estado de sesión real.

---

## 9) Recomendaciones para siguientes iteraciones

1. Incorporar endpoint de perfil (`/api/auth/me`) en gateway para simplificar inicialización de sesión.
2. Agregar pruebas E2E frontend (login, navegación protegida, expiración y logout).
3. Definir política de expiración de sesión de UI (inactividad y cierre automático).
