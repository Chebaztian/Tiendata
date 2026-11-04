/**
 * Inventory.jsx — Tiendata  |  MS-05 Frontend
 * Vista: Movimientos de Inventario
 *
 * Ruta:       /inventario
 * Roles:
 *   Administrador → Entrada, Salida, Ajuste + Historial completo
 *   Operador      → Entrada, Salida          + Historial (solo lectura de ajustes)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  registrarMovimiento,
  getMovimientos,
  getProductos,
} from '../../api/inventory.js'
import './inventory.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG 
══════════════════════════════════════════════════ */

// Íconos de tipo de movimiento (usados en selector 22px y en tabs 16px)
const IconEntrada = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)
const IconSalida = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)
const IconAjuste = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93A10 10 0 1 1 4.93 19.07" />
    <path d="M20 12a8 8 0 0 0-8-8" />
  </svg>
)

// Ícono check para pantalla de éxito (26px dentro del círculo)
const IconCheck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// Ícono alerta (16px, equivalente a .inline-icon de products)
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// Ícono cerrar (13px, equivalente a .btn-icon de products)
const IconClose = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// Íconos de botones en toolbar (13px, equivalente a .btn-icon)
const IconFilter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

// Íconos de paginación (12px)
const IconChevronLeft = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// Ícono estado vacío (36px, equivalente a .empty-icon-svg de products)
const IconBox = () => (
  <svg
    width="36" height="36"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', margin: '0 auto 10px', opacity: 0.45, flexShrink: 0 }}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

// Ícono candado (15px, para nota admin-only)
const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

// Spinner (14px en botones, 26px en carga de tabla)
const IconSpinner = () => (
  <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
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
    }, 4000)
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
   FORMULARIO DE REGISTRO
══════════════════════════════════════════════════ */
const MOTIVOS_SALIDA = [
  { val: 'venta',  label: 'Venta' },
  { val: 'merma',  label: 'Merma' },
  { val: 'rotura', label: 'Rotura' },
  { val: 'danado', label: 'Dañado' },
  { val: 'vencido',label: 'Vencido' },
]

const INITIAL_FORM = {
  id_producto:   '',
  cantidad:      '',
  // entrada
  numero_factura: '',
  // salida
  motivo:        '',
  // ajuste
  tipo_ajuste:   'sobrante',
  motivo_ajuste: '',
  // común
  comentario:    '',
}

