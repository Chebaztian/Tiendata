/**
 * categories.js — Tiendata  |  MS-03 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET    /api/categories?estado=activo|inactivo|todos
 *   POST   /api/categories      { nombre_categoria, descripcion? }
 *   PUT    /api/categories/:id  { nombre_categoria?, descripcion?, estado? }
 *   DELETE /api/categories/:id  → 409 si hay productos activos
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('tiendata_token') ?? ''
}

/**
 * Extrae el mensaje legible del cuerpo de error que devuelve el servidor.
 *
 * El errorHandler del backend llama a sendError(res, message, status, details).
 * Dependiendo de cómo esté implementado sendError en shared/utils/response.js,
 * el campo puede llamarse de distintas formas. Se prueban todos los nombres
 * comunes para garantizar que el usuario siempre vea el mensaje real,
 * nunca un código HTTP.
 */
function extractErrorMessage(data) {
  if (!data) {
    return 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
  }

  // Campos de primer nivel — orden por probabilidad según el backend
  const candidatos = [
    data.mensaje,       // sendError puede usar este nombre en español
    data.message,       // estándar en inglés
    data.error,         // alternativa común
    data.msg,           // abreviado
    data.detail,        // usado por algunos frameworks
    data.descripcion,   // variante en español
    data.errorMessage,  // PascalCase/camelCase alternativo
  ]

  for (const c of candidatos) {
    if (c && typeof c === 'string' && c.trim()) return c.trim()
  }

  // Si el mensaje está anidado (ej: { data: { mensaje: "..." } })
  if (data.data) return extractErrorMessage(data.data)

  // Si errors es un array (ej: express-validator)
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0]
    if (typeof first === 'string') return first
    if (first?.message) return first.message
    if (first?.msg)     return first.msg
  }

  return 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers ?? {}),
    },
  })

  let data = null
  try { data = await res.json() } catch { /* sin body */ }

  if (!res.ok) {
    const err = new Error(extractErrorMessage(data))
    err.status = res.status  // solo para lógica interna (ej: if 409), nunca se muestra al usuario
    err.data   = data
    throw err
  }
  return data
}

/** Obtener categorías filtradas por estado */
export function getCategorias(estado = 'activo') {
  return apiFetch(`/categories?estado=${estado}`)
}

/** Crear una nueva categoría */
export function createCategoria(payload) {
  return apiFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Actualizar campos de una categoría (nombre, descripcion, estado) */
export function updateCategoria(id, payload) {
  return apiFetch(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Habilitar una categoría (estado → true) */
export function enableCategoria(id) {
  return apiFetch(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: true }),
  })
}

/** Deshabilitar (borrado lógico) una categoría */
export function deleteCategoria(id) {
  return apiFetch(`/categories/${id}`, { method: 'DELETE' })
}