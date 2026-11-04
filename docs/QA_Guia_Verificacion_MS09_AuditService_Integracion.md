# Guia QA - Verificacion de MS-09 Auditoria y Trazabilidad e Integracion por API Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Alcance:** Validacion funcional y tecnica de auditoria integrada con autenticacion, usuarios y movimientos  
**Ultima actualizacion:** 2026-04-23

---

## 1) Objetivo

Verificar que la implementacion de:

- `services/audit-service`
- `services/auth-service`
- `services/user-service`
- `services/inventory-service`
- `api-gateway`

cumple el contrato funcional para:

- registrar eventos criticos
- almacenar logs de forma inmutable
- consultar logs con filtros y paginacion
- restringir el acceso del historial al rol `Administrador`

---

## 2) Precondiciones

1. Tener Docker y Docker Compose disponibles.
2. Estar ubicado en la raiz del repositorio `tiendata`.
3. Levantar entorno limpio:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

4. Verificar disponibilidad de servicios:
   - `api-gateway` en `3000`
   - `auth-service` en `3002`
   - `category-service` en `3003`
   - `user-service` en `3004`
   - `inventory-service` en `3005`
   - `product-service` en `3001`
   - `audit-service` en `3006`

5. Usuario administrador demo esperado:

```text
correo: admin@tiendata.com
nombre_usuario: admin
contrasena: Admin1234
```

> Si Postgres mantiene volumen previo, el entorno puede no recrearse desde el SQL inicial.

---

## 3) Verificacion automatica

Ejecutar:

```bash
npm run verify:all
```

Resultado esperado:

- todas las suites en estado OK
- sin fallos en `auth`, `users`, `categories`, `products`, `inventory`, `audit` y `api-gateway`

---

## 4) Variables sugeridas en Postman

Crear un environment:

```text
baseUrl = http://localhost:3000
adminToken =
operatorToken =
```

Header comun para endpoints protegidos:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 5) Flujo recomendado de prueba manual

Orden sugerido:

1. Login fallido
2. Login admin exitoso
3. Login operador exitoso
4. Crear usuario
5. Registrar movimiento de inventario
6. Consultar logs como admin
7. Filtrar logs por modulo, usuario y fecha
8. Intentar consultar logs como operador

---

## 6) Casos de autenticacion auditables

### 6.1 Login fallido

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "admin",
  "contrasena": "incorrecta"
}
```

Resultado esperado:

- HTTP `401`
- error de credenciales invalidas
- el evento debe quedar auditado como `login_fallido`

### 6.2 Login admin exitoso

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "admin@tiendata.com",
  "contrasena": "Admin1234"
}
```

Resultado esperado:

- HTTP `200`
- `success = true`
- token en `data.token`
- guardar valor en `adminToken`
- el evento debe quedar auditado como `login_exitoso`

### 6.3 Login operador exitoso

Usar un operador existente o creado previamente.

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "operador",
  "contrasena": "Operador123"
}
```

Resultado esperado:

- HTTP `200`
- guardar valor en `operatorToken`

---

## 7) Casos de usuarios auditables

### 7.1 Crear usuario

```http
POST http://localhost:3000/api/users
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "nombre": "Operador QA",
  "correo": "operador.qa@tiendata.test",
  "contrasena": "Operador123",
  "id_rol": 2
}
```

Resultado esperado:

- HTTP `201`
- usuario creado sin contrasena en respuesta
- el evento debe quedar auditado como `crear_usuario`

### 7.2 Modificar usuario

```http
PUT http://localhost:3000/api/users/2
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "nombre": "Operador QA Editado"
}
```

Resultado esperado:

- HTTP `200`
- el evento debe quedar auditado como `modificar_usuario`

### 7.3 Deshabilitar usuario

```http
DELETE http://localhost:3000/api/users/2
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- borrado logico
- el evento debe quedar auditado como `deshabilitar_usuario`

---

## 8) Casos de inventario auditables

### 8.1 Registrar entrada

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <adminToken o operatorToken>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "entrada",
  "cantidad": 5,
  "numero_factura": "FAC-QA-001",
  "comentario": "Ingreso para prueba QA"
}
```

Resultado esperado:

- HTTP `201`
- aumenta el stock
- el evento debe quedar auditado como `registrar_movimiento`

### 8.2 Registrar salida

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <adminToken o operatorToken>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "salida",
  "cantidad": 2,
  "motivo": "Venta",
  "comentario": "Salida QA"
}
```

Resultado esperado:

- HTTP `201`
- disminuye el stock
- el evento debe quedar auditado como `registrar_movimiento`

### 8.3 Registrar ajuste con admin

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "ajuste",
  "cantidad": 1,
  "tipo_ajuste": "sobrante",
  "motivo_ajuste": "Conteo fisico",
  "comentario": "Ajuste QA"
}
```

Resultado esperado:

- HTTP `201`
- el evento debe quedar auditado como `registrar_ajuste`

### 8.4 Ajuste con operador

Usar el mismo payload anterior pero con `operatorToken`.

Resultado esperado:

- HTTP `403`
- codigo `INVENTORY_ADJUSTMENT_FORBIDDEN`
- no debe registrarse movimiento exitoso

---

## 9) Consulta de auditoria por gateway

### 9.1 Listado base de logs

```http
GET http://localhost:3000/api/audit/logs?page=1&size=20
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- estructura:

