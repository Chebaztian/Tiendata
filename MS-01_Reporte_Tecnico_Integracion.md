# MS-01 — Reporte de Hallazgos y Especificación Técnica de Integración

**Proyecto:** INVENTARIO TIENDATA  
**Módulo:** MS-01 Servicio de Autenticación y Sesión  
**Fecha:** 2026-04-04  
**Estado:** Aprobado para implementación e integración con cliente web

> **Actualización 2026-11-11:** este documento describe la entrega original de abril.
> El comportamiento vigente de MS-01 (login por correo o usuario, bloqueo y
> revocación persistentes, sesiones de usuarios desactivados, desbloqueo por el
> administrador, límite de intentos por IP y sesión en el frontend) está en
> `docs/MS01_Autenticacion_Sesion.md`, y su verificación en
> `docs/QA_Guia_Verificacion_MS01_Gateway.md`.

---

## 1) Resumen Ejecutivo

Se consolidó la documentación funcional y técnica de MS-01 y se normalizó en un único contrato de trabajo para desarrollo del servidor, integración con pasarela de API y consumo desde cliente web.

Este documento define:

- Alcance oficial del módulo de autenticación.
- Contratos HTTP definitivos de los endpoints.
- Reglas de negocio y seguridad.
- Estructura de respuestas/errores estándar.
- Guía técnica de integración para cliente web.
- Criterios de calidad y lista de validación.

---

## 2) Hallazgos Consolidados (para reporte)

1. **MS-01 es un servicio central de seguridad** y puerta de entrada del sistema.
2. **El acceso a las API requiere JWT Bearer**, excepto inicio de sesión.
3. **Se implementa control de sesión y seguridad por capas:** validación de credenciales, emisión de JWT, expiración y revocación.
4. **La protección contra fuerza bruta es obligatoria:** bloqueo automático tras 3 intentos fallidos por 15 minutos.
5. **El módulo debe integrarse con:**
   - **MS-02** (datos de usuario, hash de contraseña, rol, estado)
   - **MS-09** (auditoría de eventos críticos de autenticación)
6. **Criterio de rendimiento objetivo:** inicio de sesión < 1000 ms (incluyendo bcrypt + generación de JWT).
7. **La salida de autenticación debe exponer datos mínimos del usuario autenticado:** `id`, `nombre`, `rol`.

---

## 3) Alcance Funcional Definitivo de MS-01

MS-01 debe cubrir:

- Autenticación de usuario por `nombre_usuario` + `contrasena`.
- Emisión de token de acceso JWT.
- Cierre de sesión seguro con revocación de token.
- Verificación de token para consumo interno (pasarela de API y microservicios).
- Renovación de token para continuidad de sesión controlada.
- Bloqueo temporal por intentos fallidos.
- Publicación de eventos de auditoría hacia MS-09.

---

## 4) Contrato API Unificado (Definitivo)

### 4.1 Endpoints

| Método | Endpoint | Autenticación requerida | Descripción |
|---|---|---:|---|
| POST | `/api/auth/login` | No | Autentica usuario y emite token |
| POST | `/api/auth/logout` | Sí | Cierra sesión e invalida token |
| POST | `/api/auth/refresh` | Sí | Renueva token vigente |
| GET | `/api/auth/verify` | Sí | Verifica validez del token |

---

### 4.2 `POST /api/auth/login`

**Cuerpo de la solicitud**

```json
{
  "nombre_usuario": "admin",
  "contrasena": "P4ssw0rd!"
}
```

**Respuesta 200**

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "id_usuario": 12,
    "nombre": "Juan Nicolas Urrutia Salcedo",
    "rol": "Administrador",
    "expires_in": 1800
  }
}
```

**Errores**

- `401` usuario/contraseña inválidos
- `423` cuenta bloqueada por intentos fallidos
- `400` cuerpo de solicitud inválido

---

### 4.3 `POST /api/auth/logout`

**Encabezado**

```http
Authorization: Bearer <jwt>
```

**Respuesta 200**

```json
{
  "success": true,
  "message": "Sesion cerrada correctamente"
}
```

**Errores**

- `401` token ausente/expirado/inválido

---

### 4.4 `POST /api/auth/refresh`

**Encabezado**

```http
Authorization: Bearer <jwt_vigente>
```

**Respuesta 200**

```json
{
  "success": true,
  "data": {
    "token": "<jwt_nuevo>",
    "expires_in": 1800
  }
}
```

**Regla:** al renovar, el token anterior queda invalidado.

**Errores**

- `401` token expirado/ausente/inválido

---

### 4.5 `GET /api/auth/verify`

**Encabezado**

```http
Authorization: Bearer <jwt>
```

**Respuesta 200**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "id_usuario": 12,
    "nombre": "Juan Nicolas Urrutia Salcedo",
    "rol": "Administrador"
  }
}
```

**Errores**

- `401` token inválido/expirado/revocado

---

## 5) Estándar de respuesta y errores

