# Guía QA — Verificación de MS-02 (User Service)

**Proyecto:** INVENTARIO TIENDATA  
**Alcance:** Validación de gestión de usuarios (CRUD + reglas de negocio)  
**Última actualización:** 2026-04-08

---

## 1) Objetivo

Verificar que `services/user-service` cumple los requisitos funcionales de MS-02:

- CRUD de usuarios.
- Hash de contraseña con bcrypt.
- Paginación con filtros.
- Borrado lógico.
- Protección para que administrador no se deshabilite a sí mismo.

---

## 2) Precondiciones

1. Tener Node.js 18+ instalado.
2. Estar ubicado en la raíz del repositorio (`tiendata`).
3. Ejecutar bootstrap:

```bash
npm run setup:deps
```

4. Tener `services/user-service/.env` configurado (o usar `.env.example` como base).

---

## 3) Comando de verificación automática

```bash
npm run verify:ms02
```

Resultado esperado:

- 6 pruebas aprobadas.
- Sin fallos.

---

## 4) Matriz de casos cubiertos automáticamente

Archivo: `services/user-service/tests/user.integration.test.js`

1. `POST /api/users` crea usuario y persiste contraseña hasheada con bcrypt.
2. `GET /api/users` pagina y filtra correctamente por `estado`.
3. `PUT /api/users/:id` actualiza parcialmente campos opcionales.
4. `DELETE /api/users/:id` realiza borrado lógico (`estado=false`).
5. Un administrador no puede deshabilitarse a sí mismo (`409`).
6. `GET /api/users` responde por debajo de 1000ms en escenario local de prueba.

---

## 5) Pruebas manuales recomendadas

## 5.1 Iniciar servicio

```bash
cd services/user-service
npm start
```

## 5.2 Flujo mínimo de validación

1. Crear usuario:

```http
POST http://localhost:3003/api/users
Content-Type: application/json

{
  "nombre": "Operador QA",
  "correo": "operador.qa@stocker.test",
  "contrasena": "ClaveSegura123",
  "id_rol": 2
}
```

2. Listar paginado y filtrado:

```http
GET http://localhost:3003/api/users?page=1&size=10&estado=activo
```

3. Actualización parcial:

```http
PUT http://localhost:3003/api/users/2
Content-Type: application/json

{
  "nombre": "Operador QA Editado"
}
```

4. Borrado lógico:

```http
DELETE http://localhost:3003/api/users/2
x-user-id: 1
x-user-role: Administrador
```

5. Regla de negocio (debe fallar):

```http
PUT http://localhost:3003/api/users/1
x-user-id: 1
x-user-role: Administrador
Content-Type: application/json

{
  "estado": false
}
```

Resultado esperado: `409 ADMIN_SELF_DISABLE_FORBIDDEN`.

---

## 6) Criterios de aceptación QA

- [ ] CRUD ejecutable por API.
- [ ] Contraseña no se devuelve en respuestas.
- [ ] Filtro por estado y paginación funcionan.
- [ ] DELETE no elimina físicamente el registro.
- [ ] Regla de auto-deshabilitación de admin protegida con `409`.
- [ ] Suite automática MS-02 en verde.
