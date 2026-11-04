# Guía QA — Verificación de MS-01 (Auth Service) + API Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Alcance:** Validación técnica del flujo de autenticación y protección de rutas  
**Última actualización:** 2026-04-04

---

## 1) Objetivo

Verificar que la implementación actual de:

- `services/auth-service`
- `api-gateway`

cumple el contrato funcional mínimo de autenticación, revocación y validación de token, con resultados reproducibles por QA.

---

## 2) Precondiciones

1. Tener Node.js 18+ instalado.
2. Estar ubicado en la raíz del repositorio (`tiendata`).
3. Ejecutar bootstrap de dependencias:

```bash
npm run setup:deps
```

4. Variables mínimas recomendadas:
   - `services/auth-service/.env`
   - `api-gateway/.env`

> Nota: el repositorio ya incluye valores por defecto para pruebas locales.

---

## 3) Comando único de verificación

Ejecutar:

```bash
npm run verify:all
```

Resultado esperado:

- Auth Service: 5 pruebas aprobadas.
- API Gateway: 3 pruebas aprobadas.
- Sin fallos.

---

## 4) Matriz de casos validados automáticamente

## 4.1 Auth Service (`services/auth-service/tests/auth.integration.test.js`)

1. `POST /api/auth/login` con credenciales válidas retorna `200` y token.
2. Login inválido bloquea cuenta al tercer intento (`423`).
3. `GET /api/auth/verify` valida token emitido (`200`).
4. `POST /api/auth/logout` revoca token y `verify` posterior retorna `401`.
5. `POST /api/auth/refresh` emite nuevo token e invalida token previo.

## 4.2 API Gateway (`api-gateway/tests/gateway-auth.integration.test.js`)

1. Ruta protegida permite acceso con token válido (`200`).
2. Ruta protegida sin token retorna `401`.
3. Token revocado por logout es rechazado por gateway (`401`).

---

## 5) Pruebas manuales recomendadas (API)

## 5.1 Iniciar servicios

Terminal 1:

```bash
cd services/auth-service
npm start
```

Terminal 2:

```bash
cd api-gateway
npm start
```

## 5.2 Flujo manual mínimo

1. Login por gateway:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "admin",
  "contrasena": "Admin1234"
}
```

2. Validar acceso protegido:

```http
GET http://localhost:3000/api/protected/ping
Authorization: Bearer <token>
```

3. Cerrar sesión:

```http
POST http://localhost:3000/api/auth/logout
Authorization: Bearer <token>
```

4. Reintentar acceso con mismo token (debe fallar con `401`).

---

## 6) Criterios de aceptación QA

- [ ] Todas las pruebas automáticas pasan en `verify:all`.
- [ ] El gateway delega validación a `auth-service` vía `/api/auth/verify`.
- [ ] Token revocado no autoriza rutas protegidas.
- [ ] Respuestas de error contienen estructura JSON con `success=false` y bloque `error`.
- [ ] No se exponen contraseñas ni datos sensibles en respuestas.

---

## 7) Riesgos y observaciones actuales

1. El repositorio contiene más servicios en estado de plantilla (sin pruebas).
2. La cobertura de este ciclo se limita a MS-01 + Gateway.
3. Falta integrar pruebas de extremo a extremo con frontend real.

---

## 8) Evidencia esperada para cierre QA

- Salida de consola de `npm run verify:all` con 8/8 pruebas aprobadas.
- Registro de prueba manual del flujo login → ruta protegida → logout → rechazo.
- Capturas de respuesta HTTP (códigos y cuerpo) para auditoría del sprint.
