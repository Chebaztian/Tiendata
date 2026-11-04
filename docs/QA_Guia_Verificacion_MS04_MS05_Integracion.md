# Guia QA - Verificacion de MS-04 + MS-05 e Integracion por API Gateway

**Proyecto:** INVENTARIO TIENDATA  
**Alcance:** Validacion funcional y tecnica de productos, movimientos de inventario y exposicion integrada por API Gateway  
**Ultima actualizacion:** 2026-04-18

---

## 1) Objetivo

Verificar que la implementacion integrada de:

- `services/product-service`
- `services/inventory-service`
- `api-gateway`
- `auth-service`

cumple el contrato funcional para:

- login y autenticacion
- gestion de productos
- movimientos de inventario
- control de permisos por rol
- integracion con usuarios y categorias ya existentes

---

## 2) Precondiciones

1. Tener Docker y Docker Compose disponibles.
2. Estar ubicado en la raiz del repositorio `tiendata`.
3. Levantar entorno limpio para aplicar cambios SQL y servicios:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

4. Esperar que esten disponibles:
   - `api-gateway` en `3000`
   - `auth-service` en `3002`
   - `category-service` en `3003`
   - `user-service` en `3004`
   - `inventory-service` en `3005`
   - `product-service` en `3001`

5. Usuario administrador demo esperado tras inicializacion:

```text
correo: admin@tiendata.com
nombre_usuario: admin
contrasena: Admin1234
```

> Si el volumen de Postgres no se elimina, el SQL inicial no se vuelve a ejecutar.

---

## 3) Verificacion automatica

Ejecutar:

```bash
npm run verify:all
```

Resultado esperado:

- todas las suites en estado OK
- sin fallos en auth, users, categories, products, inventory y gateway

---

## 4) Coleccion minima de pruebas manuales

Las siguientes pruebas deben ejecutarse idealmente desde Postman usando:

```text
baseUrl = http://localhost:3000
token =
```

Header comun para endpoints protegidos:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 5) Login y autenticacion

### 5.1 Login con administrador

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "nombre_usuario": "admin",
  "contrasena": "Admin1234"
}
```

Resultado esperado:

- HTTP `200`
- `success = true`
- respuesta con `data.token`

### 5.2 Verificacion de token

```http
GET http://localhost:3000/api/auth/verify
Authorization: Bearer <token>
```

Resultado esperado:

- HTTP `200`
- `valid = true`

---

## 6) Usuarios

### 6.1 Crear usuario operador

```http
POST http://localhost:3000/api/users
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "nombre": "Operador Uno",
  "correo": "operador1@tiendata.test",
  "contrasena": "Operador123",
  "id_rol": 2
}
```

Resultado esperado:

- HTTP `201`
- usuario creado sin exponer contraseña

### 6.2 Listar usuarios

```http
GET http://localhost:3000/api/users?page=1&size=10
Authorization: Bearer <token_admin>
```

Resultado esperado:

- HTTP `200`
- respuesta paginada

---

## 7) Categorias

### 7.1 Crear categoria

```http
POST http://localhost:3000/api/categories
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "nombre_categoria": "Bebidas",
  "descripcion": "Productos frios"
}
```

Resultado esperado:

- HTTP `201`
- mensaje de categoria creada

### 7.2 Validar duplicado

```http
POST http://localhost:3000/api/categories
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "nombre_categoria": "BEBIDAS",
  "descripcion": "Duplicado"
}
```

Resultado esperado:

- HTTP `409`

---

## 8) Productos

### 8.1 Crear producto

```http
POST http://localhost:3000/api/products
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "codigo_barras": "7501234567890",
  "nombre": "Agua Mineral 500ml",
  "id_categoria": 1,
  "precio_compra": 10,
  "precio_venta": 15,
  "stock_inicial": 20,
  "stock_minimo": 5,
  "stock_maximo": 100,
  "fecha_vencimiento": "2026-12-31",
  "ubicacion": "Pasillo A",
  "descripcion": "Botella 500ml"
}
```

Resultado esperado:

- HTTP `201`
- producto creado
- `stock_actual = 20`

### 8.2 Crear producto con precio de venta menor al de compra

```http
POST http://localhost:3000/api/products
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "codigo_barras": "7501234567891",
  "nombre": "Producto Advertencia",
  "id_categoria": 1,
  "precio_compra": 20,
  "precio_venta": 18,
  "stock_inicial": 4
}
```

Resultado esperado:

- HTTP `201`
- producto creado
- respuesta con `warning`

### 8.3 Validar codigo de barras duplicado

Resultado esperado:

- HTTP `409`

### 8.4 Listar productos

```http
GET http://localhost:3000/api/products?page=1&size=10
Authorization: Bearer <token_admin>
```

Resultado esperado:

- HTTP `200`
- lista paginada
- maximo 20 productos por pagina

### 8.5 Actualizar producto

```http
PUT http://localhost:3000/api/products/1
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "nombre": "Agua Mineral 600ml",
  "precio_venta": 18,
  "stock_minimo": 8
}
```

Resultado esperado:

- HTTP `200`

### 8.6 Intentar modificar codigo de barras

```http
PUT http://localhost:3000/api/products/1
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "codigo_barras": "7501234567000"
}
```

Resultado esperado:

- HTTP `409`

### 8.7 Borrado logico de producto

```http
DELETE http://localhost:3000/api/products/1
Authorization: Bearer <token_admin>
```

Resultado esperado:

- HTTP `200`
- el producto no debe aparecer en el listado activo

---

## 9) Movimientos de inventario

### 9.1 Registrar entrada sin proveedor

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token_operador_o_admin>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "entrada",
  "cantidad": 10,
  "numero_factura": "FAC-001",
  "comentario": "Ingreso por compra"
}
```