function FormRegistro({ isAdmin, productos, productosCargando, onRegistrado, addToast }) {
  const [tipoMovimiento, setTipoMovimiento] = useState('entrada')
  const [form, setForm]       = useState(INITIAL_FORM)
  const [errors, setErrors]   = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading]  = useState(false)
  const [resultado, setResultado] = useState(null)

  const productoSeleccionado = productos.find(
    p => String(p.id_producto) === String(form.id_producto)
  )

  function handleTipo(tipo) {
    setTipoMovimiento(tipo)
    setForm(INITIAL_FORM)
    setErrors({})
    setApiError(null)
    setResultado(null)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    setApiError(null)
  }

  function validate() {
    const errs = {}
    if (!form.id_producto) errs.id_producto = 'Selecciona un producto.'
    const cant = Number(form.cantidad)
    if (!form.cantidad || !Number.isInteger(cant) || cant <= 0)
      errs.cantidad = 'Ingresa una cantidad entera mayor a 0.'
    if (tipoMovimiento === 'salida' && !form.motivo)
      errs.motivo = 'Selecciona un motivo de salida.'
    if (tipoMovimiento === 'ajuste' && !form.motivo_ajuste.trim())
      errs.motivo_ajuste = 'El motivo del ajuste es obligatorio.'
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setApiError(null)
    setLoading(true)

    let payload = {
      id_producto:    Number(form.id_producto),
      tipo_movimiento: tipoMovimiento,
      cantidad:       Number(form.cantidad),
    }

    if (tipoMovimiento === 'entrada') {
      if (form.numero_factura.trim()) payload.numero_factura = form.numero_factura.trim()
      if (form.comentario.trim())     payload.comentario     = form.comentario.trim()
    } else if (tipoMovimiento === 'salida') {
      payload.motivo = form.motivo
      if (form.comentario.trim()) payload.comentario = form.comentario.trim()
    } else {
      payload.tipo_ajuste   = form.tipo_ajuste
      payload.motivo_ajuste = form.motivo_ajuste.trim()
      if (form.comentario.trim()) payload.comentario = form.comentario.trim()
    }

    try {
      const resp = await registrarMovimiento(payload)
      setResultado({ ...resp.data, tipo: tipoMovimiento })
      onRegistrado()
    } catch (err) {
      setApiError(err.message ?? 'No fue posible registrar el movimiento.')
      if (err.status === 422) addToast('Stock insuficiente para registrar la salida.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleNuevo() {
    setResultado(null)
    setForm(INITIAL_FORM)
    setErrors({})
    setApiError(null)
  }

  // Pantalla de éxito tras registro
  if (resultado) {
    const stockAfterColor = tipoMovimiento === 'salida' ? 'stock-change__to--salida' : tipoMovimiento === 'ajuste' ? 'stock-change__to--ajuste' : 'stock-change__to--entrada'
    return (
      <div className="registro-result">
        <div className={`registro-result__icon registro-result__icon--${tipoMovimiento}`}>
          <IconCheck />
        </div>
        <h3 className="registro-result__title">
          {tipoMovimiento === 'entrada' && 'Entrada registrada'}
          {tipoMovimiento === 'salida'  && 'Salida registrada'}
          {tipoMovimiento === 'ajuste'  && 'Ajuste registrado'}
        </h3>
        <p className="registro-result__detail">
          <strong>{resultado.nombre_producto}</strong> — {Number(resultado.cantidad)} unidades
          {resultado.numero_factura ? ` · Factura: ${resultado.numero_factura}` : ''}
        </p>
        <div className="registro-result__stock">
          <div className="stock-item">
            <span className="stock-item__val stock-item__val--before">{resultado.stock_anterior}</span>
            <span className="stock-item__lbl">Stock anterior</span>
          </div>
          <div className="stock-arrow">→</div>
          <div className="stock-item">
            <span className={`stock-item__val ${tipoMovimiento === 'salida' && resultado.nuevo_stock <= 0 ? 'stock-item__val--after-danger' : 'stock-item__val--after'}`}>
              {resultado.nuevo_stock}
            </span>
            <span className="stock-item__lbl">Nuevo stock</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button className="btn btn--ghost" onClick={handleNuevo}>Registrar otro</button>
        </div>
      </div>
    )
  }

  const tipoColor = tipoMovimiento === 'entrada' ? 'entrada' : tipoMovimiento === 'salida' ? 'salida' : 'ajuste'

  return (
    <div className="inv-form">
      {/* Selector tipo */}
      <div className="tipo-selector">
        <button
          type="button"
          className={`tipo-btn ${tipoMovimiento === 'entrada' ? 'active--entrada' : ''}`}
          onClick={() => handleTipo('entrada')}
        >
          <IconEntrada />
          Entrada
        </button>
        <button
          type="button"
          className={`tipo-btn ${tipoMovimiento === 'salida' ? 'active--salida' : ''}`}
          onClick={() => handleTipo('salida')}
        >
          <IconSalida />
          Salida
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`tipo-btn ${tipoMovimiento === 'ajuste' ? 'active--ajuste' : ''}`}
            onClick={() => handleTipo('ajuste')}
          >
            <IconAjuste />
            Ajuste
          </button>
        )}
      </div>

      {/* Nota ajuste solo admin */}
      {tipoMovimiento === 'ajuste' && (
        <div className="admin-only-note">
          <IconLock />
          Los ajustes de inventario son exclusivos del Administrador y quedan registrados con trazabilidad completa.
        </div>
      )}

      {/* Error banner */}
      {apiError && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert />
          <span>{apiError}</span>
          <button className="alert-banner__close" onClick={() => setApiError(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {/* Producto */}
      <div className={`field ${errors.id_producto ? 'field--error' : ''}`}>
        <label className="field__label">
          Producto <span className="required">*</span>
        </label>
        {productosCargando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--inv-text-muted)', fontSize: 13 }}>
            <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            Cargando productos…
          </div>
        ) : (
          <select
            name="id_producto"
            className="field__select"
            value={form.id_producto}
            onChange={handleChange}
          >
            <option value="">— Selecciona un producto —</option>
            {productos.map(p => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre} {p.codigo_barras ? `(${p.codigo_barras})` : ''}
              </option>
            ))}
          </select>
        )}
        {errors.id_producto && <span className="field__error-msg">{errors.id_producto}</span>}
        {/* Stock badge */}
        {productoSeleccionado && (
          <span className={`field__stock-badge ${productoSeleccionado.stock_actual <= (productoSeleccionado.stock_minimo ?? 0) ? 'field__stock-badge--low' : 'field__stock-badge--ok'}`}>
            Stock disponible: <strong>{productoSeleccionado.stock_actual}</strong> unidades
          </span>
        )}
      </div>

      {/* Cantidad */}
      <div className="form-row">
        <div className={`field ${errors.cantidad ? 'field--error' : ''}`}>
          <label className="field__label">
            Cantidad <span className="required">*</span>
          </label>
          <input
            type="number"
            name="cantidad"
            className="field__input"
            placeholder="Ej: 10"
            min="1"
            step="1"
            value={form.cantidad}
            onChange={handleChange}
          />
          {errors.cantidad && <span className="field__error-msg">{errors.cantidad}</span>}
        </div>

        {/* Campos condicionales por tipo */}
        {tipoMovimiento === 'entrada' && (
          <div className="field">
            <label className="field__label">
              N° Factura <span className="field__optional">(opcional)</span>
            </label>
            <input
              type="text"
              name="numero_factura"
              className="field__input"
              placeholder="Ej: FAC-001"
              maxLength={50}
              value={form.numero_factura}
              onChange={handleChange}
            />
          </div>
        )}

        {tipoMovimiento === 'salida' && (
          <div className={`field ${errors.motivo ? 'field--error' : ''}`}>
            <label className="field__label">
              Motivo de salida <span className="required">*</span>
            </label>
            <select
              name="motivo"
              className="field__select"
              value={form.motivo}
              onChange={handleChange}
            >
              <option value="">— Selecciona —</option>
              {MOTIVOS_SALIDA.map(m => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
            {errors.motivo && <span className="field__error-msg">{errors.motivo}</span>}
          </div>
        )}

        {tipoMovimiento === 'ajuste' && (
          <div className="field">
            <label className="field__label">
              Tipo de ajuste <span className="required">*</span>
            </label>
            <select
              name="tipo_ajuste"
              className="field__select"
              value={form.tipo_ajuste}
              onChange={handleChange}
            >
              <option value="sobrante">Sobrante (+)</option>
              <option value="faltante">Faltante (−)</option>
            </select>
          </div>
        )}
      </div>

      {/* Motivo ajuste */}
      {tipoMovimiento === 'ajuste' && (
        <div className={`field ${errors.motivo_ajuste ? 'field--error' : ''}`}>
          <label className="field__label">
            Motivo del ajuste <span className="required">*</span>
          </label>
          <input
            type="text"
            name="motivo_ajuste"
            className="field__input"
            placeholder="Ej: Conteo cíclico, error de ingreso…"
            maxLength={120}
            value={form.motivo_ajuste}
            onChange={handleChange}
          />
          {errors.motivo_ajuste && <span className="field__error-msg">{errors.motivo_ajuste}</span>}
        </div>
      )}

      {/* Comentario */}
      <div className="field">
        <label className="field__label">
          Comentario <span className="field__optional">(opcional)</span>
        </label>
        <input
          type="text"
          name="comentario"
          className="field__input"
          placeholder="Observaciones adicionales…"
          maxLength={200}
          value={form.comentario}
          onChange={handleChange}
        />
      </div>

      {/* Footer */}
      <div className="form-footer">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => { setForm(INITIAL_FORM); setErrors({}); setApiError(null) }}
          disabled={loading}
        >
          Limpiar
        </button>
        <button
          type="button"
          className={`btn btn--${tipoColor} btn--lg`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <><IconSpinner /> Registrando…</>
            : tipoMovimiento === 'entrada' ? 'Registrar entrada'
            : tipoMovimiento === 'salida'  ? 'Registrar salida'
            : 'Registrar ajuste'
          }
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   HISTORIAL DE MOVIMIENTOS
══════════════════════════════════════════════════ */
function BadgeTipo({ tipo }) {
  const label = tipo === 'entrada' ? 'Entrada' : tipo === 'salida' ? 'Salida' : 'Ajuste'
  return (
    <span className={`badge-tipo badge-tipo--${tipo}`}>
      <span className="badge-dot" />
      {label}
    </span>
  )
}

function StockChange({ anterior, posterior, tipo }) {
  return (
    <div className="stock-change">
      <span className="stock-change__from">{anterior}</span>
      <span className="stock-change__arrow">→</span>
      <span className={`stock-change__to--${tipo}`}>{posterior}</span>
    </div>
  )
}

function Historial({ refreshSignal, addToast }) {
  const [movimientos, setMovimientos] = useState([])
  const [total,       setTotal]       = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [bannerMsg,   setBannerMsg]   = useState(null)

  // Filtros
  const [filtroTipo,     setFiltroTipo]     = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroFecha,    setFiltroFecha]    = useState('')

  const PAGE_SIZE = 10

  const cargar = useCallback(async (pg = 1) => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const params = { page: pg, size: PAGE_SIZE }
      if (filtroTipo)     params.tipo     = filtroTipo
      if (filtroProducto) params.producto = filtroProducto
      if (filtroFecha)    params.fecha    = filtroFecha

      const resp = await getMovimientos(params)
      const data = resp.data ?? resp
      setMovimientos(data.items ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
      setPage(pg)
    } catch (err) {
      setBannerMsg(err.message ?? 'No fue posible cargar el historial.')
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroProducto, filtroFecha])

  useEffect(() => { cargar(1) }, [cargar, refreshSignal])

  function handleFiltrar(e) {
    e.preventDefault()
    cargar(1)
  }

  function handleLimpiarFiltros() {
    setFiltroTipo('')
    setFiltroProducto('')
    setFiltroFecha('')
  }

  function formatFechaHora(item) {
    if (!item.fecha) return '—'
    return `${item.fecha} ${item.hora ? item.hora.slice(0, 5) : ''}`
  }

  return (
    <div className="inv-card">
      {/* Toolbar filtros */}
      <form className="hist-toolbar" onSubmit={handleFiltrar}>
        <div className="hist-toolbar__filters">
          <div className="filter-field">
            <label className="filter-label">Tipo</label>
            <select
              className="filter-select"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">ID Producto</label>
            <input
              type="number"
              className="filter-input"
              placeholder="Ej: 1"
              min="1"
              value={filtroProducto}
              onChange={e => setFiltroProducto(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label className="filter-label">Fecha exacta</label>
            <input
              type="date"
              className="filter-input"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
            />
          </div>
        </div>
        <div className="hist-toolbar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleLimpiarFiltros} title="Limpiar filtros">
            <IconClose />
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={loading}>
            <IconFilter />
            Filtrar
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => cargar(page)} disabled={loading} title="Refrescar">
            <IconRefresh />
          </button>
        </div>
      </form>

      {/* Banner error */}
      {bannerMsg && (
        <div className="alert-banner alert-banner--error" role="alert" style={{ margin: '12px 22px' }}>
          <IconAlert />
          <span>{bannerMsg}</span>
          <button className="alert-banner__close" onClick={() => setBannerMsg(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Stock</th>
              <th>Motivo / Factura</th>
              <th>Usuario</th>
              <th>Fecha y hora</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  <svg
                    width="28" height="28"
                    className="spinner"
                    viewBox="0 0 24 24" fill="none"
                    style={{ display: 'block', margin: '0 auto 10px' }}
                  >
                    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
                  </svg>
                  Cargando historial de Inventario…
                </td>
              </tr>
            ) : !movimientos.length ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  <IconBox />
                  No hay movimientos para mostrar con los filtros seleccionados.
                </td>
              </tr>
            ) : movimientos.map(m => (
              <tr key={m.id_movimiento}>
                <td><BadgeTipo tipo={m.tipo || m.movement_type} /></td>
                <td style={{ fontWeight: 600 }}>
                  {m.nombre_producto ?? '—'}
                  <div style={{ fontSize: 11, color: 'var(--inv-text-soft)', fontWeight: 400 }}>
                    ID: {m.id_producto}
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{m.cantidad}</td>
                <td>
                  <StockChange
                    anterior={m.stock_anterior}
                    posterior={m.nuevo_stock ?? m.stock_posterior}
                    tipo={m.tipo || m.movement_type}
                  />
                </td>
                <td style={{ maxWidth: 160 }}>
                  <span style={{ display: 'block', fontWeight: 500 }}>
                    {m.motivo || m.tipo_ajuste || '—'}
                  </span>
                  {m.numero_factura && (
                    <span style={{ fontSize: 11, color: 'var(--inv-text-soft)' }}>
                      Fact: {m.numero_factura}
                    </span>
                  )}
                  {m.comentario && (
                    <span
                      style={{ fontSize: 11, color: 'var(--inv-text-soft)', display: 'block' }}
                      title={m.comentario}
                    >
                      {m.comentario.length > 30 ? m.comentario.slice(0, 30) + '…' : m.comentario}
                    </span>
                  )}
                </td>
                <td>
                  <span style={{ display: 'block' }}>{m.usuario?.nombre ?? '—'}</span>
                  <span style={{ fontSize: 11, color: 'var(--inv-text-soft)' }}>
                    {m.usuario?.rol ?? ''}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                  {formatFechaHora(m)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="pagination">
        <span>
          {total > 0
            ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} movimientos`
            : 'Sin resultados'}
        </span>
        <div className="pagination__controls">
          <button
            className="page-btn"
            onClick={() => cargar(page - 1)}
            disabled={page <= 1 || loading}
          >
            <IconChevronLeft />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pg
            if (totalPages <= 5) pg = i + 1
            else if (page <= 3)  pg = i + 1
            else if (page >= totalPages - 2) pg = totalPages - 4 + i
            else pg = page - 2 + i
            return (
              <button
                key={pg}
                className={`page-btn ${pg === page ? 'active' : ''}`}
                onClick={() => cargar(pg)}
                disabled={loading}
              >
                {pg}
              </button>
            )
          })}
          <button
            className="page-btn"
            onClick={() => cargar(page + 1)}
            disabled={page >= totalPages || loading}
          >
            <IconChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function Inventory() {
  const { user } = useAuth()
  const isAdmin  = user?.rol === 'Administrador'

  const [activeTab,      setActiveTab]      = useState('registrar')
  const [refreshSignal,  setRefreshSignal]  = useState(0)
  const [productos,      setProductos]      = useState([])
  const [productosLoad,  setProductosLoad]  = useState(true)
  const { toasts, addToast } = useToast()

  // Carga de productos para los selectores del formulario
  useEffect(() => {
    async function cargarProductos() {
      setProductosLoad(true)
      try {
        const resp = await getProductos()
        const lista = resp?.data?.productos ?? resp?.productos ?? []
        setProductos(lista)
      } catch {
        // fallo silencioso; el formulario mostrará campo vacío
      } finally {
        setProductosLoad(false)
      }
    }
    cargarProductos()
  }, [])

  function handleRegistrado() {
    addToast('Movimiento registrado correctamente.', 'success')
    setRefreshSignal(s => s + 1)
  }

  const tipoCardIcon = activeTab === 'registrar' ? 'neutral' : 'neutral'

  return (
    <div className="inv-page">
      {/* Cabecera */}
      <div className="inv-page__header">
        <div className="inv-page__heading">
          <h2 className="inv-page__title">Movimientos de inventario</h2>
          <p className="inv-page__subtitle">
            Registra entradas, salidas{isAdmin ? ' y ajustes' : ''} · Consulta el historial
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="inv-tabs">
        <button
          className={`inv-tab ${activeTab === 'registrar' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrar')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar movimiento
        </button>
        <button
          className={`inv-tab ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 3h18v4H3zM3 10h18M3 17h12" />
          </svg>
          Historial de Inventario
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'registrar' && (
        <div className="inv-card">
          <div className="inv-card__header">
            <div className="inv-card__icon-wrap inv-card__icon-wrap--neutral">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="inv-card__title">Registrar movimiento</h3>
          </div>
          <div className="inv-card__body">
            <FormRegistro
              isAdmin={isAdmin}
              productos={productos}
              productosCargando={productosLoad}
              onRegistrado={handleRegistrado}
              addToast={addToast}
            />
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <Historial
          refreshSignal={refreshSignal}
          addToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}