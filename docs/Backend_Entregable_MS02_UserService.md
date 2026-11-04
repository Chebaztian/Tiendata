# Entregable Backend MS-02 — User Service

**Proyecto:** INVENTARIO TIENDATA  
**Módulo principal:** MS-02 (Gestión de usuarios)  
**Responsable:** Juan Nicolás Urrutia  
**Rama objetivo:** `feature/MS-02-user-service`

---

## 1. Alcance

Se implementa el microservicio `services/user-service` con arquitectura por capas para cubrir el alcance funcional de MS-02:

- CRUD de usuarios.
- Hash de contraseña con bcrypt.
- GET paginado con filtros por estado.
- Actualización parcial de campos opcionales.
- Borrado lógico (deshabilitar usuario sin eliminar registro).
- Regla de negocio: un administrador no puede deshabilitarse a sí mismo.

---

## 2. Endpoints implementados

Base: `/api/users`

- `POST /api/users` → crear usuario.
- `GET /api/users` → listar usuarios paginados (`page`, `size`, `estado`).
- `GET /api/users/:id` → obtener usuario por id.
- `PUT /api/users/:id` → actualización parcial.
- `DELETE /api/users/:id` → borrado lógico (`estado=false`).

---

## 3. Estructura técnica

```text
services/user-service/
├─ src/
│  ├─ app.js
│  ├─ config/db.js
│  ├─ controllers/user.controller.js
│  ├─ models/user.model.js
│  ├─ repositories/user.repository.js
│  ├─ routes/user.routes.js
│  └─ services/user.service.js
├─ tests/user.integration.test.js
├─ server.js
├─ package.json
└─ .env.example
```

---

## 4. Decisiones de diseño

1. **Capa de repositorio dual (PostgreSQL + InMemory)**
   - `PgUserRepository` para ejecución real contra base de datos.
   - `InMemoryUserRepository` para pruebas de integración determinísticas.

2. **Validación de negocio en servicio**
   - La regla crítica (admin no se auto-deshabilita) vive en `user.service.js` para mantener control de dominio fuera del controlador.

3. **Sanitización de respuesta**
   - Nunca se expone la contraseña hash en respuestas API.

---

## 5. Variables de entorno

Archivo recomendado: `services/user-service/.env` (tomando como base `.env.example`)

Variables mínimas:

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `USER_REPOSITORY` (`postgres` o `inmemory`)

---

## 6. Ejecución y pruebas

Desde la raíz del repositorio:

```bash
npm run setup:deps
npm run verify:ms02
```

Comando directo por servicio:

```bash
npm --prefix services/user-service test
```

---

## 7. Criterios de aceptación cubiertos

- [x] CRUD de usuarios operativo.
- [x] Contraseña almacenada con hash bcrypt.
- [x] GET paginado con filtros `page`, `size`, `estado`.
- [x] PUT con actualización parcial.
- [x] DELETE lógico sin borrado físico.
- [x] Validación de negocio para evitar auto-deshabilitación de admin.
- [x] Suite de pruebas de integración para flujo MS-02.

---

## 8. Documentación complementaria

- `docs/QA_Guia_Verificacion_MS02_UserService.md`
- `docs/Frontend_Integracion_MS02_UserService.md`
