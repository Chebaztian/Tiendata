# Guía de integración Frontend — MS-02 User Service

**Proyecto:** INVENTARIO TIENDATA  
**Ámbito:** Consumo desde cliente web de la gestión de usuarios  
**Última actualización:** 2026-04-08

---

## 1) Objetivo

Definir el contrato para que frontend consuma el módulo de usuarios (MS-02) de forma consistente y sin exponer datos sensibles.

Base URL local recomendada del servicio:

```text
http://localhost:3003
```

> Nota: en integración con gateway, estos endpoints deben publicarse bajo una ruta unificada (por ejemplo `/api/users`).

---

## 2) Endpoints disponibles

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/users` | Crear usuario |
| GET | `/api/users` | Listar usuarios con paginación y filtros |
| GET | `/api/users/:id` | Obtener detalle de usuario |
| PUT | `/api/users/:id` | Actualización parcial de usuario |
| DELETE | `/api/users/:id` | Borrado lógico (deshabilitar) |

---

## 3) Contratos de request/response

## 3.1 Crear usuario

### Request

```http
POST /api/users
Content-Type: application/json

{
  "nombre": "Operador de Bodega",
  "correo": "operador@tiendata.test",
  "contrasena": "ClaveSegura123",
  "id_rol": 2,
  "estado": "activo"
}
```

### Response exitosa (201)

```json
{
  "success": true,
  "data": {
    "id_usuario": 10,
    "id_rol": 2,
    "nombre": "Operador de Bodega",
    "correo": "operador@tiendata.test",
    "estado": true,
    "fecha_creacion": "2026-04-08T20:30:00.000Z",
    "ultimo_acceso": null,
    "intentos_fallidos": 0,
    "bloqueado": false
  }
}
```

## 3.2 Listar usuarios paginados

### Request

```http
GET /api/users?page=1&size=10&estado=activo
```

### Response exitosa (200)

```json
{
  "success": true,
  "data": {
    "total": 25,
    "page": 1,
    "size": 10,
    "totalPages": 3,
    "items": [
      {
        "id_usuario": 1,
        "id_rol": 1,
        "nombre": "Administrador",
        "correo": "admin@tiendata.test",
        "estado": true,
        "fecha_creacion": "2026-04-01T10:00:00.000Z",
        "ultimo_acceso": null,
        "intentos_fallidos": 0,
        "bloqueado": false
      }
    ]
  }
}
```

## 3.3 Actualización parcial

### Request

```http
PUT /api/users/2
Content-Type: application/json

{
  "nombre": "Operador Turno Noche",
  "estado": "inactivo"
}
```

### Response exitosa (200)

```json
{
  "success": true,
  "data": {
    "id_usuario": 2,
    "id_rol": 2,
    "nombre": "Operador Turno Noche",
    "correo": "operador@tiendata.test",
    "estado": false
  }
}
```

## 3.4 Borrado lógico

### Request

```http
DELETE /api/users/2
x-user-id: 1
x-user-role: Administrador
```

### Response exitosa (200)

```json
{
  "success": true,
  "data": {
    "id_usuario": 2,
    "estado": false
  }
}
```

---

## 4) Regla de negocio crítica

Si un administrador intenta deshabilitar su propio usuario, la API debe responder:

- HTTP `409`
- `error.code = "ADMIN_SELF_DISABLE_FORBIDDEN"`

Ejemplo de respuesta:

```json
{
  "success": false,
  "error": {
    "code": "ADMIN_SELF_DISABLE_FORBIDDEN",
    "message": "Un administrador no puede deshabilitarse a sí mismo"
  }
}
```

---

## 5) Recomendaciones para frontend

1. Mantener paginación en estado global (`page`, `size`, `estado`).
2. Normalizar respuestas de lista en un adaptador (`items`, `total`, `totalPages`).
3. Para deshabilitar usuario, mostrar confirmación explícita antes de llamar `DELETE`.
4. Mapear códigos de error a mensajes de UI:
   - `USER_NOT_FOUND`
   - `USER_EMAIL_ALREADY_EXISTS`
   - `VALIDATION_ERROR`
   - `ADMIN_SELF_DISABLE_FORBIDDEN`

---

## 6) Lista de verificación para integración frontend

- [ ] Alta de usuario funcional desde formulario.
- [ ] Tabla de usuarios con paginación real y filtro por estado.
- [ ] Edición parcial sin sobreescribir campos no enviados.
- [ ] Flujo de deshabilitación (DELETE lógico) funcionando.
- [ ] Manejo de error `ADMIN_SELF_DISABLE_FORBIDDEN` validado en UI.
- [ ] Contraseña nunca renderizada ni almacenada en estado de frontend.
