const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { createHttpError } = require('../models/auth.model');

function parseExpiresToSeconds(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  if (typeof expiresIn === 'string') {
    const match = expiresIn.trim().match(/^(\d+)\s*([smhd]?)$/);
    if (match) {
      const value = Number(match[1]);
      const factor = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
      return value * factor;
    }
  }
  return 1800;
}

function minutesUntil(timestampMs) {
  return Math.max(1, Math.ceil((timestampMs - Date.now()) / 60000));
}

function blockedError(blockedUntil) {
  if (!Number.isFinite(blockedUntil)) {
    return createHttpError(
      423,
      'AUTH_ACCOUNT_BLOCKED',
      'Cuenta bloqueada. Contacte al Administrador',
      { bloqueo_indefinido: true }
    );
  }
  const minutes = minutesUntil(blockedUntil);
  return createHttpError(
    423,
    'AUTH_ACCOUNT_BLOCKED',
    `Cuenta bloqueada por intentos fallidos. Intente de nuevo en ${minutes} ${
      minutes === 1 ? 'minuto' : 'minutos'
    }`,
    {
      bloqueo_hasta: new Date(blockedUntil).toISOString(),
      reintentar_en_segundos: Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)),
    }
  );
}

const noopNotifier = {
  notifyLoginSuccess: async () => {},
  notifyLoginFailure: async () => {},
  notifyLogout: async () => {},
};

class AuthService {
  constructor({
    repository,
    auditNotifier = noopNotifier,
    jwtSecret,
    jwtExpiresIn = '30m',
    maxLoginAttempts = 3,
    lockMinutes = 15,
  }) {
    if (!jwtSecret) {
      throw new Error('AuthService requiere jwtSecret');
    }
    this.repository = repository;
    this.auditNotifier = auditNotifier || noopNotifier;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.maxLoginAttempts = maxLoginAttempts;
    this.lockMinutes = lockMinutes;
  }

  audit(method, payload) {
    // La auditoría nunca debe bloquear ni romper el flujo de autenticación
    if (typeof this.auditNotifier[method] !== 'function') return;
    void Promise.resolve()
      .then(() => this.auditNotifier[method](payload))
      .catch(() => {});
  }

  signToken(user) {
    return jwt.sign(
      {
        id_usuario: user.id_usuario,
        rol: user.rol,
        nombre: user.nombre,
        jti: randomUUID(),
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  async getMaxLoginAttempts() {
    return this.repository.getMaxLoginAttempts
      ? this.repository.getMaxLoginAttempts()
      : this.maxLoginAttempts;
  }

  async getLockMinutes() {
    return this.repository.getLockMinutes ? this.repository.getLockMinutes() : this.lockMinutes;
  }

  async login({ identificador, contrasena }) {
    const user = await this.repository.getUserByIdentifier(identificador);

    if (!user) {
      this.audit('notifyLoginFailure', {
        identifier: identificador,
        reason: 'credenciales_invalidas',
      });
      throw createHttpError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Usuario, correo o contraseña incorrectos'
      );
    }

    if (user.bloqueo_hasta && Date.now() < user.bloqueo_hasta) {
      this.audit('notifyLoginFailure', { user, identifier: identificador, reason: 'cuenta_bloqueada' });
      throw blockedError(user.bloqueo_hasta);
    }

    const validPassword = await bcrypt.compare(contrasena, user.contrasena_hash);

    if (!validPassword) {
      // Una cuenta deshabilitada no acumula intentos: responde como credencial inválida
      if (user.estado !== 'activo') {
        this.audit('notifyLoginFailure', {
          user,
          identifier: identificador,
          reason: 'credenciales_invalidas',
        });
        throw createHttpError(
          401,
          'AUTH_INVALID_CREDENTIALS',
          'Usuario, correo o contraseña incorrectos'
        );
      }

      const [maxAttempts, lockMinutes] = await Promise.all([
        this.getMaxLoginAttempts(),
        this.getLockMinutes(),
      ]);
      const failed = await this.repository.registerFailedAttempt(user, maxAttempts, lockMinutes);

      this.audit('notifyLoginFailure', {
        user,
        identifier: identificador,
        reason: failed.blocked ? 'cuenta_bloqueada' : 'credenciales_invalidas',
      });

      if (failed.blocked) {
        throw blockedError(failed.blockedUntil);
      }

      throw createHttpError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Usuario, correo o contraseña incorrectos',
        failed.remainingAttempts !== undefined
          ? { intentos_restantes: failed.remainingAttempts }
          : undefined
      );
    }

    // Solo se revela que la cuenta está deshabilitada si la contraseña es correcta
    if (user.estado !== 'activo') {
      this.audit('notifyLoginFailure', { user, identifier: identificador, reason: 'cuenta_inactiva' });
      throw createHttpError(
        403,
        'AUTH_ACCOUNT_DISABLED',
        'Tu cuenta está deshabilitada. Contacta al Administrador'
      );
    }

    await this.repository.resetFailedAttempts(user);
    const token = this.signToken(user);
    const decoded = jwt.decode(token);

    this.audit('notifyLoginSuccess', {
      user,
      identifier: identificador,
      sessionId: decoded?.jti || null,
    });

    return {
      token,
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      rol: user.rol,
      expires_in: parseExpiresToSeconds(this.jwtExpiresIn),
    };
  }

  verifySignature(token, { ignoreExpiration = false } = {}) {
    try {
      return jwt.verify(token, this.jwtSecret, { ignoreExpiration });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw createHttpError(401, 'AUTH_TOKEN_EXPIRED', 'Token expirado');
      }
      throw createHttpError(401, 'AUTH_TOKEN_INVALID', 'Token invalido');
    }
  }

