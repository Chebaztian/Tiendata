/**
 * audit.js — Tiendata | MS-09 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET /api/audit/logs?page=&size=&usuario=&modulo=&accion=&fecha=&fecha_inicio=&fecha_fin=
 *
 * Acceso restringido a Administrador (validado en gateway con requireAdmin).
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('tiendata_token') ?? ''
}

function extractErrorMessage(data) {
  if (!data) return 'Ocurrió un error inesperado. Por favor intenta nuevamente.'

  const candidatos = [
    data?.error?.message,
    data.mensaje,
    data.message,
    data.error,
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
 * Listar logs de auditoría con paginación y filtros.
 * @param {{ page?, size?, usuario?, modulo?, accion?, fecha?, fecha_inicio?, fecha_fin? }} params
 */
export function getAuditLogs({
  page = 1,
  size = 20,
  usuario,
  modulo,
  accion,
  fecha,
  fecha_inicio,
  fecha_fin,
} = {}) {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('size', String(size))
  if (usuario)      qs.set('usuario', usuario)
  if (modulo)       qs.set('modulo', modulo)
  if (accion)       qs.set('accion', accion)
  if (fecha)        qs.set('fecha', fecha)
  if (fecha_inicio) qs.set('fecha_inicio', fecha_inicio)
  if (fecha_fin)    qs.set('fecha_fin', fecha_fin)
  return apiFetch(`/audit/logs?${qs.toString()}`)
}