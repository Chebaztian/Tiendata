/**
 * Repositorio en memoria (modo demo sin BD y pruebas).
 * Misma interfaz que PgAuthRepository.
 */
class InMemoryAuthRepository {
  constructor({ users = [] } = {}) {
    this.users = users.map((user) => ({
      intentos_fallidos: 0,
      bloqueo_hasta: null,
      ...user,
    }));
    this.revokedTokens = new Map();
  }

  async getUserByIdentifier(identifier) {
    if (!identifier) return null;
    const value = String(identifier).toLowerCase();
    return (
      this.users.find((user) => user.correo && user.correo.toLowerCase() === value) ||
      this.users.find(
        (user) => user.nombre_usuario && user.nombre_usuario.toLowerCase() === value
      ) ||
      null
    );
  }

  async getUserById(idUsuario) {
    return this.users.find((user) => user.id_usuario === idUsuario) || null;
  }

  async getUserByCorreo(correo) {
    return this.getUserByIdentifier(correo);
  }

  async registerFailedAttempt(user, maxLoginAttempts, lockMinutes) {
    user.intentos_fallidos += 1;

    if (user.intentos_fallidos >= maxLoginAttempts) {
      user.bloqueo_hasta = Date.now() + lockMinutes * 60 * 1000;
      user.intentos_fallidos = 0;
      return { blocked: true, blockedUntil: user.bloqueo_hasta };
    }

    return { blocked: false, remainingAttempts: maxLoginAttempts - user.intentos_fallidos };
  }

  async resetFailedAttempts(user) {
    user.intentos_fallidos = 0;
    user.bloqueo_hasta = null;
  }

  async revokeToken({ jti, expiresAtMs }) {
    this.revokedTokens.set(jti, expiresAtMs);
  }

  async isTokenRevoked(jti) {
    const expiresAt = this.revokedTokens.get(jti);
    if (!expiresAt) {
      return false;
    }

    if (Date.now() > expiresAt) {
      this.revokedTokens.delete(jti);
      return false;
    }

    return true;
  }
}

module.exports = { InMemoryAuthRepository };
