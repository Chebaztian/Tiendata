// Columnas devueltas en todas las consultas de usuario
const USER_COLUMNS =
  'id_usuario, id_rol, nombre, correo, contrasena, estado, fecha_creacion, ultimo_acceso, intentos_fallidos, bloqueado, bloqueo_hasta';

class PgUserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser({ id_rol, nombre, correo, contrasena, estado }) {
    const query = `
      INSERT INTO usuarios (id_rol, nombre, correo, contrasena, estado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${USER_COLUMNS}
    `;

    const { rows } = await this.pool.query(query, [id_rol, nombre, correo, contrasena, estado]);
    return rows[0];
  }

  async getUserById(idUsuario) {
    const query = `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      WHERE id_usuario = $1
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [idUsuario]);
    return rows[0] || null;
  }

  async getUserByCorreo(correo) {
    const query = `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      WHERE correo = $1
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [correo]);
    return rows[0] || null;
  }

  async getUserByCorreoExcludingId(correo, idUsuario) {
    const query = `
      SELECT id_usuario
      FROM usuarios
      WHERE correo = $1 AND id_usuario <> $2
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [correo, idUsuario]);
    return rows[0] || null;
  }

  async listUsers({ page, size, estado }) {
    const offset = (page - 1) * size;
    const filters = [];
    const params = [];

    if (typeof estado === 'boolean') {
      params.push(estado);
      filters.push(`estado = $${params.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM usuarios ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(size);
    params.push(offset);

    const listQuery = `
      SELECT ${USER_COLUMNS}
      FROM usuarios
      ${whereClause}
      ORDER BY id_usuario ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const { rows } = await this.pool.query(listQuery, params);
    return { total, page, size, items: rows };
  }

  async updateUserPartial(idUsuario, patch = {}) {
    const updates = [];
    const values = [];

    const mapping = {
      id_rol: 'id_rol',
      nombre: 'nombre',
      correo: 'correo',
      contrasena: 'contrasena',
      estado: 'estado',
    };

    Object.entries(patch).forEach(([key, value]) => {
      const column = mapping[key];
      if (!column) {
        return;
      }
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    });

    if (updates.length === 0) {
      return this.getUserById(idUsuario);
    }

    values.push(idUsuario);

    const query = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id_usuario = $${values.length}
      RETURNING ${USER_COLUMNS}
    `;

    const { rows } = await this.pool.query(query, values);
    return rows[0] || null;
  }

  async softDeleteUser(idUsuario) {
    return this.updateUserPartial(idUsuario, { estado: false });
  }

  /** Quita el bloqueo por intentos fallidos (temporal o indefinido). */
  async unlockUser(idUsuario) {
    const { rows } = await this.pool.query(
      `UPDATE usuarios
          SET bloqueado = false,
              bloqueo_hasta = NULL,
              intentos_fallidos = 0
        WHERE id_usuario = $1
        RETURNING ${USER_COLUMNS}`,
      [idUsuario]
    );
    return rows[0] || null;
  }
}

class InMemoryUserRepository {
  constructor({ users = [] } = {}) {
    this.users = users.map((user) => ({ ...user }));
    this.nextId =
      this.users.length > 0 ? Math.max(...this.users.map((user) => user.id_usuario || 0)) + 1 : 1;
  }

  async createUser(payload) {
    const now = new Date().toISOString();
    const user = {
      id_usuario: this.nextId,
      fecha_creacion: now,
      ultimo_acceso: null,
      intentos_fallidos: 0,
      bloqueado: false,
      bloqueo_hasta: null,
      ...payload,
    };

    this.users.push(user);
    this.nextId += 1;
    return { ...user };
  }

  async getUserById(idUsuario) {
    const user = this.users.find((item) => item.id_usuario === idUsuario);
    return user ? { ...user } : null;
  }

  async getUserByCorreo(correo) {
    const user = this.users.find((item) => item.correo === correo);
    return user ? { ...user } : null;
  }

  async getUserByCorreoExcludingId(correo, idUsuario) {
    const user = this.users.find((item) => item.correo === correo && item.id_usuario !== idUsuario);
    return user ? { id_usuario: user.id_usuario } : null;
  }

  async listUsers({ page, size, estado }) {
    const filtered =
      typeof estado === 'boolean'
        ? this.users.filter((item) => item.estado === estado)
        : [...this.users];

    const offset = (page - 1) * size;
    const items = filtered.slice(offset, offset + size).map((item) => ({ ...item }));

    return {
      total: filtered.length,
      page,
      size,
      items,
    };
  }

  async updateUserPartial(idUsuario, patch = {}) {
    const index = this.users.findIndex((item) => item.id_usuario === idUsuario);
    if (index < 0) {
      return null;
    }

    this.users[index] = { ...this.users[index], ...patch };
    return { ...this.users[index] };
  }

  async softDeleteUser(idUsuario) {
    return this.updateUserPartial(idUsuario, { estado: false });
  }

  async unlockUser(idUsuario) {
    return this.updateUserPartial(idUsuario, {
      bloqueado: false,
      bloqueo_hasta: null,
      intentos_fallidos: 0,
    });
  }

  async getRawById(idUsuario) {
    return this.users.find((item) => item.id_usuario === idUsuario) || null;
  }
}

module.exports = {
  PgUserRepository,
  InMemoryUserRepository,
};
