# Entregable Backend MS-12 - Servicio de Exportacion

**Proyecto:** INVENTARIO TIENDATA  
**Modulo principal:** MS-12 (Export Service)  
**Rama de trabajo:** `feature/MS-12-export-service`  
**Base integrada:** `feature/MS-07-reports-service`  
**Fecha:** 2026-05-04

---

## Objetivo

Implementar el servicio de exportacion masiva de datos para permitir descargas en distintos formatos, con control de acceso, filtrado por criterios funcionales, exclusion de campos sensibles y manejo de errores esperado por el negocio.

---

## Resumen de lo realizado

Se preparo el repositorio principal y se integro la rama de MS-07 antes de construir MS-12.

Trabajos realizados:


1. Implementacion de MS-12 como servicio dedicado en `services/export-service`.
2. Exposicion de `POST /api/export` desde el gateway como proxy hacia el nuevo servicio.
3. Integracion con MS-07 para obtener datos de movimientos desde su endpoint de reportes.
4. Validacion de roles para que solo `Administrador` pueda exportar.
5. Generacion de archivos temporales para descarga y limpieza posterior.
6. Cobertura automatizada con pruebas de integracion.

---

## Alcance funcional implementado

### Endpoint principal

- `POST /api/export`

### Formatos soportados

- `CSV`
- `JSON`
- `PDF`
- `Excel`

### Conjunto de datos

- `productos`
- `movimientos`
- `proveedores`
- `categorias`
- `todo`

### Filtros soportados

- `fecha_inicio`
- `fecha_fin`
- `id_categoria`

### Seguridad

- validacion de JWT
- restriccion por rol `Administrador`
- exclusion automatica de campos sensibles

### Respuestas de negocio

- `404` cuando no hay datos
- `413` cuando se supera el limite de 100000 registros
- `403` cuando el usuario no tiene permisos
- `400` ante formato o parametros invalidos

---

## Integracion con MS-07

Se verifico que MS-12 recibe datos desde MS-07 para el caso de `movimientos`.

El servicio consulta el reporte de movimientos a traves de:

- `GET /api/inventory/reports/movements`

Esto permite que la exportacion use el origen de reportes definido por MS-07 para ese conjunto de datos.

---

## Exclusion de campos sensibles

La implementacion elimina automaticamente campos sensibles antes de generar el archivo exportado.

Se cubre de forma recursiva para evitar que se serialicen valores como:

- contrasenas
- hashes
- tokens
- sesiones

---

## Manejo de errores y datos vacios

Se implementaron las validaciones pedidas:

- si el formato no es valido, responde `400`
- si el usuario no tiene rol Administrador, responde `403`
- si no hay registros, responde `404`
- si el volumen supera 100000 registros, responde `413`

---

## Limpieza de archivos temporales

Los archivos exportados se generan como temporales para descarga y se eliminan:

- despues de una descarga exitosa
- o automaticamente tras 1 hora

---

## Pruebas realizadas

Se agregaron pruebas para validar:

- generacion de CSV
- generacion de PDF
- generacion de Excel
- toma de movimientos desde MS-07
- bloqueo de usuarios no administradores
- respuesta `404` por datos vacios
- respuesta `400` por formato invalido
- respuesta `413` por exceso de registros
- preservacion de errores JSON desde el gateway

### Verificacion ejecutada

```bash
npm.cmd test
```

Resultado:

- `services/export-service`: OK
- `api-gateway`: OK

---

## Archivos principales

- `services/export-service/src/services/export.service.js`
- `services/export-service/src/routes/export.routes.js`
- `services/export-service/src/app.js`
- `api-gateway/src/routes/export.routes.js`
- `api-gateway/src/app.js`
- `services/export-service/tests/export.integration.test.js`
- `api-gateway/tests/export.routes.test.js`

---



