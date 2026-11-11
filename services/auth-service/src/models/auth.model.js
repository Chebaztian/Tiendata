function createHttpError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

/**
 * Acepta el identificador como `identificador` (preferido), `correo`,
 * `nombre_usuario` o `nombreUsuario` para mantener compatibilidad.
 */
function validateLoginPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'El cuerpo de la solicitud es obligatorio');
  }

  const rawIdentifier =
    body.identificador || body.correo || body.nombre_usuario || body.nombreUsuario;
  const identificador = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
  const { contrasena } = body;

  if (!identificador || typeof contrasena !== 'string' || contrasena.length === 0) {
    throw createHttpError(
      400,
      'VALIDATION_ERROR',
      'Usuario o correo y contraseña son obligatorios'
    );
  }

  if (identificador.length > 100 || contrasena.length > 128) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Credenciales con longitud no válida');
  }

  return { identificador, contrasena };
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    throw createHttpError(401, 'AUTH_TOKEN_MISSING', 'Token de autorización no proporcionado');
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw createHttpError(401, 'AUTH_TOKEN_INVALID', 'Formato de token inválido');
  }

  return token;
}

module.exports = {
  createHttpError,
  validateLoginPayload,
  extractBearerToken,
};
