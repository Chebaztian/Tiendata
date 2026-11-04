// src/api/users.js
// Capa de comunicación con MS-02 — Gestión de Usuarios
//
// Notas del contrato:
//   - El backend identifica al usuario por "correo" (usado como nombre_usuario en UI)
//   - estado llega como boolean en respuestas (true=activo, false=inactivo)
//   - estado se envía como string en requests ("activo"/"inactivo")
//   - La contraseña NUNCA se devuelve en ninguna respuesta

const BASE = '/api/users'

// ── Obtener token del localStorage ───────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('tiendata_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ── Parser centralizado de respuestas ────────────────────────────
// Lanza un error enriquecido con .code y .status para que la UI
// pueda mostrar mensajes específicos según el código del backend.
async function parseResponse(res) {
  let body
  try {
    body = await res.json()
  } catch {
    throw Object.assign(
      new Error('Respuesta inválida del servidor.'),
      { code: 'PARSE_ERROR', status: res.status }
    )
  }

  if (!res.ok) {
    const message = body?.error?.message || body?.mensaje || 'Error inesperado.'
    const code    = body?.error?.code    || 'UNKNOWN_ERROR'
    throw Object.assign(new Error(message), { code, status: res.status })
  }

  return body
}

// ── GET /api/users ───────────────────────────────────────────────
/**
 * Lista usuarios con paginación y filtro por estado.
 *
 * @param {{ page?: number, size?: number, estado?: 'activo'|'inactivo'|'todos' }} params
 * @returns {Promise<{ total: number, page: number, size: number, totalPages: number, items: Array }>}
 */
export async function getUsers({ page = 1, size = 10, estado = 'activo' } = {}) {
  const qs  = new URLSearchParams({ page, size, estado }).toString()
  const res = await fetch(`${BASE}?${qs}`, { headers: authHeaders() })
  const body = await parseResponse(res)
  return body.data
}

// ── GET /api/users/:id ───────────────────────────────────────────
/**
 * Obtiene el detalle de un usuario por su id.
 *
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getUserById(id) {
  const res  = await fetch(`${BASE}/${id}`, { headers: authHeaders() })
  const body = await parseResponse(res)
  return body.data
}

// ── POST /api/users ──────────────────────────────────────────────
/**
 * Crea un nuevo usuario.
 * El campo "correo" es el identificador único (nombre_usuario en la UI).
 *
 * @param {{ nombre: string, correo: string, contrasena: string, id_rol: number, estado?: string }} payload
 * @returns {Promise<Object>} usuario creado (sin contraseña)
 */
export async function createUser(payload) {
  const res  = await fetch(BASE, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  })
  const body = await parseResponse(res)
  return body.data
}

// ── PUT /api/users/:id ───────────────────────────────────────────
/**
 * Actualización parcial — solo envía los campos que cambiaron.
 * El campo "correo" (nombre_usuario) NO es modificable tras la creación.
 *
 * @param {number} id
 * @param {{ nombre?: string, contrasena?: string, estado?: string, id_rol?: number }} changes
 * @returns {Promise<Object>} usuario actualizado (sin contraseña)
 */
export async function updateUser(id, changes) {
  const res  = await fetch(`${BASE}/${id}`, {
    method:  'PUT',
    headers: authHeaders(),
    body:    JSON.stringify(changes),
  })
  const body = await parseResponse(res)
  return body.data
}

// ── DELETE /api/users/:id ────────────────────────────────────────
/**
 * Borrado lógico — cambia estado a inactivo.
 * El registro NO se elimina físicamente (trazabilidad).
 *
 * @param {number} id
 * @returns {Promise<{ id_usuario: number, estado: boolean }>}
 */
export async function disableUser(id, authUser) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
      'x-user-id':   String(authUser.id_usuario),
      'x-user-role': authUser.rol ?? 'Administrador',
    },
  })
  const body = await parseResponse(res)
  return body.data
}