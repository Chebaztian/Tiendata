# Guia QA - Verificacion de MS-03 (Servicio de Gestion de Categorias)

**Proyecto:** INVENTARIO TIENDATA  
**Alcance:** Validacion funcional y tecnica de CRUD de categorias, reglas de negocio, permisos y exposicion por API Gateway  
**Ultima actualizacion:** 2026-04-10

---

## 1) Objetivo

Verificar que la implementacion de:

- `services/category-service`
- `api-gateway`

cumple el contrato funcional de MS-03 para gestion de categorias, incluyendo:

- creacion
- consulta
- actualizacion
- deshabilitacion logica
- validacion de unicidad case-insensitive
- proteccion cuando la categoria tiene productos activos asociados
- control de acceso por rol

---

## 2) Precondiciones

1. Tener Node.js 18+ instalado.
2. Estar ubicado en la raiz del repositorio (`tiendata`).
3. Ejecutar instalacion de dependencias:

```bash
npm run setup:deps
```

4. Si se valida con Docker, levantar entorno limpio para aplicar cambios de base de datos:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

5. Servicios esperados:
   - `auth-service` en puerto `3002`
   - `category-service` en puerto `3003`
   - `api-gateway` en puerto `3000`

> Nota: si ya existia el volumen de PostgreSQL, usar `down -v` para forzar la reinicializacion del script SQL.

---

## 3) Comando unico de verificacion

Ejecutar:

```bash
npm run verify:all
```

Resultado esperado:

- Auth Service: pruebas aprobadas
- Category Service: pruebas aprobadas
- API Gateway: pruebas aprobadas
- Sin fallos

---

## 4) Matriz de casos validados automaticamente

### 4.1 Category Service (`services/category-service/tests/category.integration.test.js`)

1. `POST /api/categories` crea una categoria nueva y retorna `201`.
2. `POST /api/categories` rechaza nombres duplicados case-insensitive con `409`.
3. `GET /api/categories` devuelve solo categorias activas por defecto.
4. `GET /api/categories?estado=todos` devuelve categorias activas e inactivas.
5. `PUT /api/categories/:id` retorna `409` si se intenta deshabilitar una categoria con productos activos.
6. `DELETE /api/categories/:id` realiza borrado logico cuando no existen productos activos asociados.

### 4.2 API Gateway (`api-gateway/tests/gateway-category.integration.test.js`)

1. Un usuario Administrador puede crear categorias por gateway.
2. Un usuario Operador puede consultar categorias por gateway.
3. Un usuario Operador no puede crear categorias y recibe `403`.

---

## 5) Pruebas manuales recomendadas

### 5.1 Login para obtener token

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
- respuesta con token JWT

---

### 5.2 Crear categoria

```http
POST http://localhost:3000/api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre_categoria": "Lacteos",
  "descripcion": "Cadena de frio"
}
```

Resultado esperado:
- HTTP `201`
- mensaje: `Categoria creada correctamente`

---

### 5.3 Validar unicidad case-insensitive

```http
POST http://localhost:3000/api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre_categoria": "LACTEOS",
  "descripcion": "Duplicado"
}
```

Resultado esperado:
- HTTP `409`
- mensaje de error: `El nombre de categoria ya existe`

---

### 5.4 Consultar categorias activas por defecto

```http
GET http://localhost:3000/api/categories
Authorization: Bearer <token>
```

Resultado esperado:
- HTTP `200`
- solo categorias con estado `activo`

---

### 5.5 Consultar categorias inactivas

```http
GET http://localhost:3000/api/categories?estado=inactivo
Authorization: Bearer <token>
```

Resultado esperado:
- HTTP `200`
- solo categorias con estado `inactivo`

---

### 5.6 Consultar todas las categorias

```http
GET http://localhost:3000/api/categories?estado=todos
Authorization: Bearer <token>
```

Resultado esperado:
- HTTP `200`
- categorias activas e inactivas

---

### 5.7 Actualizar categoria

```http
PUT http://localhost:3000/api/categories/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "descripcion": "Nueva descripcion"
}
```

Resultado esperado:
- HTTP `200`
- mensaje: `Categoria actualizada correctamente`

---

### 5.8 Deshabilitar categoria sin productos activos

```http
DELETE http://localhost:3000/api/categories/1
Authorization: Bearer <token>
```

Resultado esperado:
- HTTP `200`
- mensaje: `Categoria deshabilitada`

Verificacion posterior:
- la categoria no debe desaparecer fisicamente
- debe aparecer en `GET ?estado=inactivo`

---

### 5.9 Intentar deshabilitar categoria en uso

Precondicion:
- debe existir al menos un producto activo asociado a la categoria

```http
DELETE http://localhost:3000/api/categories/1
Authorization: Bearer <token>
```

Resultado esperado:
- HTTP `409`
- mensaje de error: `No se puede deshabilitar: hay productos activos en esta categoria`

---

### 5.10 Validar permisos por rol

#### Operador consulta categorias

```http
GET http://localhost:3000/api/categories
Authorization: Bearer <token_operador>
```

Resultado esperado:
- HTTP `200`

#### Operador intenta crear categoria

```http
POST http://localhost:3000/api/categories
Authorization: Bearer <token_operador>
Content-Type: application/json

{
  "nombre_categoria": "Bebidas"
}
```

Resultado esperado:
- HTTP `403`

#### Operador intenta actualizar o eliminar

Resultado esperado:
- HTTP `403`

---

## 6) Criterios de aceptacion QA

- [ ] `POST /api/categories` crea categorias correctamente.
- [ ] No se permiten nombres duplicados sin importar mayusculas o minusculas.
- [ ] `GET /api/categories` devuelve activas por defecto.
- [ ] `GET /api/categories?estado=inactivo` devuelve solo inactivas.
- [ ] `GET /api/categories?estado=todos` devuelve todas.
- [ ] `PUT /api/categories/:id` permite actualizar nombre, descripcion o estado.
- [ ] `DELETE /api/categories/:id` realiza borrado logico, no eliminacion fisica.
- [ ] No se puede deshabilitar una categoria con productos activos asociados.
- [ ] El sistema retorna `409` cuando existe conflicto de negocio.
- [ ] El gateway aplica permisos por rol correctamente.

---

## 7) Riesgos y observaciones

1. La proteccion de categoria en uso depende de la consulta de productos activos asociados.
2. Para validar el caso `409` de categoria en uso, QA necesita datos de prueba con productos activos.
3. Si PostgreSQL reutiliza volumen previo, cambios en el SQL inicial pueden no aplicarse automaticamente.
4. La validacion definitiva debe cubrir tanto servicio directo como exposicion por gateway.

---

## 8) Evidencia esperada para cierre QA

- Salida de `npm run verify:all` con pruebas aprobadas.
- Capturas o export de Postman del flujo:
  - login
  - crear categoria
  - duplicado case-insensitive
  - consulta por estado
  - actualizacion
  - borrado logico
  - conflicto `409` por categoria en uso
- Registro de prueba con usuario Operador mostrando `403` en operaciones de escritura.

---

## 9) Resultado esperado final

MS-03 se considera validado cuando:

- el CRUD de categorias funciona segun contrato
- la unicidad del nombre es case-insensitive
- el filtro por estado responde correctamente
- la eliminacion es logica
- no se permite deshabilitar categorias con productos activos
- el gateway respeta autenticacion y autorizacion por rol
