/**
 * barcode.js — Tiendata | MS-08 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET  /api/barcodes/:code        → lookup por código EAN-13
 *   POST /api/barcodes/validate     → validar formato EAN-13
 *   POST /api/barcodes/generate     → generar código EAN-13 (solo Admin)
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

/** Buscar producto por código de barras EAN-13 */
export function lookupBarcode(code) {
  return apiFetch(`/barcodes/${code}`)
}

/** Validar formato y checksum EAN-13 */
export function validateBarcode(code) {
  return apiFetch('/barcodes/validate', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

/** Generar código EAN-13 válido (solo Admin) */
export function generateBarcode(prefix = '') {
  return apiFetch('/barcodes/generate', {
    method: 'POST',
    body: JSON.stringify({ prefix }),
  })
}