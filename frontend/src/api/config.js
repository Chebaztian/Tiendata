/**
 * config.js — Tiendata | MS-11 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET /api/config           → todos los parámetros del sistema
 *   GET /api/config/:key      → parámetro específico
 *   PUT /api/config/:key      → actualizar parámetro (solo Admin)
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

/** Obtener todos los parámetros del sistema */
export function getConfig() {
  return apiFetch('/config')
}

/** Obtener un parámetro específico */
export function getConfigByKey(key) {
  return apiFetch(`/config/${key}`)
}

/** Actualizar un parámetro (solo Admin) */
export function updateConfig(key, value) {
  return apiFetch(`/config/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value: String(value) }),
  })
}