/**
 * ProductsPage.jsx — Tiendata | MS-04 Frontend
 * Vista: Gestión de Productos
 *
 * Ruta:        /productos
 * Rol admin:   CRUD completo + deshabilitar
 * Rol operador: Solo lectura del listado
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getCategoriasActivas,
} from '../../api/products.js'
import './products.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG
══════════════════════════════════════════════════ */
const IconPlus = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconEdit = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IconTrash = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)
const IconClose = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconAlert = () => (
  <svg className="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconBox = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)
const IconBoxModal = () => (
  <svg className="empty-icon-svg" style={{ width: 16, height: 16, opacity: 1, stroke: 'var(--prod-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)
const IconSpinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
  </svg>
)
const IconWarning = () => (
  <svg className="confirm-modal__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IconPriceWarn = () => (
  <svg style={{ width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IconSearch = () => (
  <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconChevL = () => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconChevR = () => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/* ══════════════════════════════════════════════════
   HOOK: TOASTS
══════════════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timers.current[id]
    }, 3500)
  }, [])
  return { toasts, addToast: add }
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className={`toast-dot toast-dot--${t.type}`} />
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MODAL CONFIRMACIÓN DESHABILITAR
══════════════════════════════════════════════════ */
function ConfirmModal({ open, productoNombre, onConfirm, onCancel, loading }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="modal confirm-modal">
        <div className="confirm-modal__icon-wrap confirm-modal__icon-wrap--danger">
          <IconWarning />
        </div>
        <div className="confirm-modal__body">
          <h3 className="confirm-modal__title" id="confirm-title">Deshabilitar producto</h3>
          <p className="confirm-modal__text">
            Vas a deshabilitar <strong>{productoNombre}</strong>. El producto dejará de estar disponible en el catálogo activo, pero su historial se conservará.
          </p>
          <p className="confirm-modal__warning">
            Esta acción puede revertirse editando el estado del producto.
          </p>
        </div>
        <div className="confirm-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger-solid" onClick={onConfirm} disabled={loading}>
            {loading ? <><IconSpinner /> Procesando…</> : 'Deshabilitar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BADGE ESTADO
══════════════════════════════════════════════════ */
function BadgeEstado({ estado }) {
  const activo = estado === true || estado === 'activo'
  return (
    <span className={`badge-estado badge-estado--${activo ? 'activo' : 'inactivo'}`}>
      <span className="badge-dot" />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   BADGE STOCK
══════════════════════════════════════════════════ */
function BadgeStock({ stock, stockMinimo }) {
  let variant = 'ok'
  if (stock === 0) variant = 'zero'
  else if (stockMinimo != null && stock <= stockMinimo) variant = 'low'

  const labels = { ok: 'Normal', low: 'Stock bajo', zero: 'Sin stock' }
  return (
    <span className={`badge-stock badge-stock--${variant}`}>
      <span className="badge-dot" />
      {stock} {variant !== 'ok' && <span className="badge-stock-label">{labels[variant]}</span>}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   FORMATO MONEDA
══════════════════════════════════════════════════ */
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/* ══════════════════════════════════════════════════
   MODAL CREAR / EDITAR
══════════════════════════════════════════════════ */
const EMPTY_FORM = {
  nombre: '',
  codigo_barras: '',
  id_categoria: '',
  precio_compra: '',
  precio_venta: '',
  stock_inicial: '',
  stock_minimo: '',
  stock_maximo: '',
  fecha_vencimiento: '',
  ubicacion: '',
  descripcion: '',
  estado: 'true',
}

function validateForm(form, isEditing) {
  const errors = {}
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.'

  if (!isEditing) {
    if (!form.codigo_barras.trim()) {
      errors.codigo_barras = 'El código de barras es obligatorio.'
    } else if (!/^\d{13}$/.test(form.codigo_barras.trim())) {
      errors.codigo_barras = 'Debe ser un código EAN-13 (13 dígitos).'
    }
    if (!form.id_categoria) errors.id_categoria = 'Selecciona una categoría.'
    if (form.precio_compra === '' || isNaN(Number(form.precio_compra))) {
      errors.precio_compra = 'Ingresa un precio de compra válido.'
    } else if (Number(form.precio_compra) < 0) {
      errors.precio_compra = 'El precio no puede ser negativo.'
    }
    if (form.precio_venta === '' || isNaN(Number(form.precio_venta))) {
      errors.precio_venta = 'Ingresa un precio de venta válido.'
    } else if (Number(form.precio_venta) < 0) {
      errors.precio_venta = 'El precio no puede ser negativo.'
    }
    if (form.stock_inicial === '' || isNaN(Number(form.stock_inicial))) {
      errors.stock_inicial = 'Ingresa el stock inicial.'
    } else if (Number(form.stock_inicial) < 0) {
      errors.stock_inicial = 'El stock no puede ser negativo.'
    }
  } else {
    if (form.id_categoria && !form.id_categoria) errors.id_categoria = 'Categoría inválida.'
    if (form.precio_compra !== '' && (isNaN(Number(form.precio_compra)) || Number(form.precio_compra) < 0)) {
      errors.precio_compra = 'Precio de compra inválido.'
    }
    if (form.precio_venta !== '' && (isNaN(Number(form.precio_venta)) || Number(form.precio_venta) < 0)) {
      errors.precio_venta = 'Precio de venta inválido.'
    }
  }

  if (form.stock_minimo !== '' && (isNaN(Number(form.stock_minimo)) || Number(form.stock_minimo) < 0)) {
    errors.stock_minimo = 'Stock mínimo inválido.'
  }
  if (form.stock_maximo !== '' && (isNaN(Number(form.stock_maximo)) || Number(form.stock_maximo) < 0)) {
    errors.stock_maximo = 'Stock máximo inválido.'
  }
  if (
    form.stock_minimo !== '' && form.stock_maximo !== '' &&
    Number(form.stock_maximo) < Number(form.stock_minimo)
  ) {
    errors.stock_maximo = 'El stock máximo no puede ser menor al mínimo.'
  }

  return errors
}

function ProductModal({ open, editing, categorias, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [priceWarning, setPriceWarning] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        nombre: editing.nombre ?? '',
        codigo_barras: editing.codigo_barras ?? '',
        id_categoria: editing.id_categoria ? String(editing.id_categoria) : '',
        precio_compra: editing.precio_compra != null ? String(editing.precio_compra) : '',
        precio_venta: editing.precio_venta != null ? String(editing.precio_venta) : '',
        stock_inicial: '',
        stock_minimo: editing.stock_minimo != null ? String(editing.stock_minimo) : '',
        stock_maximo: editing.stock_maximo != null ? String(editing.stock_maximo) : '',
        fecha_vencimiento: editing.fecha_vencimiento
          ? editing.fecha_vencimiento.split('T')[0]
          : '',
        ubicacion: editing.ubicacion ?? '',
        descripcion: editing.descripcion ?? '',
        estado: editing.estado === false ? 'false' : 'true',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setApiError(null)
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    const compra = Number(form.precio_compra)
    const venta = Number(form.precio_venta)
    if (form.precio_compra !== '' && form.precio_venta !== '' && !isNaN(compra) && !isNaN(venta)) {
      setPriceWarning(venta < compra)
    } else {
      setPriceWarning(false)
    }
  }, [form.precio_compra, form.precio_venta])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    setApiError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const isEditing = !!editing
    const validationErrors = validateForm(form, isEditing)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setApiError(null)
    setSaving(true)

    try {
      if (isEditing) {
        const payload = {}
        if (form.nombre.trim() !== editing.nombre) payload.nombre = form.nombre.trim()
        if (form.id_categoria && Number(form.id_categoria) !== editing.id_categoria)
          payload.id_categoria = Number(form.id_categoria)
        if (form.precio_compra !== '' && Number(form.precio_compra) !== editing.precio_compra)
          payload.precio_compra = Number(form.precio_compra)
        if (form.precio_venta !== '' && Number(form.precio_venta) !== editing.precio_venta)
          payload.precio_venta = Number(form.precio_venta)
        if (form.stock_minimo !== '')
          payload.stock_minimo = Number(form.stock_minimo)
        if (form.stock_maximo !== '')
          payload.stock_maximo = Number(form.stock_maximo)
        if (form.fecha_vencimiento !== (editing.fecha_vencimiento?.split('T')[0] ?? ''))
          payload.fecha_vencimiento = form.fecha_vencimiento || null
        if (form.ubicacion.trim() !== (editing.ubicacion ?? ''))
          payload.ubicacion = form.ubicacion.trim() || null
        if (form.descripcion.trim() !== (editing.descripcion ?? ''))
          payload.descripcion = form.descripcion.trim() || null
        const estadoBool = form.estado === 'true'
        if (estadoBool !== editing.estado)
          payload.estado = estadoBool

        if (Object.keys(payload).length === 0) {
          onSave('Sin cambios para guardar.', 'info')
          return
        }

        const res = await updateProducto(editing.id_producto, payload)
        const warning = res?.warning?.message || res?.warning
        onSave(
          warning
            ? `Producto actualizado.  ${warning}`
            : 'Producto actualizado correctamente.',
          warning ? 'warn' : 'success'
        )
      } else {
        const payload = {
          nombre: form.nombre.trim(),
          codigo_barras: form.codigo_barras.trim(),
          id_categoria: Number(form.id_categoria),
          precio_compra: Number(form.precio_compra),
          precio_venta: Number(form.precio_venta),
          stock_inicial: Number(form.stock_inicial),
        }
        if (form.stock_minimo !== '') payload.stock_minimo = Number(form.stock_minimo)
        if (form.stock_maximo !== '') payload.stock_maximo = Number(form.stock_maximo)
        if (form.fecha_vencimiento) payload.fecha_vencimiento = form.fecha_vencimiento
        if (form.ubicacion.trim()) payload.ubicacion = form.ubicacion.trim()
        if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim()

        const res = await createProducto(payload)
        const warning = res?.warning?.message || res?.warning
        onSave(
          warning
            ? `Producto creado.  ${warning}`
            : 'Producto registrado correctamente.',
          warning ? 'warn' : 'success'
        )
      }
    } catch (err) {
      setApiError(err.message ?? 'No fue posible guardar. Intenta nuevamente.')
      setSaving(false)
    }
  }

  if (!open) return null
  const isEditing = !!editing

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prod-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal modal--wide">
        <div className="modal__header">
          <div className="modal__header-left">
            <div className="modal__icon-wrap">
              <IconBoxModal />
            </div>
            <h3 className="modal__title" id="prod-modal-title">
              {isEditing ? 'Editar producto' : 'Nuevo producto'}
            </h3>
          </div>
          <button className="btn-icon-only" onClick={onClose} aria-label="Cerrar" type="button">
            <IconClose />
          </button>
        </div>

        {apiError && (
          <div className="modal__alert modal__alert--error" role="alert">
            <IconAlert />
            <span>{apiError}</span>
          </div>
        )}

        {priceWarning && (
          <div className="modal__alert modal__alert--warn" role="alert">
            <IconPriceWarn />
            <span>El precio de venta es menor que el precio de compra. Puedes continuar, pero se registrará una advertencia.</span>
          </div>
        )}

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            {/* Nombre */}
            <div className={`field field--full ${errors.nombre ? 'field--error' : ''}`}>
              <label htmlFor="p-nombre" className="field__label">
                Nombre del producto <span className="required">*</span>
              </label>
              <input
                ref={inputRef}
                id="p-nombre"
                name="nombre"
                type="text"
                className="field__input"
                placeholder="Ej: Leche entera 1L"
                maxLength={100}
                autoComplete="off"
                value={form.nombre}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.nombre && <span className="field__error-msg">{errors.nombre}</span>}
            </div>

            {/* Código de barras — solo crear */}
            {!isEditing && (
              <div className={`field ${errors.codigo_barras ? 'field--error' : ''}`}>
                <label htmlFor="p-barras" className="field__label">
                  Código de barras EAN-13 <span className="required">*</span>
                </label>
                <input
                  id="p-barras"
                  name="codigo_barras"
                  type="text"
                  className="field__input"
                  placeholder="13 dígitos"
                  maxLength={13}
                  autoComplete="off"
                  value={form.codigo_barras}
                  onChange={handleChange}
                  disabled={saving}
                />
                {errors.codigo_barras
                  ? <span className="field__error-msg">{errors.codigo_barras}</span>
                  : <span className="field__hint">El código no puede modificarse después.</span>
                }
              </div>
            )}

            {/* Código — solo edición (solo lectura) */}
            {isEditing && editing?.codigo_barras && (
              <div className="field">
                <label className="field__label">Código de barras</label>
                <input
                  type="text"
                  className="field__input field__input--readonly"
                  value={editing.codigo_barras}
                  readOnly
                  disabled
                />
                <span className="field__hint">Inmutable tras el registro.</span>
              </div>
            )}

            {/* Categoría */}
            <div className={`field ${errors.id_categoria ? 'field--error' : ''}`}>
              <label htmlFor="p-cat" className="field__label">
                Categoría <span className="required">*</span>
              </label>
              <select
                id="p-cat"
                name="id_categoria"
                className="field__select"
                value={form.id_categoria}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map(c => (
                  <option key={c.id || c.id_categoria} value={c.id || c.id_categoria}>
                    {c.nombre_categoria}
                  </option>
                ))}
              </select>
              {errors.id_categoria && <span className="field__error-msg">{errors.id_categoria}</span>}
            </div>

            {/* Precio compra */}
            <div className={`field ${errors.precio_compra ? 'field--error' : ''}`}>
              <label htmlFor="p-compra" className="field__label">
                Precio de compra <span className="required">{!isEditing ? '*' : ''}</span>
              </label>
              <div className="field__input-prefix">
          
                <input
                  id="p-compra"
                  name="precio_compra"
                  type="number"
                  min="0"
                  step="1"
                  className="field__input field__input--prefixed"
                  placeholder="0"
                  value={form.precio_compra}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              {errors.precio_compra && <span className="field__error-msg">{errors.precio_compra}</span>}
            </div>

            {/* Precio venta */}
            <div className={`field ${errors.precio_venta ? 'field--error' : ''}`}>
              <label htmlFor="p-venta" className="field__label">
                Precio de venta <span className="required">{!isEditing ? '*' : ''}</span>
              </label>
              <div className="field__input-prefix">
                
                <input
                  id="p-venta"
                  name="precio_venta"
                  type="number"
                  min="0"
                  step="1"
                  className={`field__input field__input--prefixed ${priceWarning ? 'field__input--warn' : ''}`}
                  placeholder="0"
                  value={form.precio_venta}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              {errors.precio_venta && <span className="field__error-msg">{errors.precio_venta}</span>}
            </div>

            {/* Stock inicial — solo crear */}
            {!isEditing && (
              <div className={`field ${errors.stock_inicial ? 'field--error' : ''}`}>
                <label htmlFor="p-stock" className="field__label">
                  Stock inicial 
                </label>
                <input
                  id="p-stock"
                  name="stock_inicial"
                  type="number"
                  min="0"
                  step="1"
                  className="field__input"
                  placeholder="0"
                  value={form.stock_inicial}
                  onChange={handleChange}
                  disabled={saving}
                />
                {errors.stock_inicial && <span className="field__error-msg">{errors.stock_inicial}</span>}
              </div>
            )}

            {/* Stock mínimo */}
            <div className={`field ${errors.stock_minimo ? 'field--error' : ''}`}>
              <label htmlFor="p-smin" className="field__label">
                Stock mínimo <span className="field__optional">(opcional)</span>
              </label>
              <input
                id="p-smin"
                name="stock_minimo"
                type="number"
                min="0"
                step="1"
                className="field__input"
                placeholder="0"
                value={form.stock_minimo}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.stock_minimo && <span className="field__error-msg">{errors.stock_minimo}</span>}
            </div>

            {/* Stock máximo */}
            <div className={`field ${errors.stock_maximo ? 'field--error' : ''}`}>
              <label htmlFor="p-smax" className="field__label">
                Stock máximo <span className="field__optional">(opcional)</span>
              </label>
              <input
                id="p-smax"
                name="stock_maximo"
                type="number"
                min="0"
                step="1"
                className="field__input"
                placeholder="Sin límite"
                value={form.stock_maximo}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.stock_maximo && <span className="field__error-msg">{errors.stock_maximo}</span>}
            </div>

            {/* Fecha vencimiento */}
            <div className="field">
              <label htmlFor="p-fven" className="field__label">
                Fecha de vencimiento <span className="field__optional">(opcional)</span>
              </label>
              <input
                id="p-fven"
                name="fecha_vencimiento"
                type="date"
                className="field__input"
                value={form.fecha_vencimiento}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            {/* Ubicación */}
            <div className="field">
              <label htmlFor="p-ubic" className="field__label">
                Ubicación <span className="field__optional">(opcional)</span>
              </label>
              <input
                id="p-ubic"
                name="ubicacion"
                type="text"
                className="field__input"
                placeholder="Ej: Pasillo 3, Estante B"
                maxLength={80}
                autoComplete="off"
                value={form.ubicacion}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            {/* Estado — solo edición */}
            {isEditing && (
              <div className="field">
                <label htmlFor="p-estado" className="field__label">Estado</label>
                <select
                  id="p-estado"
                  name="estado"
                  className="field__select"
                  value={form.estado}
                  onChange={handleChange}
                  disabled={saving}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}

            {/* Descripción */}
            <div className="field field--full">
              <label htmlFor="p-desc" className="field__label">
                Descripción <span className="field__optional">(opcional)</span>
              </label>
              <textarea
                id="p-desc"
                name="descripcion"
                className="field__textarea"
                placeholder="Descripción breve del producto"
                maxLength={300}
                rows={2}
                value={form.descripcion}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

          </div>
        </form>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><IconSpinner /> Guardando…</>
              : isEditing ? 'Guardar cambios' : 'Registrar producto'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PAGINACIÓN
══════════════════════════════════════════════════ */
function Pagination({ page, totalPages, total, size, onPage }) {
  if (totalPages <= 1) return null

  function pageNumbers() {
    const t = totalPages
    if (t <= 6) return Array.from({ length: t }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '…', t]
    if (page >= t - 2) return [1, '…', t - 3, t - 2, t - 1, t]
    return [1, '…', page - 1, page, page + 1, '…', t]
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        {total} producto{total !== 1 ? 's' : ''} · pág. {page} de {totalPages}
      </span>
      <div className="pagination-controls">
        <button className="btn-page" onClick={() => onPage(page - 1)} disabled={page === 1}>
          <IconChevL />
        </button>
        {pageNumbers().map((n, i) =>
          n === '…'
            ? <span key={`sep${i}`} className="page-sep">…</span>
            : (
              <button
                key={n}
                className={`btn-page${page === n ? ' btn-page--active' : ''}`}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            )
        )}
        <button className="btn-page" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
          <IconChevR />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function ProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'Administrador'

  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [bannerMsg, setBannerMsg] = useState(null)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, size: 10 })

  // Filtros
  const [filterNombre, setFilterNombre] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterCodigo, setFilterCodigo] = useState('')
  const [page, setPage] = useState(1)
  const searchTimer = useRef(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // Confirm deshabilitar
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmProd, setConfirmProd] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const { toasts, addToast } = useToast()

  /* ── Cargar categorías una vez ── */
  useEffect(() => {
    getCategoriasActivas()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.categorias ?? data?.data?.categorias ?? [])
        setCategorias(list)
      })
      .catch(() => {})
  }, [])

  /* ── Cargar productos ── */
  const cargar = useCallback(async () => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const data = await getProductos({
        nombre: filterNombre || undefined,
        id_categoria: filterCat || undefined,
        codigo: filterCodigo || undefined,
        page,
        size: 10,
      })
      const payload = data?.data ?? data
      const items = payload?.productos ?? payload?.items ?? []
      setProductos(items)
      setPagination({
        total: payload?.total ?? 0,
        totalPages: payload?.totalPages ?? (Math.ceil((payload?.total ?? 0) / 10) || 1),
        page: payload?.page ?? page,
        size: payload?.size ?? 10,
      })
    } catch (err) {
      setBannerMsg({ text: err.message ?? 'No fue posible cargar los productos.', type: 'error' })
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [filterNombre, filterCat, filterCodigo, page])

  useEffect(() => { cargar() }, [cargar])

  /* ── Búsqueda con debounce ── */
  function handleSearchChange(setter) {
    return (e) => {
      const v = e.target.value
      setter(v)
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => setPage(1), 400)
    }
  }

  /* ── Acciones modales ── */
  function abrirCrear() { setEditing(null); setModalOpen(true) }
  function abrirEditar(p) { setEditing(p); setModalOpen(true) }
  function cerrarModal() { setModalOpen(false); setEditing(null) }

  function handleSaved(msg, type = 'success') {
    cerrarModal()
    addToast(msg, type)
    setPage(1)
    cargar()
  }

  function pedirConfirm(prod) {
    setConfirmProd(prod)
    setConfirmOpen(true)
  }
  function cerrarConfirm() {
    setConfirmOpen(false)
    setConfirmProd(null)
    setConfirmLoading(false)
  }

  async function ejecutarDeshabilitar() {
    if (!confirmProd) return
    setConfirmLoading(true)
    try {
      await deleteProducto(confirmProd.id_producto)
      cerrarConfirm()
      addToast('Producto deshabilitado correctamente.', 'success')
      cargar()
    } catch (err) {
      cerrarConfirm()
      addToast(err.message ?? 'No fue posible deshabilitar el producto.', 'error')
    }
  }

  /* ── Render tabla ── */
  function renderBody() {
    if (loading) {
      return (
        <tr>
          <td colSpan={isAdmin ? 7 : 6} className="table-empty">
            <IconSpinner />
            <span>Cargando productos…</span>
          </td>
        </tr>
      )
    }
    if (!productos.length) {
      return (
        <tr>
          <td colSpan={isAdmin ? 7 : 6} className="table-empty">
            <IconBox />
            <span>No hay productos para mostrar.</span>
          </td>
        </tr>
      )
    }

    return productos.map(p => {
      const activo = p.estado !== false && p.estado !== 'inactivo'
      const priceLow = Number(p.precio_venta) < Number(p.precio_compra)

      return (
        <tr key={p.id_producto}>
          <td className="td-codigo">
            <span className="codigo-badge">{p.codigo_barras ?? p.codigo_barras_unico ?? '—'}</span>
          </td>
          <td className="td-nombre">
            <div className="nombre-cell">
              <span className="nombre-text">{p.nombre}</span>
              {priceLow && (
                <span className="price-warn-chip" title="Precio de venta menor al de compra">
                  <IconPriceWarn /> precio
                </span>
              )}
            </div>
          </td>
          <td className="td-cat">
            {p.categoria || p.nombre_categoria
              ? <span className="cat-chip">{p.categoria || p.nombre_categoria}</span>
              : <span className="text-muted">—</span>
            }
          </td>
          <td className="td-precio">{formatCurrency(p.precio_venta)}</td>
          <td>
            <BadgeStock stock={p.stock_actual} stockMinimo={p.stock_minimo} />
          </td>
          <td>
            <BadgeEstado estado={p.estado} />
          </td>
          {isAdmin && (
            <td className="td-actions">
              <div className="actions-group">
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => abrirEditar(p)}
                  title="Editar producto"
                >
                  Editar
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => pedirConfirm(p)}
                  disabled={!activo}
                  title={!activo ? 'Ya está deshabilitado' : 'Deshabilitar producto'}
                >
                  Deshabilitar
                </button>
              </div>
            </td>
          )}
        </tr>
      )
    })
  }

  return (
    <div className="prod-page">

      {/* Encabezado */}
      <div className="prod-page__header">
        <div className="prod-page__heading">
          <h2 className="prod-page__title">Gestión de productos</h2>
          <p className="prod-page__subtitle">Administra el catálogo de productos del inventario</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary btn--lg" onClick={abrirCrear}>
            Nuevo producto
          </button>
        )}
      </div>

      {/* Banner error */}
      {bannerMsg && (
        <div className={`alert-banner alert-banner--${bannerMsg.type}`} role="alert">
          <IconAlert />
          <span>{bannerMsg.text}</span>
          <button
            className="alert-banner__close"
            onClick={() => setBannerMsg(null)}
            aria-label="Cerrar alerta"
            type="button"
          >
            <IconClose />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-row">
        <div className="search-group">
          <div className="search-wrap">
            <IconSearch />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre…"
              value={filterNombre}
              onChange={handleSearchChange(setFilterNombre)}
              aria-label="Filtrar por nombre"
            />
          </div>
          <div className="search-wrap">
            <IconSearch />
            <input
              type="text"
              className="search-input"
              placeholder="Código de barras…"
              value={filterCodigo}
              onChange={handleSearchChange(setFilterCodigo)}
              aria-label="Filtrar por código"
            />
          </div>
        </div>
        <div className="filter-bar">
          <span className="filter-bar__label">Categoría:</span>
          <select
            className="filter-select"
            value={filterCat}
            onChange={e => { setFilterCat(e.target.value); setPage(1) }}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas</option>
            {categorias.map(c => (
              <option key={c.id || c.id_categoria} value={c.id || c.id_categoria}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-card">
        <div className="table-card__toolbar">
          {!loading && (
            <span className="table-card__count">
              {pagination.total} {pagination.total === 1 ? 'producto' : 'productos'}
            </span>
          )}
          {!isAdmin && <span className="footer-role">Modo lectura</span>}
        </div>

        <div className="table-wrapper">
          <table className="prod-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio venta</th>
                <th>Stock</th>
                <th>Estado</th>
                {isAdmin && <th className="th-actions">Acciones</th>}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          size={pagination.size}
          onPage={setPage}
        />

        <div className="table-card__footer">
          <span className="footer-hint">
            
          </span>
        </div>
      </div>

      {/* Modal crear / editar */}
      <ProductModal
        key={modalOpen ? (editing?.id_producto ?? 'new') : 'closed'}
        open={modalOpen}
        editing={editing}
        categorias={categorias}
        onClose={cerrarModal}
        onSave={handleSaved}
      />

      {/* Modal confirmación */}
      <ConfirmModal
        open={confirmOpen}
        productoNombre={confirmProd?.nombre ?? ''}
        onConfirm={ejecutarDeshabilitar}
        onCancel={cerrarConfirm}
        loading={confirmLoading}
      />

      <ToastContainer toasts={toasts} />
    </div>
  )
}