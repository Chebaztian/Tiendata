/**
 * providers.js — Tiendata | MS-10 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET    /api/providers?estado=activo|inactivo|todos&page=&size=
 *   GET    /api/providers/:id
 *   POST   /api/providers    { nombre_razon_social, nit_identificacion, telefono?, direccion?, correo_electronico?, estado? }
 *   PUT    /api/providers/:id  { nombre_razon_social?, nit_identificacion?, telefono?, direccion?, correo_electronico?, estado? }
 *   DELETE /api/providers/:id  → borrado lógico
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('tiendata_token') ?? ''
}

function extractErrorMessage(data) {
  if (!data) return 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
  const candidatos = [
    data?.error?.message,
    data.error,
    data.mensaje,
    data.message,
    data.msg,
    data.detail,
  ]
  for (const c of candidatos) {
    if (c && typeof c === 'string' && c.trim()) return c.trim()
  }
  if (data.data) return extractErrorMessage(data.data)
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
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/**
 * Listar proveedores con paginación y filtro por estado
 * @param {{ page?, size?, estado? }} params
 */
export function getProveedores({ page = 1, size = 10, estado = 'activo' } = {}) {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('size', String(size))
  if (estado && estado !== 'todos') qs.set('estado', estado)
  else if (estado === 'todos') qs.set('estado', 'todos')
  return apiFetch(`/providers?${qs.toString()}`)
}

/** Obtener proveedor por ID */
export function getProveedorById(id) {
  return apiFetch(`/providers/${id}`)
}

/** Crear proveedor */
export function createProveedor(payload) {
  return apiFetch('/providers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Actualizar proveedor (parcial) */
export function updateProveedor(id, payload) {
  return apiFetch(`/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Borrado lógico de proveedor */
export function deleteProveedor(id) {
  return apiFetch(`/providers/${id}`, { method: 'DELETE' })
}

export const getProveedoresActivos = ({ page = 1, size = 100 } = {}) =>
  getProveedores({ page, size, estado: 'activo' })