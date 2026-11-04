# Entregable Backend MS-09 - Auditoria y Trazabilidad e Integracion con Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Modulo principal:** MS-09 (Audit Service)  
**Modulos integrados:** `auth-service`, `user-service`, `inventory-service`, `api-gateway`  
**Fecha:** 2026-04-23

---

## Objetivo

Implementar el microservicio MS-09 para auditoria y trazabilidad completa del sistema, integrandolo sobre el repositorio principal para:

- registrar eventos criticos de autenticacion, usuarios y movimientos
- almacenar la informacion de auditoria de forma inmutable
- consultar logs con paginacion y filtros
- restringir la consulta exclusivamente al rol Administrador
- exponer el consumo de auditoria a traves de `api-gateway`

---

## Resumen de lo realizado

Se trabajo sobre una rama nueva basada en `main` actualizado:

- `feature/MS-09-audit-service`

Sobre esta rama se realizo:

1. `git fetch` y `git pull --ff-only` de `origin/main`.
2. Creacion del nuevo microservicio `services/audit-service`.
3. Reutilizacion y extension de las tablas de auditoria existentes del dump PostgreSQL.
4. Integracion asincrona desde:
   - `auth-service`
   - `user-service`
   - `inventory-service`
5. Exposicion del endpoint de consulta de auditoria por `api-gateway`.
6. Actualizacion de `docker-compose.yml` para incluir el nuevo servicio.
7. Ajuste de scripts de prueba para ejecutar correctamente dentro del entorno actual.
8. Validacion automatizada completa con:

```bash
npm run verify:all
```

Resultado validado:

- Auth Service: OK
- User Service: OK
- Category Service: OK
- Product Service: OK
- Inventory Service: OK
- Audit Service: OK
- API Gateway: OK

---

## Implementacion de MS-09

### Alcance funcional implementado

Se implemento `audit-service` con:

- `POST /api/audit/events` para registrar eventos de auditoria
- `GET /api/audit/logs` para consultar historial
- paginacion de resultados
- filtros por:
  - `fecha`
  - `fecha_inicio`
  - `fecha_fin`
  - `usuario`
  - `modulo`
  - `accion`
- control de acceso para que solo `Administrador` consulte logs
- persistencia inmutable
- precision de fecha y hora generada por el servidor

### Regla de inmutabilidad aplicada

MS-09 no expone endpoints de `UPDATE` ni `DELETE`.

La implementacion solo permite:

- insercion de eventos
- lectura paginada del historial

Esto cumple la regla de negocio de inmutabilidad operativa del modulo.

### Modelo de almacenamiento reutilizado

No se invento una estructura paralela. Se reutilizaron las tablas ya presentes en el dump:

- `acciones_auditoria`
- `auditoria_operaciones`
- `auditoria_detalles`

Adicionalmente, al iniciar `audit-service`, el repositorio aplica ajustes de compatibilidad sobre `auditoria_operaciones` para soportar:

- `usuario_nombre`
- `rol_usuario`
- `modulo`
- `detalle` como `jsonb`
- `id_sesion`

Tambien se crean indices para mejorar consulta por:

- fecha
- usuario
- modulo

Esto permite evolucionar el esquema sin romper la base existente.

---

## Eventos criticos integrados

### Auth Service

Se agrego emision asincrona a MS-09 para:

- `login_exitoso`
- `login_fallido`

Datos auditados:

- identificador usado en login
- usuario cuando existe
- rol
- resultado del intento
- motivo de fallo
- `sessionId` para login exitoso

Archivos principales:

- `services/auth-service/src/config/services.js`
- `services/auth-service/src/services/auth-audit-notifier.service.js`
- `services/auth-service/src/services/auth.service.js`
- `services/auth-service/src/app.js`

### User Service

Se agrego emision asincrona a MS-09 para:

- `crear_usuario`
- `modificar_usuario`
- `deshabilitar_usuario`

Datos auditados:

- actor que ejecuta la operacion
- entidad afectada
- detalle descriptivo
- datos previos
- datos nuevos

Archivos principales:

