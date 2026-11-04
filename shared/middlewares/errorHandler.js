'use strict';
 
const { sendError } = require('../utils/response');
 
/**
 * @fileoverview Middleware de manejo centralizado de errores para todos los microservicios
 * de INVENTARIO TIENDATA.
 *
 * Debe registrarse como el ÚLTIMO middleware en cada app de Express:
 *
 *   app.use(errorHandler);
 *
 * Captura cualquier error que se pase mediante next(error) desde controllers,
 * servicios o middlewares anteriores, y lo convierte a la respuesta JSON
 * estandarizada del sistema (Requisito R05).
 *
 * Tipología de errores manejados:
 *   - Errores JWT (expirado, inválido)         → HTTP 401
 *   - Errores de validación                     → HTTP 400
 *   - Errores de unicidad / conflicto           → HTTP 409
 *   - Errores de no encontrado                  → HTTP 404
 *   - Errores de stock insuficiente             → HTTP 422
 *   - Errores de cuenta bloqueada               → HTTP 423
 *   - Errores de base de datos (PostgreSQL)     → HTTP 500 (sin exponer detalles internos)
 *   - Errores genéricos no controlados          → HTTP 500
 *
 * @module shared/middlewares/errorHandler
 */
 
/**
 * Errores de la librería jsonwebtoken y sus códigos HTTP correspondientes.
 * @type {Object.<string, number>}
 */
const JWT_ERROR_STATUS = {
  TokenExpiredError: 401,
  JsonWebTokenError: 401,
  NotBeforeError: 401,
};
 
/**
 * Códigos de error de PostgreSQL y sus HTTP equivalentes.
 * Referencia: https://www.postgresql.org/docs/current/errcodes-appendix.html
 * @type {Object.<string, { status: number, message: string }>}
 */
const PG_ERROR_MAP = {
  '23505': { status: 409, message: 'Ya existe un registro con esos datos (violación de unicidad).' },
  '23503': { status: 409, message: 'No se puede completar la operación: referencia a un registro inexistente.' },
  '23502': { status: 400, message: 'Un campo obligatorio no puede estar vacío.' },
  '22001': { status: 400, message: 'Un valor excede la longitud máxima permitida.' },
  '22003': { status: 400, message: 'Un valor numérico está fuera del rango permitido.' },
  '08006': { status: 503, message: 'Error de conexión con la base de datos.' },
  '08001': { status: 503, message: 'No se pudo conectar a la base de datos.' },
};
 
/**
 * Determina el código HTTP y el mensaje de error a partir del objeto de error.
 *
 * @param {Error} err - Error capturado.
 * @returns {{ status: number, message: string, details?: * }}
 */
function resolveError(err) {
  // ── Errores JWT ──────────────────────────────────────────────────────────────
  if (err.name in JWT_ERROR_STATUS) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'El token ha expirado. Inicie sesión nuevamente.'
        : 'Token inválido o manipulado.';
    return { status: JWT_ERROR_STATUS[err.name], message };
  }
 
  // ── Errores con statusCode ya asignado (lanzados desde servicios/controllers) ─
  if (err.statusCode && Number.isInteger(err.statusCode)) {
    return {
      status: err.statusCode,
      message: err.message || 'Error en la solicitud.',
      details: err.details,
    };
  }
 
  // ── Errores de PostgreSQL (pg driver) ────────────────────────────────────────
  if (err.code && PG_ERROR_MAP[err.code]) {
    const { status, message } = PG_ERROR_MAP[err.code];
    return { status, message };
  }
 
  // ── Errores de validación de negocio marcados explícitamente ─────────────────
  if (err.name === 'ValidationError') {
    return { status: 400, message: err.message, details: err.details };
  }
 
  if (err.name === 'NotFoundError') {
    return { status: 404, message: err.message };
  }
 
  if (err.name === 'ConflictError') {
    return { status: 409, message: err.message };
  }
 
  if (err.name === 'ForbiddenError') {
    return { status: 403, message: err.message };
  }
 
  if (err.name === 'UnprocessableError') {
    return { status: 422, message: err.message, details: err.details };
  }
 
  if (err.name === 'LockedError') {
    return { status: 423, message: err.message || 'Cuenta bloqueada. Intente en 15 minutos.' };
  }
 
  // ── Error genérico no controlado ─────────────────────────────────────────────
  return {
    status: 500,
    message: 'Error interno del servidor.',
  };
}
 
