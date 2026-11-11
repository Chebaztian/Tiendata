const bcrypt = require('bcryptjs');
const { createHttpError } = require('../models/user.model');

function isAdminRole(role) {
  if (!role) {
    return false;
  }

  const normalized = String(role).trim().toLowerCase();
  return normalized === 'admin' || normalized === 'administrador';
}

/**
 * Un usuario está bloqueado si bloqueado = true y el bloqueo no venció
 * (bloqueo_hasta NULL = bloqueo indefinido).
 */
function isBlockedNow(user, now = Date.now()) {
  if (!user?.bloqueado) return false;
  if (!user.bloqueo_hasta) return true;
  return new Date(user.bloqueo_hasta).getTime() > now;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { contrasena, ...safeUser } = user;
  return { ...safeUser, bloqueo_vigente: isBlockedNow(user) };
}

/**
 * Si dos peticiones simultáneas pasan la validación de unicidad, el índice
 * único de la BD rechaza la segunda (código 23505): se responde 409.
 */
async function withUniqueViolationAsConflict(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error?.code === '23505') {
      const detail = `${error.constraint || ''} ${error.detail || ''}`;
      if (/nombre_usuario/.test(detail)) {
        throw createHttpError(
          409,
          'USER_USERNAME_ALREADY_EXISTS',
          'El nombre de usuario ya esta registrado'
        );
      }
      throw createHttpError(409, 'USER_EMAIL_ALREADY_EXISTS', 'El correo ya esta registrado');
    }
    throw error;
  }
}

class UserService {
  constructor({
    repository,
    auditNotifier = {
      notifyUserCreated: async () => {},
      notifyUserUpdated: async () => {},
      notifyUserDisabled: async () => {},
      notifyUserUnlocked: async () => {},
    },
    bcryptSaltRounds = 10,
  }) {
    this.repository = repository;
    this.auditNotifier = auditNotifier;
    this.bcryptSaltRounds = bcryptSaltRounds;
  }

  async ensureNombreUsuarioAvailable(nombreUsuario, idUsuario = 0) {
    if (!nombreUsuario) return;
    const duplicated = await this.repository.getUserByNombreUsuarioExcludingId(
      nombreUsuario,
      idUsuario
    );
    if (duplicated) {
      throw createHttpError(
        409,
        'USER_USERNAME_ALREADY_EXISTS',
        'El nombre de usuario ya esta registrado'
      );
    }
  }

  async createUser(payload, actorContext = {}) {
    const existing = await this.repository.getUserByCorreo(payload.correo);
    if (existing) {
      throw createHttpError(409, 'USER_EMAIL_ALREADY_EXISTS', 'El correo ya esta registrado');
    }
    await this.ensureNombreUsuarioAvailable(payload.nombre_usuario);

    const contrasena = await bcrypt.hash(payload.contrasena, this.bcryptSaltRounds);

    const created = await withUniqueViolationAsConflict(() =>
      this.repository.createUser({
        id_rol: payload.id_rol,
        nombre: payload.nombre,
        correo: payload.correo,
        nombre_usuario: payload.nombre_usuario,
        contrasena,
        estado: payload.estado,
      })
    );

    const safeUser = sanitizeUser(created);
    void this.auditNotifier
      .notifyUserCreated({
        actorContext,
        currentUser: safeUser,
      })
      .catch(() => {});

    return safeUser;
  }

  async getUserById(idUsuario) {
    const user = await this.repository.getUserById(idUsuario);
    if (!user) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    }

    return sanitizeUser(user);
  }

  async listUsers(query) {
    const result = await this.repository.listUsers(query);

    return {
      total: result.total,
      page: result.page,
      size: result.size,
      totalPages: Math.ceil(result.total / result.size) || 1,
      items: result.items.map(sanitizeUser),
    };
  }

  validateAdminSelfDisable(actorContext, targetUserId, nextEstado) {
    if (typeof nextEstado !== 'boolean') {
      return;
    }

    const isSelf = actorContext.userId && Number(actorContext.userId) === Number(targetUserId);
    if (isSelf && isAdminRole(actorContext.role) && nextEstado === false) {
      throw createHttpError(
        409,
        'ADMIN_SELF_DISABLE_FORBIDDEN',
        'Un administrador no puede deshabilitarse a si mismo'
      );
    }
  }

  async updateUser(idUsuario, patch, actorContext = {}) {
    const current = await this.repository.getUserById(idUsuario);
    if (!current) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    }

    if (patch.correo) {
      const duplicated = await this.repository.getUserByCorreoExcludingId(patch.correo, idUsuario);
      if (duplicated) {
        throw createHttpError(409, 'USER_EMAIL_ALREADY_EXISTS', 'El correo ya esta registrado');
      }
    }

    if (patch.nombre_usuario) {
      await this.ensureNombreUsuarioAvailable(patch.nombre_usuario, idUsuario);
    }

    this.validateAdminSelfDisable(actorContext, idUsuario, patch.estado);

    const patchToPersist = { ...patch };
    if (patch.contrasena) {
      patchToPersist.contrasena = await bcrypt.hash(patch.contrasena, this.bcryptSaltRounds);
    }

    const updated = await withUniqueViolationAsConflict(() =>
      this.repository.updateUserPartial(idUsuario, patchToPersist)
    );
    const safeCurrent = sanitizeUser(current);
    const safeUpdated = sanitizeUser(updated);

    void this.auditNotifier
      .notifyUserUpdated({
        actorContext,
        previousUser: safeCurrent,
        currentUser: safeUpdated,
      })
      .catch(() => {});

    return safeUpdated;
  }

  async deleteUser(idUsuario, actorContext = {}) {
    const current = await this.repository.getUserById(idUsuario);
    if (!current) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    }

    this.validateAdminSelfDisable(actorContext, idUsuario, false);

    const updated = await this.repository.softDeleteUser(idUsuario);
    const safeCurrent = sanitizeUser(current);
    const safeUpdated = sanitizeUser(updated);

    void this.auditNotifier
      .notifyUserDisabled({
        actorContext,
        previousUser: safeCurrent,
        currentUser: safeUpdated,
      })
      .catch(() => {});

    return safeUpdated;
  }

  /** Desbloqueo manual por un administrador (MS-01). Idempotente. */
  async unlockUser(idUsuario, actorContext = {}) {
    const current = await this.repository.getUserById(idUsuario);
    if (!current) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    }

    const updated = await this.repository.unlockUser(idUsuario);
    const safeUpdated = sanitizeUser(updated);

    if (typeof this.auditNotifier.notifyUserUnlocked === 'function') {
      void this.auditNotifier
        .notifyUserUnlocked({
          actorContext,
          previousUser: sanitizeUser(current),
          currentUser: safeUpdated,
        })
        .catch(() => {});
    }

    return safeUpdated;
  }
}

module.exports = { UserService, isBlockedNow };
