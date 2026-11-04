'use strict';
 
/**
 * @fileoverview Helpers para respuestas HTTP estandarizadas en todos los microservicios
 * de INVENTARIO TIENDATA.
 *
 * Garantiza que TODA respuesta JSON del sistema siga el mismo contrato (Requisito R05):
 *   - Éxito:  { success: true,  data: <payload>,  message?: <string> }
 *   - Error:  { success: false, error: <string>,  details?: <any>    }
 *
 * @module shared/utils/response
 */
 
/**
 * Envía una respuesta HTTP de éxito estandarizada.
 *
 * @param {import('express').Response} res  - Objeto Response de Express.
 * @param {*}       data                    - Payload principal de la respuesta (objeto, array, etc.).
 * @param {number}  [statusCode=200]        - Código HTTP de éxito (200, 201, etc.).
 * @param {string}  [message]               - Mensaje descriptivo opcional (ej. 'Usuario creado correctamente').
 * @returns {import('express').Response} La respuesta enviada.
 *
 * @example
 * // En auth-service → controller de login → HTTP 200
 * const { sendSuccess } = require('../../shared/utils/response');
 *
 * sendSuccess(res, { token, id_usuario, rol, nombre });
 *
 * // Respuesta JSON:
 * // { "success": true, "data": { "token": "...", "id_usuario": 1, "rol": "Administrador", "nombre": "Juan" } }
 *
 * @example
 * // Creación de usuario → HTTP 201
 * sendSuccess(res, null, 201, 'Usuario creado correctamente');
 *
 * // Respuesta JSON:
 * // { "success": true, "data": null, "message": "Usuario creado correctamente" }
 */
function sendSuccess(res, data, statusCode = 200, message) {
  const body = { success: true, data };
 
  if (message) {
    body.message = message;
  }
 
  return res.status(statusCode).json(body);
}
 
/**
 * Envía una respuesta HTTP de error estandarizada.
 *
 * @param {import('express').Response} res  - Objeto Response de Express.
 * @param {string}  errorMessage            - Mensaje de error legible por el cliente.
 * @param {number}  [statusCode=500]        - Código HTTP de error.
 * @param {*}       [details]               - Detalles adicionales del error (campo inválido, etc.).
 *                                           No incluir stack traces en producción.
 * @returns {import('express').Response} La respuesta enviada.
 *
 * @example
 * // Credenciales incorrectas → HTTP 401
 * const { sendError } = require('../../shared/utils/response');
 *
 * sendError(res, 'Usuario o contraseña incorrectos', 401);
 *
 * // Respuesta JSON:
 * // { "success": false, "error": "Usuario o contraseña incorrectos" }
 *
 * @example
 * // Validación fallida con detalles → HTTP 400
 * sendError(res, 'Error de validación', 400, { campo: 'contrasena', mensaje: 'Mínimo 8 caracteres' });
 *
 * // Respuesta JSON:
 * // { "success": false, "error": "Error de validación", "details": { ... } }
 */
function sendError(res, errorMessage, statusCode = 500, details) {
  const body = { success: false, error: errorMessage };
 
  if (details !== undefined && details !== null) {
    body.details = details;
  }
 
  return res.status(statusCode).json(body);
}
 
// ─── Shortcuts para los códigos HTTP más usados en el sistema ──────────────────
 
/**
 * HTTP 200 OK — Consulta o actualización exitosa.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
const ok = (res, data, message) => sendSuccess(res, data, 200, message);
 
/**
 * HTTP 201 Created — Recurso creado exitosamente.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
const created = (res, data, message) => sendSuccess(res, data, 201, message);
 
/**
 * HTTP 400 Bad Request — Datos de entrada inválidos o faltantes.
 * @param {import('express').Response} res
 * @param {string} [message='Solicitud inválida']
 * @param {*} [details]
 */
const badRequest = (res, message = 'Solicitud inválida', details) =>
  sendError(res, message, 400, details);
 
/**
 * HTTP 401 Unauthorized — Token ausente, expirado o inválido.
 * Según R01: "Si el token está ausente, expirado o es inválido, se retorna HTTP 401."
 * @param {import('express').Response} res
 * @param {string} [message='No autorizado']
 */
const unauthorized = (res, message = 'No autorizado') =>
  sendError(res, message, 401);
 
/**
 * HTTP 403 Forbidden — Token válido pero el rol no tiene permiso.
 * Según R02: "Si el token es válido pero el rol no tiene permiso, se retorna HTTP 403."
 * @param {import('express').Response} res
 * @param {string} [message='No tiene permisos para esta operación']
 */
const forbidden = (res, message = 'No tiene permisos para esta operación') =>
  sendError(res, message, 403);
 
/**
 * HTTP 404 Not Found — Recurso no encontrado.
 * @param {import('express').Response} res
 * @param {string} [message='Recurso no encontrado']
 */
const notFound = (res, message = 'Recurso no encontrado') =>
  sendError(res, message, 404);
 
/**
 * HTTP 409 Conflict — Conflicto de unicidad (usuario, categoría, código de barras, etc.).
 * @param {import('express').Response} res
 * @param {string} [message='Conflicto con un recurso existente']
 */
const conflict = (res, message = 'Conflicto con un recurso existente') =>
  sendError(res, message, 409);
 
/**
 * HTTP 422 Unprocessable Entity — Datos semánticamente inválidos
 * (ej. stock insuficiente para una salida de inventario).
 * Según MS-05: "422 (stock insuficiente)."
 * @param {import('express').Response} res
 * @param {string} [message='No se puede procesar la operación']
 * @param {*} [details]
 */
const unprocessable = (res, message = 'No se puede procesar la operación', details) =>
  sendError(res, message, 422, details);
 
/**
 * HTTP 423 Locked — Cuenta bloqueada por intentos fallidos.
 * Según MS-01 y R03: "HTTP 423: 'Cuenta bloqueada. Intente en 15 minutos'."
 * @param {import('express').Response} res
 * @param {string} [message='Cuenta bloqueada. Intente en 15 minutos']
 */
const locked = (res, message = 'Cuenta bloqueada. Intente en 15 minutos') =>
  sendError(res, message, 423);
 
/**
 * HTTP 500 Internal Server Error — Error inesperado del servidor.
 * @param {import('express').Response} res
 * @param {string} [message='Error interno del servidor']
 */
const internalError = (res, message = 'Error interno del servidor') =>
  sendError(res, message, 500);
 
module.exports = {
  // Funciones base
  sendSuccess,
  sendError,
 
  // Shortcuts por código HTTP
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  locked,
  internalError,
};