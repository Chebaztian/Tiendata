/**
 * products.js — Tiendata | MS-04 API Layer
 *
 * Endpoints consumidos (API Gateway → localhost:3000):
 *   GET    /api/products?nombre=&id_categoria=&codigo=&page=&size=
 *   GET    /api/products/:id
 *   POST   /api/products       { codigo_barras, nombre, id_categoria, precio_compra,
 *                                precio_venta, stock_inicial, stock_minimo?, stock_maximo?,
 *                                fecha_vencimiento?, ubicacion?, descripcion? }
 *   PUT    /api/products/:id   { nombre?, id_categoria?, precio_compra?, precio_venta?,
 *                                stock_minimo?, stock_maximo?, fecha_vencimiento?,
 *                                ubicacion?, descripcion?, estado? }
 *   DELETE /api/products/:id   → borrado lógico
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
    data.descripcion,
  ]

  for (const c of candidatos) {
    if (c && typeof c === 'string' && c.trim()) return c.trim()
  }

  if (data.data) return extractErrorMessage(data.data)

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0]
    if (typeof first === 'string') return first
    if (first?.message) return first.message
    if (first?.msg) return first.msg
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
  try {
    data = await res.json()
  } catch {
    /* sin body */
  }

  if (!res.ok) {
    const err = new Error(extractErrorMessage(data))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/**
 * Listar productos con paginación y filtros
 * @param {{ nombre?, id_categoria?, codigo?, page?, size? }} params
 */
export function getProductos({ nombre, id_categoria, codigo, page = 1, size = 10 } = {}) {
  const qs = new URLSearchParams()
  if (nombre)       qs.set('nombre', nombre)
  if (id_categoria) qs.set('id_categoria', String(id_categoria))
  if (codigo)       qs.set('codigo', codigo)
  qs.set('page', String(page))
  qs.set('size', String(size))
  return apiFetch(`/products?${qs.toString()}`)
}

/** Obtener producto por ID */
export function getProductoById(id) {
  return apiFetch(`/products/${id}`)
}

/** Crear producto */
export function createProducto(payload) {
  return apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Actualizar producto (parcial) */
export function updateProducto(id, payload) {
  return apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Deshabilitar producto (borrado lógico) */
export function deleteProducto(id) {
  return apiFetch(`/products/${id}`, { method: 'DELETE' })
}

/** Obtener categorías activas (para el selector del formulario) */
export function getCategoriasActivas() {
  return apiFetch('/categories?estado=activo')
}