### 5.1 Respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

### 5.2 Respuesta de error

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Usuario o contrasena incorrectos"
  }
}
```

### 5.3 Catálogo mínimo de códigos

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_BLOCKED`
- `AUTH_TOKEN_MISSING`
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_TOKEN_REVOKED`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

---

## 6) Reglas de Negocio y Seguridad

1. **Excepción de autenticación:** solo `POST /api/auth/login` es público.
2. **Expiración de token:** 30 minutos de inactividad (`expires_in = 1800`).
3. **Bloqueo de cuenta:** 3 intentos fallidos consecutivos → bloqueo 15 minutos (`HTTP 423`).
4. **Hash de contraseñas:** bcrypt obligatorio, nunca texto plano.
5. **Revocación de sesión:** logout y refresh invalidan token previo.
6. **Datos mínimos en el contenido del JWT:** `id_usuario`, `rol`, `nombre`.
7. **Auditoría obligatoria hacia MS-09** para eventos críticos.

---

## 7) Auditoría (MS-09)

Eventos mínimos que MS-01 debe emitir:

- `login_exitoso`
- `login_fallido`
- `cuenta_bloqueada`
- `logout`
- `token_refresh`
- `token_rechazado`

Campos sugeridos del evento:

- `tipo_operacion`
- `id_usuario` (si aplica)
- `rol_usuario` (si aplica)
- `timestamp` (servidor)
- `origen` (MS-01)
- `metadata` (ip, user-agent, motivo)

---

## 8) Integración técnica para cliente web

### 8.1 Flujo recomendado

1. Usuario envía credenciales a `/api/auth/login`.
2. El cliente web guarda el token en almacenamiento seguro (preferente: cookie `HttpOnly` con servidor intermedio; alternativa: memoria de la aplicación con estrategia de renovación controlada).
3. El cliente web adjunta `Authorization: Bearer <token>` en cada solicitud protegida.
4. Si recibe `401` por expiración, intenta `/api/auth/refresh` una sola vez y reintenta la solicitud original.
5. Si la renovación falla, forzar cierre de sesión local y redirigir a inicio de sesión.

### 8.2 Manejo de estados UI

- `401 + AUTH_INVALID_CREDENTIALS` → mensaje de credenciales inválidas.
- `423 + AUTH_ACCOUNT_BLOCKED` → mostrar tiempo de espera y deshabilitar temporalmente el botón de inicio de sesión.
- `401 + AUTH_TOKEN_EXPIRED` → ejecutar flujo de renovación de token.
- `401 + AUTH_TOKEN_REVOKED` → sesión finalizada, redirigir a inicio de sesión.

### 8.3 Contrato de datos mínimo para sesión en cliente web

```ts
type SessionUser = {
  id_usuario: number;
  nombre: string;
  rol: 'Administrador' | 'Operador';
};

type SessionState = {
  token: string;
  expires_in: number;
  user: SessionUser;
};
```

### 8.4 Interceptor HTTP (criterio técnico)

- Inyectar token de forma automática.
- Capturar respuestas `401`.
- Ejecutar renovación de token de forma atómica (evitar múltiples renovaciones en paralelo).
- Reintentar una sola vez la solicitud original.

---

## 9) Integración con pasarela de API y microservicios

1. La pasarela de API valida token con `GET /api/auth/verify`.
2. La pasarela de API propaga el contexto autenticado (`id_usuario`, `rol`) mediante encabezados internos confiables.
3. Servicios de dominio aplican RBAC con base en rol propagado.
4. Rechazo uniforme de acceso no autorizado con `401/403`.

Encabezados internos sugeridos (solo red interna):

- `x-user-id`
- `x-user-role`
- `x-user-name`

---

## 10) Criterios de calidad (definición de terminado)

- [ ] Inicio de sesión funcional < 1000 ms en escenario nominal.
- [ ] Bloqueo por intentos fallidos implementado y probado.
- [ ] Logout revoca token correctamente.
- [ ] Refresh renueva e invalida token anterior.
- [ ] Verify valida token y estado de revocación.
- [ ] 100% de eventos críticos auditados en MS-09.
- [ ] Respuestas y errores cumplen contrato JSON unificado.
- [ ] Integración con cliente web validada con flujo completo de sesión.

---

## 11) Recomendaciones de Implementación

1. Implementar bloqueo de intentos **a nivel BD + aplicación**.
2. Configurar `JWT_SECRET` robusto y política de rotación.
3. Evitar exponer detalles sensibles en errores (`401` genérico).
4. Añadir pruebas unitarias por capa (controller/service/repository).
5. Preparar pruebas básicas de integración: login → verify → refresh → logout.

---

## 12) Conclusión

MS-01 queda formalizado como servicio de autenticación transversal, con contrato API estable, reglas de seguridad claras y guía de integración lista para cliente web y pasarela de API. Este documento puede usarse como referencia única para implementación, calidad e integración entre módulos.