Resultado esperado:

- HTTP `201`
- se incrementa el stock

### 9.2 Registrar entrada con proveedor inexistente

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token_operador_o_admin>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "entrada",
  "cantidad": 5,
  "id_proveedor": 999,
  "numero_factura": "FAC-404"
}
```

Resultado esperado:

- HTTP `404`
- codigo de error: `SUPPLIER_NOT_FOUND`

### 9.3 Registrar salida valida

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token_operador_o_admin>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "salida",
  "cantidad": 3,
  "motivo": "Venta",
  "comentario": "Venta mostrador"
}
```

Resultado esperado:

- HTTP `201`
- disminuye el stock

### 9.4 Registrar salida con stock insuficiente

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token_operador_o_admin>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "salida",
  "cantidad": 999,
  "motivo": "Venta"
}
```

Resultado esperado:

- HTTP `422`
- codigo de error: `INSUFFICIENT_STOCK`

### 9.5 Registrar ajuste con administrador

```http
POST http://localhost:3000/api/inventory/movements
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "id_producto": 1,
  "tipo_movimiento": "ajuste",
  "cantidad": 2,
  "tipo_ajuste": "sobrante",
  "motivo_ajuste": "Conteo fisico",
  "comentario": "Sobrante detectado"
}
```

Resultado esperado:

- HTTP `201`

### 9.6 Registrar ajuste con operador

Misma solicitud anterior, pero con token de operador.

Resultado esperado:

- HTTP `403`
- codigo de error: `INVENTORY_ADJUSTMENT_FORBIDDEN`

### 9.7 Consultar movimientos

```http
GET http://localhost:3000/api/inventory/movements?page=1&size=10
Authorization: Bearer <token_admin>
```

Resultado esperado:

- HTTP `200`
- lista paginada de movimientos

### 9.8 Filtrar movimientos por producto

```http
GET http://localhost:3000/api/inventory/movements?producto=1
Authorization: Bearer <token_admin>
```

### 9.9 Filtrar movimientos por tipo

```http
GET http://localhost:3000/api/inventory/movements?tipo=entrada
Authorization: Bearer <token_admin>
```

### 9.10 Filtrar movimientos por fecha

```http
GET http://localhost:3000/api/inventory/movements?fecha=2026-04-18
Authorization: Bearer <token_admin>
```

Resultado esperado en filtros:

- HTTP `200`
- solo los registros que cumplan la condicion

---

## 10) Validacion de permisos por rol

### Administrador

Debe poder:

- crear usuarios
- crear categorias
- crear, editar y eliminar productos
- registrar entradas
- registrar salidas
- registrar ajustes
- consultar movimientos

### Operador

Debe poder:

- iniciar sesion
- consultar categorias
- consultar productos
- registrar entradas
- registrar salidas
- consultar movimientos

No debe poder:

- crear categorias
- crear productos
- eliminar productos
- registrar ajustes

---

## 11) Casos cubiertos automaticamente

### Auth Service

- login exitoso
- bloqueo tras intentos fallidos
- verify de token
- logout
- refresh

### User Service

- creacion
- listado paginado
- actualizacion parcial
- borrado logico
- proteccion para admin sobre si mismo

### Category Service

- creacion
- duplicado case-insensitive
- filtro por estado
- validacion de categoria en uso
- borrado logico

### Product Service

- creacion
- warning de precio
- duplicado de barcode
- validacion de categoria
- paginacion y filtros
- actualizacion parcial
- borrado logico

### Inventory Service

- entrada valida
- salida sin stock suficiente
- bloqueo de ajustes para operador
- proveedor inexistente
- filtros de consulta

### API Gateway

- permisos por rol en categorias
- flujo integrado:
  - login
  - usuarios
  - categorias
  - productos
  - movimientos

---

## 12) Checklist QA

- [ ] Login admin funciona
- [ ] Verify token funciona
- [ ] Creacion de usuario funciona
- [ ] Creacion de categoria funciona
- [ ] Categoria duplicada retorna `409`
- [ ] Creacion de producto funciona
- [ ] Producto con precio de venta menor devuelve warning
- [ ] Codigo de barras duplicado retorna `409`
- [ ] Listado de productos pagina correctamente
- [ ] No se puede cambiar codigo de barras
- [ ] Borrado de producto es logico
- [ ] Entrada de inventario incrementa stock
- [ ] Salida valida descuenta stock
- [ ] Salida sin stock suficiente retorna `422`
- [ ] Ajuste admin funciona
- [ ] Ajuste operador retorna `403`
- [ ] Entrada con proveedor inexistente retorna `404`
- [ ] Filtros de movimientos funcionan
- [ ] Operador consulta pero no ejecuta acciones restringidas
- [ ] `npm run verify:all` termina sin fallos

---

## 13) Evidencia esperada

Para cierre QA se recomienda adjuntar:

- salida de `npm run verify:all`
- capturas o export de Postman de:
  - login
  - crear categoria
  - crear producto
  - registrar entrada
  - registrar salida
  - intento de ajuste con operador
  - filtro de movimientos
- evidencia de `403`, `404`, `409` y `422` en casos negativos

---

## 14) Resultado esperado final

La integracion se considera aprobada cuando el sistema permite operar correctamente desde `api-gateway`:

- autenticacion
- usuarios
- categorias
- productos
- movimientos de inventario

y al mismo tiempo respeta las reglas de negocio, restricciones por rol y validaciones de consistencia de datos.
