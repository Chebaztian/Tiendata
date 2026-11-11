function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function toBooleanEstado(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'activo' || normalized === 'true') {
      return true;
    }
    if (normalized === 'inactivo' || normalized === 'false') {
      return false;
    }
  }

  throw createHttpError(400, 'VALIDATION_ERROR', 'estado debe ser activo/inactivo o booleano');
}

// Nombre de usuario: 3-30 caracteres, letras, números, punto, guion o guion bajo.
// No admite "@" para no confundirse con un correo al iniciar sesión.
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/**
 * Normaliza el nombre de usuario (minúsculas, sin espacios).
 * Cadena vacía o null => null (sin nombre de usuario).
 */
function normalizeNombreUsuario(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '') return null;
  if (!USERNAME_PATTERN.test(normalized)) {
    throw createHttpError(
      400,
      'VALIDATION_ERROR',
      'nombre_usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo'
    );
  }
  return normalized;
}

// Política mínima de contraseña (la misma que valida el frontend)
function validatePassword(value) {
  const password = String(value);
  if (password.length < 8 || password.length > 128) {
    throw createHttpError(
      400,
      'VALIDATION_ERROR',
      'La contraseña debe tener entre 8 y 128 caracteres'
    );
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'La contraseña debe incluir letras y números');
  }
  return password;
}

function validateCreateUserPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'El cuerpo de la solicitud es obligatorio');
  }

  const { nombre, correo, contrasena, id_rol = 1, estado = true } = body;

  if (!nombre || !correo || !contrasena) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'nombre, correo y contrasena son obligatorios');
  }

  if (!String(correo).includes('@')) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'correo debe tener un formato valido');
  }

  return {
    nombre: String(nombre).trim(),
    correo: String(correo).trim().toLowerCase(),
    nombre_usuario: normalizeNombreUsuario(body.nombre_usuario),
    contrasena: validatePassword(contrasena),
    id_rol: Number(id_rol),
    estado: toBooleanEstado(estado),
  };
}

function validateUpdateUserPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'El cuerpo de la solicitud es obligatorio');
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'nombre')) {
    patch.nombre = String(body.nombre).trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'correo')) {
    const correo = String(body.correo).trim().toLowerCase();
    if (!correo.includes('@')) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'correo debe tener un formato valido');
    }
    patch.correo = correo;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'nombre_usuario')) {
    patch.nombre_usuario = normalizeNombreUsuario(body.nombre_usuario);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'contrasena')) {
    patch.contrasena = validatePassword(body.contrasena);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'id_rol')) {
    patch.id_rol = Number(body.id_rol);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'estado')) {
    patch.estado = toBooleanEstado(body.estado);
  }

  if (Object.keys(patch).length === 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Debe enviar al menos un campo para actualizar');
  }

  return patch;
}

function parseUserId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'id de usuario invalido');
  }
  return id;
}

function parseListQuery(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const size = Math.min(100, Math.max(1, Number(query.size || 10)));
  const estado =
    typeof query.estado === 'undefined' || query.estado === 'todos'
      ? undefined
      : toBooleanEstado(String(query.estado));

  return { page, size, estado };
}

function extractActorContext(headers = {}) {
  const userIdHeader = headers['x-user-id'];
  const userRoleHeader = headers['x-user-role'];
  const userNameHeader = headers['x-user-name'];

  return {
    userId: userIdHeader ? Number(userIdHeader) : null,
    role: userRoleHeader ? String(userRoleHeader) : null,
    name: userNameHeader ? String(userNameHeader) : null,
  };
}

module.exports = {
  createHttpError,
  normalizeNombreUsuario,
  validatePassword,
  validateCreateUserPayload,
  validateUpdateUserPayload,
  parseUserId,
  parseListQuery,
  extractActorContext,
};