- `services/user-service/src/config/services.js`
- `services/user-service/src/services/user-audit-notifier.service.js`
- `services/user-service/src/services/user.service.js`
- `services/user-service/src/controllers/user.controller.js`
- `services/user-service/src/models/user.model.js`
- `services/user-service/src/app.js`

### Inventory Service

Se adapto la notificacion post-commit ya existente para que MS-09 reciba:

- `registrar_movimiento`
- `registrar_ajuste`

Datos auditados:

- usuario
- rol
- tipo de movimiento
- producto afectado
- cantidad
- motivo
- stock anterior
- stock posterior
- comentario y numero de factura cuando aplica

Archivos principales:

- `services/inventory-service/src/services/inventory-notifier.service.js`
- `services/inventory-service/src/services/inventory.service.js`

---

## Cambios en API Gateway

Se agrego soporte para auditoria en:

- `GET /api/audit/logs`

Reglas implementadas:

- el gateway valida token con `auth-service`
- el gateway restringe acceso a `Administrador`
- luego reenvia la solicitud al `audit-service`

Archivos principales:

- `api-gateway/src/routes/audit.routes.js`
- `api-gateway/src/config/services.js`
- `api-gateway/src/app.js`

---

## Cambios de infraestructura

### Docker Compose

Se agrego `audit-service` al `docker-compose.yml` con:

- puerto `3006`
- conexion a PostgreSQL
- enlace con `auth-service` para validacion de token

Tambien se configuraron las variables de webhook para que los microservicios emisores notifiquen a MS-09:

- `MS09_AUDIT_WEBHOOK_URL` en `auth-service`
- `MS09_AUDIT_WEBHOOK_URL` en `user-service`
- `MS09_MOVEMENT_WEBHOOK_URL` en `inventory-service`
- `AUDIT_SERVICE_URL` en `api-gateway`

### Dockerfile nuevo

Se agrego:

- `services/audit-service/Dockerfile`

---

## Estructura creada para MS-09

Archivos principales nuevos:

- `services/audit-service/package.json`
- `services/audit-service/.dockerignore`
- `services/audit-service/Dockerfile`
- `services/audit-service/server.js`
- `services/audit-service/src/app.js`
- `services/audit-service/src/config/db.js`
- `services/audit-service/src/config/services.js`
- `services/audit-service/src/controllers/audit.controller.js`
- `services/audit-service/src/middlewares/auth.middleware.js`
- `services/audit-service/src/models/audit.model.js`
- `services/audit-service/src/repositories/audit.repository.js`
- `services/audit-service/src/routes/audit.routes.js`
- `services/audit-service/src/services/audit.service.js`
- `services/audit-service/tests/audit.integration.test.js`

---

## Pruebas realizadas

### Validacion automatica por servicio

Se ejecutaron satisfactoriamente:

1. `services/auth-service`
2. `services/user-service`
3. `services/category-service`
4. `services/product-service`
5. `services/inventory-service`
6. `services/audit-service`
7. `api-gateway`

### Cobertura funcional validada

- login exitoso auditado
- login fallido auditado
- creacion de usuario auditada
- modificacion y deshabilitacion de usuario preservadas para auditoria
- registro de movimiento auditado
- registro de ajuste preparado en la misma via de auditoria
- consulta de logs por gateway
- restriccion de auditoria para operador
- filtros por modulo, usuario y fecha

### Ajuste tecnico para pruebas

Los scripts `npm test` quedaron configurados con `--test-isolation=none` porque en este entorno el runner aislado de Node generaba `EPERM` al abrir procesos hijo. El ajuste deja la verificacion automatica ejecutable dentro del entorno de trabajo actual sin cambiar la logica funcional.

---

## Resultado final

La rama deja funcional MS-09 dentro del proyecto integrado:

- registra eventos criticos de autenticacion, usuarios y movimientos
- conserva trazabilidad con usuario, fecha, accion, modulo y detalle
- mantiene operacion inmutable
- permite consulta paginada y filtrada
- restringe la visualizacion del historial al Administrador
- opera desde `api-gateway` como punto unico de acceso

La implementacion fue validada con pruebas automaticas de punta a punta y quedo integrada con la arquitectura actual del repositorio.
