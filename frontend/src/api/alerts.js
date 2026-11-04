/**
 * alerts.js — Tiendata  |  MS-06 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET /api/inventory/alerts?type=low-stock,high-stock,expiring-soon&categoryId=<id>
 *
 * Tipos de alerta:
 *   - low-stock      → stock actual ≤ stock mínimo
 *   - high-stock     → stock actual ≥ stock máximo
 *   - expiring-soon  → fecha de vencimiento ≤ 7 días
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('tiendata_token') ?? ''
}

function extractErrorMessage(data) {
  if (!data) return 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
  const candidatos = [data.mensaje, data.message, data.error, data.msg, data.detail]
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
 * Obtener alertas de inventario activas
 * @param {{ types?: string[], categoryId?: string }} filters
 * @returns {Promise<{ data: Alert[], meta: { generatedAt: string, filters: object } }>}
 */
export function getAlerts({ types = [], categoryId = null } = {}) {
  const params = new URLSearchParams()
  if (types.length > 0) params.set('type', types.join(','))
  if (categoryId) params.set('categoryId', categoryId)
  const qs = params.toString()
  return apiFetch(`/inventory/alerts${qs ? `?${qs}` : ''}`)
}

/**
 * Obtener categorías activas para el filtro
 */
export function getCategoriasActivas() {
  return apiFetch('/categories?estado=activo')
}