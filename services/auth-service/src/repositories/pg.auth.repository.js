'use strict';

const DEFAULT_MAX_LOGIN_ATTEMPTS = 3;
const DEFAULT_LOCK_MINUTES = 15;

function toMillis(value) {
  if (value === null || value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Repositorio de autenticación sobre PostgreSQL.
 *
 * Todo el estado de sesión vive en la BD para sobrevivir reinicios del
 * servicio y funcionar con varias instancias:
 *   - usuarios.intentos_fallidos / bloqueado / bloqueo_hasta
 *   - tokens_revocados (jti + expiración)
 * Requiere docker/postgres/init/03_auth_sesiones.sql.
 */
class PgAuthRepository {
  constructor({ pool }) {
    this.pool = pool;
  }

  mapUser(row) {
    const bloqueoHasta = toMillis(row.bloqueo_hasta);
    let lockedUntil = null;
    if (row.bloqueado) {
      // Sin fecha de fin => bloqueo indefinido (manual)
      lockedUntil = bloqueoHasta ?? Number.POSITIVE_INFINITY;
    }

    return {
      id_usuario: row.id_usuario,
      correo: row.correo,
      nombre_usuario: row.nombre_usuario,
      nombre: row.nombre,
      rol: row.rol,
      contrasena_hash: row.contrasena_hash,
      estado: row.estado === true || row.estado === 'activo' ? 'activo' : 'inactivo',
      intentos_fallidos: row.intentos_fallidos ?? 0,
      bloqueo_hasta: lockedUntil,
    };
  }

  async getUserByIdentifier(identifier) {
    const query = `
      SELECT
        u.id_usuario,
        u.correo,
        u.nombre_usuario,
        u.nombre,
        r.nombre_rol      AS rol,
        u.contrasena      AS contrasena_hash,
        u.estado,
        u.intentos_fallidos,
        u.bloqueado,
        u.bloqueo_hasta
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE lower(u.correo) = lower($1)
         OR lower(u.nombre_usuario) = lower($1)
      ORDER BY (lower(u.correo) = lower($1)) DESC
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [identifier]);
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  async getUserById(idUsuario) {
    const { rows } = await this.pool.query(
      `SELECT
         u.id_usuario,
         u.correo,
         u.nombre_usuario,
         u.nombre,
         r.nombre_rol AS rol,
         u.contrasena AS contrasena_hash,
         u.estado,
         u.intentos_fallidos,
         u.bloqueado,
         u.bloqueo_hasta
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1
       LIMIT 1`,
      [idUsuario]
    );
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  async getUserByCorreo(correo) {
    return this.getUserByIdentifier(correo);
  }

  async registerFailedAttempt(user, maxLoginAttempts, lockMinutes) {
    // Incremento atómico: evita perder intentos con peticiones concurrentes
    const { rows } = await this.pool.query(
      `UPDATE usuarios
          SET intentos_fallidos = COALESCE(intentos_fallidos, 0) + 1
        WHERE id_usuario = $1
        RETURNING intentos_fallidos`,
      [user.id_usuario]
    );
    const attempts = rows[0]?.intentos_fallidos ?? user.intentos_fallidos + 1;
    user.intentos_fallidos = attempts;

    if (attempts < maxLoginAttempts) {
      return { blocked: false, remainingAttempts: maxLoginAttempts - attempts };
    }

    const locked = await this.pool.query(
      `UPDATE usuarios
          SET intentos_fallidos = 0,
              bloqueado = true,
              bloqueo_hasta = now() + make_interval(mins => $2::int)
        WHERE id_usuario = $1
        RETURNING bloqueo_hasta`,
      [user.id_usuario, lockMinutes]
    );
    const blockedUntil =
      toMillis(locked.rows[0]?.bloqueo_hasta) ?? Date.now() + lockMinutes * 60 * 1000;
    user.intentos_fallidos = 0;
    user.bloqueo_hasta = blockedUntil;
    return { blocked: true, blockedUntil };
  }

  async resetFailedAttempts(user) {
    user.intentos_fallidos = 0;
    user.bloqueo_hasta = null;
    await this.pool.query(
      `UPDATE usuarios
          SET intentos_fallidos = 0,
              bloqueado = false,
              bloqueo_hasta = NULL,
              ultimo_acceso = now()
        WHERE id_usuario = $1`,
      [user.id_usuario]
    );
  }

  async revokeToken({ jti, expiresAtMs, idUsuario = null }) {
    await this.pool.query(
      `INSERT INTO tokens_revocados (jti, id_usuario, expira_en)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT (jti) DO NOTHING`,
      [jti, idUsuario, expiresAtMs]
    );
    // Limpieza oportunista: los tokens expirados ya no necesitan lista negra
    await this.pool.query('DELETE FROM tokens_revocados WHERE expira_en < now()');
  }

  async isTokenRevoked(jti) {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM tokens_revocados WHERE jti = $1 AND expira_en > now() LIMIT 1',
      [jti]
    );
    return rows.length > 0;
  }

  async getParam(key, fallback) {
    try {
      const { rows } = await this.pool.query(
        'SELECT valor FROM parametros_sistema WHERE clave = $1 LIMIT 1',
        [key]
      );
      const value = rows[0] ? parseInt(rows[0].valor, 10) : NaN;
      if (Number.isInteger(value) && value > 0) return value;
    } catch (_) {
      // Tabla no disponible: se usa el valor por defecto
    }
    return fallback;
  }

  async getMaxLoginAttempts() {
    return this.getParam('max_intentos_login', DEFAULT_MAX_LOGIN_ATTEMPTS);
  }

  async getLockMinutes() {
    return this.getParam('tiempo_bloqueo_minutos', DEFAULT_LOCK_MINUTES);
  }
}

module.exports = { PgAuthRepository };
