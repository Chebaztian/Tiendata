# Entregable Backend MS-03 — Servicio de Gestion de Categorias

**Proyecto:** INVENTARIO TIENDATA  
**Módulo principal:** MS-03 (Category Service)  
**Fecha:** 2026-04-10

---


## Objetivo
Implementar el microservicio MS-03 para la gestion de categorias, incluyendo:
- CRUD de categorias
- Unicidad de nombre case-insensitive
- Filtro por estado
- Borrado logico
- Validacion de categoria en uso por productos activos

## Cambios realizados
- Se implemento `category-service`
- Se agregaron rutas en `api-gateway`
- Se validaron roles:
  - Administrador: POST, PUT, DELETE
  - Administrador y Operador: GET
- Se agrego validacion de unicidad case-insensitive
- Se agrego validacion para impedir deshabilitar categorias con productos activos
- Se agregaron pruebas de integracion
- Se actualizo `docker-compose.yml`
- Se agrego indice unico case-insensitive en el script SQL inicial

## Archivos principales modificados
- `services/category-service/src/app.js`
- `services/category-service/src/controllers/category.controller.js`
- `services/category-service/src/services/category.service.js`
- `services/category-service/src/repositories/category.repository.js`
- `api-gateway/src/routes/category.routes.js`
- `api-gateway/src/app.js`
- `docker-compose.yml`
- `docker/postgres/init/01_backup_tiendatabd.sql`

## Reglas de negocio implementadas
- No permite nombres duplicados sin importar mayusculas o minusculas
- El filtro GET soporta `activo`, `inactivo` y `todos`
- DELETE realiza borrado logico
- Si una categoria tiene productos activos asociados, devuelve HTTP 409

## Pruebas realizadas
- Creacion de categoria
- Validacion de nombre duplicado
- Listado por estado
- Actualizacion de categoria
- Deshabilitacion logica
- Bloqueo por categoria en uso
- Validacion de permisos desde gateway

## Resultado
La implementacion fue validada con pruebas automáticas y el flujo del gateway.