/**
 * Middleware de manejo centralizado de errores para Express.
 *
 * Express reconoce un error handler por su firma de 4 parámetros: (err, req, res, next).
 * Debe ser el ÚLTIMO middleware registrado en la app.
 *
 * @param {Error}                       err  - Error capturado.
 * @param {import('express').Request}   req  - Objeto Request de Express.
 * @param {import('express').Response}  res  - Objeto Response de Express.
 * @param {import('express').NextFunction} next - Función next (requerida por la firma de Express).
 * @returns {void}
 *
 * @example
 * // En auth-service → app.js:
 * const errorHandler = require('../../shared/middlewares/errorHandler');
 *
 * // ... rutas y middlewares anteriores ...
 *
 * app.use(errorHandler); // ← siempre al final
 *
 * @example
 * // En un controller:
 * async function login(req, res, next) {
 *   try {
 *     // ... lógica ...
 *   } catch (err) {
 *     next(err); // ← el errorHandler lo captura y responde
 *   }
 * }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, message, details } = resolveError(err);
 
  // Log interno: siempre registrar el error real en consola del servidor.
  // En producción se debería usar un logger estructurado (winston, pino, etc.)
  // pero para el Sprint 3 console.error es suficiente.
  const isServerError = status >= 500;
 
  if (isServerError) {
    console.error(
      `[errorHandler] ${req.method} ${req.originalUrl} → HTTP ${status}`,
      err
    );
  } else {
    console.warn(
      `[errorHandler] ${req.method} ${req.originalUrl} → HTTP ${status}: ${message}`
    );
  }
 
  return sendError(res, message, status, details);
}
 
// ── Clases de error personalizadas exportadas ─────────────────────────────────
// Los controllers y servicios de cualquier MS pueden lanzar estas clases
// y el errorHandler las mapea automáticamente al código HTTP correcto.
 
/**
 * Error 400 — Datos de entrada inválidos.
 * @extends Error
 * @example
 * throw new ValidationError('El campo contrasena es obligatorio.', { campo: 'contrasena' });
 */
class ValidationError extends Error {
  /**
   * @param {string} message  - Mensaje descriptivo.
   * @param {*} [details]     - Detalles adicionales (campo inválido, regla, etc.).
   */
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}
 
/**
 * Error 404 — Recurso no encontrado.
 * @extends Error
 * @example
 * throw new NotFoundError('Usuario no encontrado.');
 */
class NotFoundError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}
 
/**
 * Error 409 — Conflicto de unicidad o integridad referencial.
 * @extends Error
 * @example
 * throw new ConflictError('El nombre de usuario ya existe.');
 */
class ConflictError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}
 
/**
 * Error 403 — Rol sin permiso para la operación.
 * @extends Error
 * @example
 * throw new ForbiddenError('Solo el Administrador puede registrar ajustes de inventario.');
 */
class ForbiddenError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
 
/**
 * Error 422 — Operación no procesable (ej. stock insuficiente).
 * @extends Error
 * @example
 * throw new UnprocessableError('Stock insuficiente para registrar la salida.', { stock_actual: 3, cantidad_pedida: 10 });
 */
class UnprocessableError extends Error {
  /**
   * @param {string} message
   * @param {*} [details]
   */
  constructor(message, details) {
    super(message);
    this.name = 'UnprocessableError';
    this.details = details;
  }
}
 
/**
 * Error 423 — Cuenta bloqueada por intentos fallidos.
 * @extends Error
 * @example
 * throw new LockedError();
 */
class LockedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Cuenta bloqueada. Intente en 15 minutos.') {
    super(message);
    this.name = 'LockedError';
  }
}
 
/**
 * Error con statusCode personalizado.
 * Útil cuando ninguna clase específica aplica.
 * @extends Error
 * @example
 * throw new AppError('Operación no permitida en este estado.', 400);
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {*} [details]
   */
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
 
module.exports = {
  // Middleware principal
  errorHandler,
 
  // Clases de error personalizadas
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnprocessableError,
  LockedError,
  AppError,
};