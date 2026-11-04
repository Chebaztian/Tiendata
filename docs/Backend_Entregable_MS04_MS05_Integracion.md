# Entregable Backend MS-04 + MS-05 — Productos, Movimientos de Inventario e Integracion por API Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Modulos principales:** MS-04 (Product Service), MS-05 (Inventory Movements Service), API Gateway  
**Fecha:** 2026-04-18

---

## Objetivo

Integrar sobre el repositorio principal:

- el merge funcional de `feature/MS-04-product-service` sobre `main`
- la implementacion completa de MS-05 para movimientos de inventario
- la exposicion de MS-04 y MS-05 a traves de `api-gateway`
- la validacion automatizada del flujo integrado con autenticacion, usuarios, categorias, productos y movimientos

---

## Resumen de lo realizado

Se trabajo sobre una rama nueva basada en `main`:

- `feature/MS-05-inventory-movements`

Sobre esa rama se realizo:

1. Merge de `origin/feature/MS-04-product-service`.
2. Ajuste de `product-service` para alinearlo con el esquema real de PostgreSQL del proyecto.
3. Implementacion completa de `inventory-service`, que en `main` estaba vacio.
4. Extension de `api-gateway` para enrutar:
   - `auth`
   - `users`
   - `categories`
   - `products`
   - `inventory`
5. Correccion de `auth-service` para login por `correo` o `nombre_usuario`.
6. Actualizacion de `docker-compose.yml`, Dockerfiles y script SQL de inicializacion.
7. Ejecucion de verificacion completa con:

```bash
npm run verify:all
```

Resultado esperado y confirmado:

- Auth Service: OK
- User Service: OK
- Category Service: OK
- Product Service: OK
- Inventory Service: OK
- API Gateway: OK

---

## Implementacion MS-04

### Alcance funcional aplicado

Se dejo funcional el servicio de productos con:

- creacion de productos
- consulta por id
- listado paginado
- actualizacion parcial
- borrado logico
- validacion de categoria activa
- validacion de unicidad de codigo de barras
- bloqueo de modificacion del codigo de barras
- advertencia cuando `precio_venta < precio_compra`

### Ajustes realizados sobre el MS-04 mergeado

El merge de la rama MS-04 incluia una implementacion valida en memoria, pero el esquema real del proyecto usa columnas distintas. Se alineo el servicio con la base real:

- `codigo_barras_unico` como columna persistida en `productos`
- `stock_actual`, `stock_minimo`, `stock_maximo`
- `fecha_vencimiento`
- `ubicacion`
- `descripcion`

Tambien se limito la paginacion a maximo `20` elementos por pagina, tal como exige el requerimiento.

### Archivos principales ajustados

- `services/product-service/src/models/product.model.js`
- `services/product-service/src/repositories/product.repository.js`
- `services/product-service/src/services/product.service.js`
- `services/product-service/tests/product.integration.test.js`

---

## Implementacion MS-05

### Alcance funcional implementado

Se implemento `inventory-service` completo con:

- registro de `entrada`
- registro de `salida`
- registro de `ajuste`
- validacion de `cantidad > 0`
- validacion de stock no negativo
- restriccion de ajustes solo para `Administrador`
- lectura del usuario autenticado desde `auth-service`
- consulta de movimientos con filtros por:
  - fecha
  - producto
  - tipo
- persistencia transaccional usando PostgreSQL
- soporte de repositorio en memoria para pruebas
- notificacion asincrona post-commit para MS-06 y MS-09 via webhook configurable

### Reglas de negocio aplicadas

- el stock nunca puede quedar negativo
- `Operador` puede registrar entradas y salidas
- solo `Administrador` puede registrar ajustes
- los movimientos se insertan de forma atomica
- la fecha y hora se generan desde el servidor
- la consulta devuelve trazabilidad con:
  - producto
  - usuario
  - stock anterior
  - nuevo stock
  - motivo

### Integracion con el esquema real de base de datos

La implementacion no inventa una tabla nueva: usa las tablas existentes del dump del proyecto:

- `productos`
- `movimientos_inventario`
- `motivos_movimiento`
- `ajustes_inventario`
- `proveedores`

Tambien se agrego validacion previa de proveedor para evitar exponer errores SQL crudos cuando `id_proveedor` no existe.