  /**
   * Valida firma, expiración y revocación del token y, además, el estado
   * ACTUAL del usuario en la BD: si fue desactivado o eliminado, la sesión
   * deja de ser válida de inmediato, y el rol devuelto es siempre el vigente
   * (un cambio de rol se aplica en la siguiente petición).
   */
  async verify(token) {
    const payload = this.verifySignature(token);
    if (!payload.jti || (await this.repository.isTokenRevoked(payload.jti))) {
      throw createHttpError(401, 'AUTH_TOKEN_REVOKED', 'Token revocado');
    }

    const user = await this.repository.getUserById(payload.id_usuario);
    if (!user || user.estado !== 'activo') {
      throw createHttpError(
        401,
        'AUTH_ACCOUNT_DISABLED',
        'Tu cuenta fue deshabilitada. Contacta al Administrador'
      );
    }

    return {
      valid: true,
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      rol: user.rol,
      expira_en: payload.exp,
    };
  }

  async logout(token) {
    // Se exige firma válida: nadie puede revocar tokens ajenos con un token falso.
    // Un token ya expirado no necesita revocarse, pero el logout responde OK.
    const payload = this.verifySignature(token, { ignoreExpiration: true });
    const expiresAtMs = payload.exp * 1000;

    if (payload.jti && expiresAtMs > Date.now()) {
      await this.repository.revokeToken({
        jti: payload.jti,
        expiresAtMs,
        idUsuario: payload.id_usuario,
      });
    }

    this.audit('notifyLogout', {
      user: { id_usuario: payload.id_usuario, nombre: payload.nombre, rol: payload.rol },
      sessionId: payload.jti || null,
    });

    return { message: 'Sesion cerrada correctamente' };
  }

  async refresh(token) {
    // verify() ya comprueba que el usuario siga activo y trae su rol actual
    const current = await this.verify(token);
    const payload = jwt.decode(token);
    await this.repository.revokeToken({
      jti: payload.jti,
      expiresAtMs: payload.exp * 1000,
      idUsuario: payload.id_usuario,
    });
    const newToken = this.signToken(current);
    return {
      token: newToken,
      expires_in: parseExpiresToSeconds(this.jwtExpiresIn),
      id_usuario: current.id_usuario,
      nombre: current.nombre,
      rol: current.rol,
    };
  }
}

module.exports = { AuthService, parseExpiresToSeconds };
