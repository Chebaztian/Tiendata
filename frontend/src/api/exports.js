/**
 * exports.js — Cliente API para MS-12 Exportación de Datos
 *
 * Endpoint: POST /api/export  → api-gateway → export-service
 * Devuelve archivo binario (CSV / Excel / PDF / JSON) con:
 *   - Content-Disposition: attachment; filename="..."
 *   - X-Export-Records: <total>
 *
 * Solo Administrador (permiso EXPORTAR_DATOS) puede generar la descarga.
 *
 * Mantiene la misma convención que reports.js: VITE_API_URL ya incluye /api,
 * y el JWT vive en localStorage como 'tiendata_token'.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('tiendata_token') ?? ''
}

class ExportApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function parseFilename(disposition, fallback) {
  if (!disposition) return fallback
  const match = /filename="?([^"]+)"?/i.exec(disposition)
  return match ? match[1] : fallback
}

/* ──────────────────────────────────────────────────────────────
   Mapeo: tipo de reporte (MS-07) → conjunto de datos (MS-12)
   El backend MS-12 admite: productos | movimientos | proveedores
                            | categorias | todo
   ────────────────────────────────────────────────────────────── */
export const REPORT_TYPE_TO_DATASET = {
  movements: 'movimientos',
  sales:     'ventas',
  stock:     'stock',
}

/**
 * Construye el body para POST /api/export a partir de los filtros
 * activos en la pantalla de reportes.
 *
 * MS-12 solo admite estos filtros:
 *   - fecha_inicio  (movimientos)
 *   - fecha_fin     (movimientos)
 *   - id_categoria  (productos / movimientos)
 *
 * Los filtros 'producto' y 'tipo' (que sí soporta MS-07) se ignoran
 * a propósito: no son parte del contrato de MS-12.
 */
export function buildExportPayload({ reportType, filters = {}, formato }) {
  const conjunto_datos = REPORT_TYPE_TO_DATASET[reportType] ?? 'productos'
  const payload = { conjunto_datos, report_type: reportType, formato }
  if (filters.fecha_inicio) payload.fecha_inicio = filters.fecha_inicio
  if (filters.fecha_fin)    payload.fecha_fin    = filters.fecha_fin
  if (filters.categoria)    payload.id_categoria = Number(filters.categoria)
  if (filters.producto)     payload.id_producto  = Number(filters.producto)
  if (reportType === 'movements' && filters.tipo) payload.tipo = filters.tipo
  return payload
}

/**
 * POST /api/export
 *   body:    { conjunto_datos, formato, fecha_inicio?, fecha_fin?, id_categoria? }
 *   return:  { blob, filename, total }
 *   throws:  ExportApiError(status, code, message)
 */
export async function exportarDatos(body) {
  let response
  try {
    response = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ExportApiError(0, 'NETWORK_ERROR', 'No fue posible contactar al servidor.')
  }

  const contentType = response.headers.get('content-type') || ''

  // El backend responde JSON solo en caso de error.
  if (contentType.includes('application/json') && !response.ok) {
    let payload = null
    try { payload = await response.json() } catch { /* ignore */ }
    const code    = payload?.error?.code    || 'EXPORT_ERROR'
    const message = payload?.error?.message || 'No fue posible generar la exportación.'
    throw new ExportApiError(response.status, code, message)
  }

  if (!response.ok) {
    throw new ExportApiError(response.status, 'EXPORT_ERROR', 'No fue posible generar la exportación.')
  }

  const blob     = await response.blob()
  const filename = parseFilename(
    response.headers.get('content-disposition'),
    `export_${Date.now()}`
  )
  const total = Number(response.headers.get('x-export-records') || 0)

  return { blob, filename, total }
}

/* Dispara la descarga del blob en el navegador */
export function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export { ExportApiError }
