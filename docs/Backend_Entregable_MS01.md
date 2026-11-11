# Entregable Backend MS-01 — Servicio de Autenticación y Sesión

**Proyecto:** INVENTARIO TIENDATA  
**Módulo principal:** MS-01 (Auth Service)  
**Integraciones incluidas:** API Gateway + Shared Utils  
**Fecha:** 2026-04-04

> **Actualización 2026-11-11:** este documento describe la entrega original de abril.
> El comportamiento vigente de MS-01 (login por correo o usuario, bloqueo y
> revocación persistentes, sesiones de usuarios desactivados, desbloqueo por el
> administrador, límite de intentos por IP y sesión en el frontend) está en
> `docs/MS01_Autenticacion_Sesion.md`, y su verificación en
> `docs/QA_Guia_Verificacion_MS01_Gateway.md`.

---

## 1. Alcance del entregable

Este entregable consolida el backend del flujo de autenticación del sistema e incorpora trabajo colaborativo del equipo en tres áreas:

1. **MS-01 Auth Service** (`services/auth-service`)  
2. **API Gateway** (`api-gateway`)  
3. **Shared Utils** (`shared`) para utilidades y convenciones comunes

El objetivo es dejar un bloque backend verificable para login, validación de token, cierre de sesión y renovación de token, con pruebas automatizadas y guías operativas.

---

## 2. Componentes incluidos

## 2.1 Auth Service (MS-01)

**Endpoints implementados:**

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/verify`

**Capacidades implementadas:**

- Validación de credenciales.
- Generación y validación de JWT.
- Bloqueo de cuenta por intentos fallidos.
- Revocación de token en logout.
- Revocación de token previo en refresh.

## 2.2 API Gateway

**Responsabilidad:** puerta de entrada para consumo de frontend y rutas protegidas.

**Endpoints expuestos:**

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/verify`
- `GET /api/protected/ping` (ruta protegida de verificación)

El gateway delega validación de token hacia `auth-service` con `/api/auth/verify`.

## 2.3 Shared Utils (trabajo de rama dedicada)

Se incorporan utilidades compartidas de backend:

- `shared/constants/roles.js`
- `shared/middlewares/errorHandler.js`
- `shared/utils/jwt.js`
- `shared/utils/response.js`

Estas utilidades quedan disponibles para unificar manejo de roles, errores y respuestas entre microservicios en siguientes iteraciones.

---

## 3. Estructura de carpetas relevante

```text
tiendata/
├─ api-gateway/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ config/services.js
│  │  ├─ middlewares/auth.middleware.js
│  │  └─ routes/auth.routes.js
│  └─ tests/gateway-auth.integration.test.js
├─ services/
│  └─ auth-service/
│     ├─ src/
│     │  ├─ app.js
│     │  ├─ config/db.js
│     │  ├─ controllers/auth.controller.js
│     │  ├─ models/auth.model.js
│     │  ├─ repositories/auth.repository.js
│     │  ├─ routes/auth.routes.js
│     │  └─ services/auth.service.js
│     └─ tests/auth.integration.test.js
├─ shared/
│  ├─ constants/roles.js
│  ├─ middlewares/errorHandler.js
│  └─ utils/{jwt.js,response.js}
└─ docs/
   ├─ QA_Guia_Verificacion_MS01_Gateway.md
   └─ Frontend_Integracion_MS01_Gateway.md
```

---

## 4. Variables de entorno

Para evitar exponer configuración sensible, se incluyen archivos de ejemplo:

- `services/auth-service/.env.example`
- `api-gateway/.env.example`

Copiar cada uno a `.env` según el servicio antes de ejecución local.

---

## 5. Ejecución local

## 5.1 Instalación de dependencias

```bash
npm run setup:deps
```

## 5.2 Verificación automática integral

```bash
npm run verify:all
```

Resultado esperado:

- Auth Service: 5 pruebas aprobadas.
- API Gateway: 3 pruebas aprobadas.

---

## 6. Cobertura de pruebas incluidas

## 6.1 Auth Service

- Login exitoso.
- Bloqueo por 3 intentos fallidos.
- Verify de token válido.
- Logout revoca token.
- Refresh emite nuevo token e invalida el anterior.

## 6.2 API Gateway

- Acceso protegido con token válido.
- Rechazo sin token (`401`).
- Rechazo de token revocado (`401`).

---

## 7. Alineación con requisitos MS-01

Cumplimientos principales:

- Autenticación por `nombre_usuario` y `contrasena`.
- Emisión y verificación de JWT.
- Bloqueo temporal por intentos fallidos.
- Cierre de sesión seguro con revocación.
- Renovación de token.
- Flujo probado para integración con gateway.

---

## 8. Entregables documentales complementarios

- `MS-01_Reporte_Tecnico_Integracion.md`
- `docs/QA_Guia_Verificacion_MS01_Gateway.md`
- `docs/Frontend_Integracion_MS01_Gateway.md`

Estos documentos cubren contrato técnico, validación QA y guía de consumo desde frontend.

---

## 9. Recomendaciones para siguiente sprint

1. Unificar consumo de `shared/utils/*` en todos los microservicios.
2. Integrar MS-02 (usuarios) y MS-09 (auditoría) en modo no simulado.
3. Añadir pruebas end-to-end con frontend real.
4. Estandarizar formato final de errores (`code`, `message`) en todos los módulos.