### Archivos principales creados o completados

- `services/inventory-service/package.json`
- `services/inventory-service/server.js`
- `services/inventory-service/src/app.js`
- `services/inventory-service/src/config/db.js`
- `services/inventory-service/src/config/services.js`
- `services/inventory-service/src/controllers/inventory.controller.js`
- `services/inventory-service/src/middlewares/auth.middleware.js`
- `services/inventory-service/src/models/inventory.model.js`
- `services/inventory-service/src/repositories/inventory.repository.js`
- `services/inventory-service/src/routes/inventory.routes.js`
- `services/inventory-service/src/services/inventory.service.js`
- `services/inventory-service/src/services/inventory-notifier.service.js`
- `services/inventory-service/tests/inventory.integration.test.js`

---

## Cambios en API Gateway

### Nuevas integraciones expuestas

Se extendio el gateway para incluir:

- `/api/products`
- `/api/inventory/movements`

ademas de preservar:

- `/api/auth`
- `/api/users`
- `/api/categories`

### Permisos por rol implementados

- `Administrador`
  - puede crear, actualizar y eliminar productos
  - puede registrar entradas, salidas y ajustes
- `Operador`
  - puede consultar productos
  - puede registrar entradas y salidas
  - no puede registrar ajustes

### Mejora adicional

Se corrigio el reenvio de headers de contexto autenticado:

- `x-user-id`
- `x-user-role`
- `x-user-name`

Esto evita que reglas de negocio de `user-service` se pierdan al pasar por gateway.

### Archivos principales modificados

- `api-gateway/src/app.js`
- `api-gateway/src/config/services.js`
- `api-gateway/src/routes/category.routes.js`
- `api-gateway/src/routes/user.routes.js`
- `api-gateway/src/routes/product.routes.js`
- `api-gateway/src/routes/inventory.routes.js`
- `api-gateway/tests/gateway-full.integration.test.js`

---

## Cambios en Auth Service

Se detecto una inconsistencia entre implementacion y pruebas/flujo real:

- el servicio autenticaba por `correo`
- el gateway y el flujo operativo usan `nombre_usuario`

Se corrigio para aceptar ambos identificadores:

- `correo`
- `nombre_usuario`

Archivos ajustados:

- `services/auth-service/src/models/auth.model.js`
- `services/auth-service/src/repositories/auth.repository.js`
- `services/auth-service/src/repositories/pg.auth.repository.js`
- `services/auth-service/src/services/auth.service.js`
- `services/auth-service/src/app.js`

---

## Cambios de infraestructura y datos

### Docker

Se actualizo `docker-compose.yml` para levantar:

- `auth-service`
- `user-service`
- `category-service`
- `product-service`
- `inventory-service`
- `api-gateway`
- `postgres`

Tambien se agregaron Dockerfiles faltantes para:

- `services/product-service`
- `services/inventory-service`

### Script SQL

Se ajusto `docker/postgres/init/01_backup_tiendatabd.sql` para:

- corregir el `INSERT` final del usuario demo usando `public.usuarios`
- evitar fallo por conflicto con `ON CONFLICT (correo) DO NOTHING`
- permitir ajustes de stock correctos en la funcion `actualizar_stock()`
- eliminar la restriccion de BD que bloqueaba `precio_venta < precio_compra`, ya que el requerimiento pide advertencia y no bloqueo

---

## Pruebas realizadas

### Servicios validados automaticamente

1. `services/auth-service`
2. `services/user-service`
3. `services/category-service`
4. `services/product-service`
5. `services/inventory-service`
6. `api-gateway`

### Cobertura funcional validada

- login exitoso
- verificacion de token
- revocacion y refresh de token
- CRUD base de usuarios
- CRUD base de categorias
- CRUD base de productos
- control de permisos por rol
- entrada de inventario
- salida de inventario
- bloqueo de ajuste para operador
- filtro de movimientos por producto, fecha y tipo
- flujo integrado por gateway

---

## Resultado final

La rama de trabajo deja funcional el flujo integrado del sistema para:

- autenticacion
- gestion de usuarios
- gestion de categorias
- gestion de productos
- movimientos de inventario
- consumo centralizado por `api-gateway`

La implementacion fue verificada con pruebas automaticas y quedo alineada con el esquema real de la base de datos del proyecto.