```json
{
  "success": true,
  "data": {
    "total": 0,
    "page": 1,
    "size": 20,
    "totalPages": 1,
    "logs": []
  }
}
```

- cada log debe incluir:
  - `id_log`
  - `accion`
  - `modulo`
  - `entidad`
  - `id_entidad`
  - `fecha`
  - `usuario`
  - `detalle`
  - `datos_previos`
  - `datos_nuevos`
  - `id_sesion`

### 9.2 Filtrar por modulo

```http
GET http://localhost:3000/api/audit/logs?modulo=usuarios
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- todos los registros devueltos deben pertenecer a `usuarios`

### 9.3 Filtrar por usuario

Por nombre:

```http
GET http://localhost:3000/api/audit/logs?usuario=Administrador
Authorization: Bearer <adminToken>
```

Por id:

```http
GET http://localhost:3000/api/audit/logs?usuario=1
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- logs correspondientes al usuario filtrado

### 9.4 Filtrar por fecha exacta

```http
GET http://localhost:3000/api/audit/logs?fecha=2026-04-23
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- solo eventos de esa fecha

### 9.5 Filtrar por rango de fechas

```http
GET http://localhost:3000/api/audit/logs?fecha_inicio=2026-04-20&fecha_fin=2026-04-23
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- solo eventos dentro del rango

### 9.6 Filtrar por accion

```http
GET http://localhost:3000/api/audit/logs?accion=login_exitoso
Authorization: Bearer <adminToken>
```

Resultado esperado:

- HTTP `200`
- solo eventos de esa accion

---

## 10) Restriccion por rol

### 10.1 Operador no puede consultar auditoria

```http
GET http://localhost:3000/api/audit/logs
Authorization: Bearer <operatorToken>
```

Resultado esperado:

- HTTP `403`
- codigo `AUTH_FORBIDDEN`

### 10.2 Sin token

```http
GET http://localhost:3000/api/audit/logs
```

Resultado esperado:

- HTTP `401`
- error de token ausente

---

## 11) Verificaciones funcionales clave

Validar sobre los logs generados:

- existe al menos un `login_fallido`
- existe al menos un `login_exitoso`
- existe al menos un `crear_usuario`
- existe al menos un `registrar_movimiento`
- si se hizo ajuste admin, existe `registrar_ajuste`
- los logs incluyen usuario, fecha, accion, modulo y detalle
- los registros no pueden modificarse ni eliminarse por API

---

## 12) Casos cubiertos automaticamente

### Audit Service

- registro de evento
- filtro de logs por usuario, fecha y modulo
- restriccion de consulta para operador

### API Gateway

- flujo integrado con auditoria:
  - login fallido
  - login exitoso
  - crear usuario
  - registrar movimiento
  - consultar logs
  - bloqueo por rol

### Verificacion global

- `npm run verify:all` cubre todos los servicios activos del backend

---

## 13) Checklist QA

- [ ] `docker compose up --build` levanta `audit-service`
- [ ] Login fallido retorna `401`
- [ ] Login fallido genera log de auditoria
- [ ] Login admin exitoso retorna `200`
- [ ] Login admin exitoso genera log
- [ ] Crear usuario retorna `201`
- [ ] Crear usuario genera log `crear_usuario`
- [ ] Modificar usuario genera log `modificar_usuario`
- [ ] Deshabilitar usuario genera log `deshabilitar_usuario`
- [ ] Entrada de inventario genera `registrar_movimiento`
- [ ] Salida de inventario genera `registrar_movimiento`
- [ ] Ajuste admin genera `registrar_ajuste`
- [ ] Ajuste operador retorna `403`
- [ ] `GET /api/audit/logs` con admin retorna `200`
- [ ] Filtro por modulo funciona
- [ ] Filtro por usuario funciona
- [ ] Filtro por fecha funciona
- [ ] Operador no puede consultar auditoria
- [ ] No existen endpoints de update o delete para logs
- [ ] `npm run verify:all` termina sin fallos

---

## 14) Evidencia esperada

Para cierre QA se recomienda adjuntar:

- salida completa de `npm run verify:all`
- captura o export Postman de:
  - login fallido
  - login exitoso
  - crear usuario
  - registrar movimiento
  - consultar logs
  - filtro por modulo
  - intento de consulta con operador
- evidencia de respuestas `401`, `403` y `200` en los casos de auditoria

---

## 15) Resultado esperado final

La integracion se considera aprobada cuando el sistema:

- registra trazabilidad de eventos criticos en tiempo real
- preserva inmutabilidad operativa de auditoria
- permite consulta segura y filtrada del historial
- restringe el acceso del historial al Administrador
- mantiene operativo el flujo integrado del backend a traves de `api-gateway`
