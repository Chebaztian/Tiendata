/**
 * ProvidersPage.jsx — Tiendata | MS-10 Frontend
 * Vista: Gestión de Proveedores
 *
 * Ruta:        /proveedores
 * Rol admin:   CRUD completo + deshabilitar
 * Rol operador: Sin acceso (guard en App.jsx)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '../../api/providers.js'
import './providers.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG
══════════════════════════════════════════════════ */
const IconClose = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconAlert = () => (
  <svg className="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconTruck = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)
const IconTruckModal = () => (
  <svg style={{ width: 16, height: 16, opacity: 1, stroke: 'var(--prov-primary)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
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
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IconSearch = () => (
  <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
   BADGE ESTADO
══════════════════════════════════════════════════ */
function BadgeEstado({ estado }) {
  const activo = estado === 'activo' || estado === true
  return (
    <span className={`badge-estado badge-estado--${activo ? 'activo' : 'inactivo'}`}>
      <span className="badge-dot" />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   MODAL CONFIRMACIÓN DESHABILITAR
══════════════════════════════════════════════════ */
function ConfirmModal({ open, proveedorNombre, onConfirm, onCancel, loading }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal confirm-modal">
        <div className="confirm-modal__icon-wrap confirm-modal__icon-wrap--danger">
          <IconWarning />
        </div>
        <div className="confirm-modal__body">
          <h3 className="confirm-modal__title" id="confirm-title">Deshabilitar proveedor</h3>
          <p className="confirm-modal__text">
            Vas a deshabilitar <strong>{proveedorNombre}</strong>. El proveedor dejará de estar disponible en el sistema, pero su historial se conservará.
          </p>
          <p className="confirm-modal__warning">
            Esta acción puede revertirse editando el estado del proveedor.
          </p>
        </div>
        <div className="confirm-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button type="button" className="btn btn--danger-solid" onClick={onConfirm} disabled={loading}>
            {loading ? <><IconSpinner /> Procesando…</> : 'Deshabilitar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   VALIDACIÓN DE FORMULARIO
══════════════════════════════════════════════════ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form, isEditing) {
  const errors = {}
  if (!isEditing || form.nombre_razon_social !== undefined) {
    if (!form.nombre_razon_social?.trim()) errors.nombre_razon_social = 'La razón social es obligatoria.'
  }
  if (!isEditing) {
    if (!form.nit_identificacion?.trim()) errors.nit_identificacion = 'El NIT es obligatorio.'
  }
  if (form.correo_electronico?.trim() && !EMAIL_RE.test(form.correo_electronico.trim())) {
    errors.correo_electronico = 'El correo no tiene un formato válido.'
  }
  return errors
}

/* ══════════════════════════════════════════════════
   MODAL CREAR / EDITAR
══════════════════════════════════════════════════ */
const EMPTY_FORM = {
  nombre_razon_social: '',
  nit_identificacion: '',
  telefono: '',
  direccion: '',
  correo_electronico: '',
  estado: 'activo',
}

function ProviderModal({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        nombre_razon_social: editing.nombre_razon_social ?? editing.razon_social ?? '',
        nit_identificacion: editing.nit_identificacion ?? editing.nit ?? '',
        telefono: editing.telefono ?? '',
        direccion: editing.direccion ?? '',
        correo_electronico: editing.correo_electronico ?? editing.correo ?? '',
        estado: editing.estado === 'inactivo' || editing.estado === false ? 'inactivo' : 'activo',
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
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }

    setErrors({})
    setApiError(null)
    setSaving(true)

    try {
      if (isEditing) {
        const payload = {}
        const razonActual = editing.nombre_razon_social ?? editing.razon_social ?? ''
        const nitActual = editing.nit_identificacion ?? editing.nit ?? ''
        const correoActual = editing.correo_electronico ?? editing.correo ?? ''

        if (form.nombre_razon_social.trim() !== razonActual) payload.nombre_razon_social = form.nombre_razon_social.trim()
        if (form.nit_identificacion.trim() !== nitActual) payload.nit_identificacion = form.nit_identificacion.trim()
        if (form.telefono.trim() !== (editing.telefono ?? '')) payload.telefono = form.telefono.trim() || null
        if (form.direccion.trim() !== (editing.direccion ?? '')) payload.direccion = form.direccion.trim() || null
        if (form.correo_electronico.trim() !== correoActual) payload.correo_electronico = form.correo_electronico.trim() || null
        const estadoBool = form.estado === 'activo'
        if (estadoBool !== (editing.estado !== 'inactivo' && editing.estado !== false)) payload.estado = form.estado

        if (Object.keys(payload).length === 0) { onSave('Sin cambios para guardar.', 'info'); return }
        await updateProveedor(editing.id_proveedor ?? editing.id, payload)
        onSave('Proveedor actualizado correctamente.')
      } else {
        const payload = {
          nombre_razon_social: form.nombre_razon_social.trim(),
          nit_identificacion: form.nit_identificacion.trim(),
        }
        if (form.telefono.trim()) payload.telefono = form.telefono.trim()
        if (form.direccion.trim()) payload.direccion = form.direccion.trim()
        if (form.correo_electronico.trim()) payload.correo_electronico = form.correo_electronico.trim()
        payload.estado = form.estado
        await createProveedor(payload)
        onSave('Proveedor registrado correctamente.')
      }
    } catch (err) {
      setApiError(err.message ?? 'No fue posible guardar. Intenta nuevamente.')
      setSaving(false)
    }
  }

  if (!open) return null
  const isEditing = !!editing

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="prov-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal--wide">
        <div className="modal__header">
          <div className="modal__header-left">
            <div className="modal__icon-wrap"><IconTruckModal /></div>
            <h3 className="modal__title" id="prov-modal-title">
              {isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h3>
          </div>
          <button className="btn-icon-only" onClick={onClose} aria-label="Cerrar" type="button">
            <IconClose />
          </button>
        </div>

        {apiError && (
          <div className="modal__alert modal__alert--error" role="alert">
            <IconAlert /><span>{apiError}</span>
          </div>
        )}

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">

            {/* Razón social */}
            <div className={`field field--full ${errors.nombre_razon_social ? 'field--error' : ''}`}>
              <label htmlFor="p-razon" className="field__label">
                Razón social <span className="required">*</span>
              </label>
              <input ref={inputRef} id="p-razon" name="nombre_razon_social" type="text"
                className="field__input" placeholder="Ej: Distribuidora del Valle S.A.S."
                maxLength={120} autoComplete="off" value={form.nombre_razon_social}
                onChange={handleChange} disabled={saving} />
              {errors.nombre_razon_social && <span className="field__error-msg">{errors.nombre_razon_social}</span>}
            </div>

            {/* NIT */}
            <div className={`field ${errors.nit_identificacion ? 'field--error' : ''}`}>
              <label htmlFor="p-nit" className="field__label">
                NIT / Identificación <span className="required">*</span>
              </label>
              <input id="p-nit" name="nit_identificacion" type="text"
                className={`field__input${isEditing ? ' field__input--readonly' : ''}`}
                placeholder="Ej: 900100200"
                maxLength={20} autoComplete="off" value={form.nit_identificacion}
                onChange={handleChange} disabled={saving || isEditing} readOnly={isEditing} />
              {errors.nit_identificacion
                ? <span className="field__error-msg">{errors.nit_identificacion}</span>
                : isEditing && <span className="field__hint">El NIT no puede modificarse tras el registro.</span>
              }
            </div>

            {/* Teléfono */}
            <div className="field">
              <label htmlFor="p-tel" className="field__label">
                Teléfono <span className="field__optional">(opcional)</span>
              </label>
              <input id="p-tel" name="telefono" type="text"
                className="field__input" placeholder="Ej: 3001112233"
                maxLength={20} autoComplete="off" value={form.telefono}
                onChange={handleChange} disabled={saving} />
            </div>

            {/* Correo */}
            <div className={`field ${errors.correo_electronico ? 'field--error' : ''}`}>
              <label htmlFor="p-correo" className="field__label">
                Correo electrónico <span className="field__optional">(opcional)</span>
              </label>
              <input id="p-correo" name="correo_electronico" type="email"
                className="field__input" placeholder="Ej: ventas@proveedor.com"
                maxLength={100} autoComplete="off" value={form.correo_electronico}
                onChange={handleChange} disabled={saving} />
              {errors.correo_electronico && <span className="field__error-msg">{errors.correo_electronico}</span>}
            </div>

            {/* Dirección */}
            <div className="field field--full">
              <label htmlFor="p-dir" className="field__label">
                Dirección <span className="field__optional">(opcional)</span>
              </label>
              <input id="p-dir" name="direccion" type="text"
                className="field__input" placeholder="Ej: Calle 10 # 20-30, Bogotá"
                maxLength={200} autoComplete="off" value={form.direccion}
                onChange={handleChange} disabled={saving} />
            </div>

            {/* Estado — solo edición */}
            {isEditing && (
              <div className="field">
                <label htmlFor="p-estado" className="field__label">Estado</label>
                <select id="p-estado" name="estado" className="field__select"
                  value={form.estado} onChange={handleChange} disabled={saving}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            )}
          </div>
        </form>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><IconSpinner /> Guardando…</> : isEditing ? 'Guardar cambios' : 'Registrar proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PAGINACIÓN
══════════════════════════════════════════════════ */
function Pagination({ page, totalPages, total, onPage }) {
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
        {total} proveedor{total !== 1 ? 'es' : ''} · pág. {page} de {totalPages}
      </span>
      <div className="pagination-controls">
        <button className="btn-page" onClick={() => onPage(page - 1)} disabled={page === 1}><IconChevL /></button>
        {pageNumbers().map((n, i) =>
          n === '…'
            ? <span key={`sep${i}`} className="page-sep">…</span>
            : <button key={n} className={`btn-page${page === n ? ' btn-page--active' : ''}`} onClick={() => onPage(n)}>{n}</button>
        )}
        <button className="btn-page" onClick={() => onPage(page + 1)} disabled={page === totalPages}><IconChevR /></button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function ProvidersPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'Administrador'

  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [bannerMsg, setBannerMsg] = useState(null)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, size: 10 })
  const [filterEstado, setFilterEstado] = useState('activo')
  const [filterSearch, setFilterSearch] = useState('')
  const [page, setPage] = useState(1)
  const searchTimer = useRef(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmProv, setConfirmProv] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const { toasts, addToast } = useToast()

  const cargar = useCallback(async () => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const data = await getProveedores({ page, size: 10, estado: filterEstado })
      const payload = data?.data ?? data
      const items = payload?.proveedores ?? payload?.items ?? []
      setProveedores(items)
      setPagination({
        total: payload?.total ?? 0,
        totalPages: payload?.totalPages ?? (Math.ceil((payload?.total ?? 0) / 10) || 1),
        page: payload?.page ?? page,
        size: payload?.size ?? 10,
      })
    } catch (err) {
      setBannerMsg({ text: err.message ?? 'No fue posible cargar los proveedores.', type: 'error' })
      setProveedores([])
    } finally {
      setLoading(false)
    }
  }, [page, filterEstado])

  useEffect(() => { cargar() }, [cargar])

  function handleSearchChange(e) {
    setFilterSearch(e.target.value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setPage(1), 400)
  }

  const visible = proveedores.filter(p => {
    if (!filterSearch.trim()) return true
    const q = filterSearch.toLowerCase()
    return (
      (p.nombre_razon_social ?? p.razon_social ?? '').toLowerCase().includes(q) ||
      (p.nit_identificacion ?? p.nit ?? '').toLowerCase().includes(q) ||
      (p.correo_electronico ?? p.correo ?? '').toLowerCase().includes(q)
    )
  })

  function abrirCrear() { setEditing(null); setModalOpen(true) }
  function abrirEditar(p) { setEditing(p); setModalOpen(true) }
  function cerrarModal() { setModalOpen(false); setEditing(null) }
  function handleSaved(msg, type = 'success') { cerrarModal(); addToast(msg, type); cargar() }

  function pedirConfirm(prov) { setConfirmProv(prov); setConfirmOpen(true) }
  function cerrarConfirm() { setConfirmOpen(false); setConfirmProv(null); setConfirmLoading(false) }

  async function ejecutarDeshabilitar() {
    if (!confirmProv) return
    setConfirmLoading(true)
    try {
      await deleteProveedor(confirmProv.id_proveedor ?? confirmProv.id)
      cerrarConfirm()
      addToast('Proveedor deshabilitado correctamente.', 'success')
      cargar()
    } catch (err) {
      cerrarConfirm()
      addToast(err.message ?? 'No fue posible deshabilitar el proveedor.', 'error')
    }
  }

  function renderBody() {
    if (loading) {
      return (
        <tr>
          <td colSpan={isAdmin ? 6 : 5} className="table-empty">
            <IconSpinner /><span>Cargando proveedores…</span>
          </td>
        </tr>
      )
    }
    if (!visible.length) {
      return (
        <tr>
          <td colSpan={isAdmin ? 6 : 5} className="table-empty">
            <IconTruck /><span>No hay proveedores para mostrar.</span>
          </td>
        </tr>
      )
    }

    return visible.map(p => {
      const activo = p.estado === 'activo' || p.estado === true
      return (
        <tr key={p.id_proveedor ?? p.id}>
          <td className="td-razon">
            <div className="razon-cell">
              <div className="prov-avatar">{(p.nombre_razon_social ?? p.razon_social ?? 'P').charAt(0).toUpperCase()}</div>
              <span className="razon-text">{p.nombre_razon_social ?? p.razon_social ?? '—'}</span>
            </div>
          </td>
          <td className="td-nit">
            <span className="nit-badge">{p.nit_identificacion ?? p.nit ?? '—'}</span>
          </td>
          <td className="td-contacto">
            <div className="contacto-cell">
              {(p.correo_electronico ?? p.correo) && (
                <span className="contacto-item">{p.correo_electronico ?? p.correo}</span>
              )}
              {p.telefono && (
                <span className="contacto-item contacto-item--muted">{p.telefono}</span>
              )}
              {!p.correo_electronico && !p.correo && !p.telefono && (
                <span className="text-muted">—</span>
              )}
            </div>
          </td>
          <td className="td-dir">
            {p.direccion ? <span className="dir-text" title={p.direccion}>{p.direccion.length > 35 ? p.direccion.slice(0, 35) + '…' : p.direccion}</span> : <span className="text-muted">—</span>}
          </td>
          <td><BadgeEstado estado={p.estado} /></td>
          {isAdmin && (
            <td className="td-actions">
              <div className="actions-group">
                <button className="btn btn--outline btn--sm" onClick={() => abrirEditar(p)} title="Editar proveedor">Editar</button>
                <button className="btn btn--danger btn--sm" onClick={() => pedirConfirm(p)}
                  disabled={!activo} title={!activo ? 'Ya está deshabilitado' : 'Deshabilitar proveedor'}>
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
    <div className="prov-page">
      <div className="prov-page__header">
        <div className="prov-page__heading">
          <h2 className="prov-page__title">Gestión de proveedores</h2>
          <p className="prov-page__subtitle">Administra los proveedores del sistema de inventario</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary btn--lg" onClick={abrirCrear}>
            Nuevo proveedor
          </button>
        )}
      </div>

      {bannerMsg && (
        <div className={`alert-banner alert-banner--${bannerMsg.type}`} role="alert">
          <IconAlert />
          <span>{bannerMsg.text}</span>
          <button className="alert-banner__close" onClick={() => setBannerMsg(null)} aria-label="Cerrar alerta" type="button">
            <IconClose />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-row">
        <div className="search-wrap">
          <IconSearch />
          <input type="text" className="search-input" placeholder="Buscar por razón social, NIT o correo…"
            value={filterSearch} onChange={handleSearchChange} aria-label="Buscar proveedor" />
        </div>
        <div className="filter-bar">
          <span className="filter-bar__label">Estado:</span>
          <select className="filter-select" value={filterEstado}
            onChange={e => { setFilterEstado(e.target.value); setPage(1) }} aria-label="Filtrar por estado">
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card__toolbar">
          {!loading && (
            <span className="table-card__count">
              {pagination.total} {pagination.total === 1 ? 'proveedor' : 'proveedores'}
            </span>
          )}
          {!isAdmin && <span className="footer-role">Modo lectura</span>}
        </div>

        <div className="table-wrapper">
          <table className="prov-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Dirección</th>
                <th>Estado</th>
                {isAdmin && <th className="th-actions">Acciones</th>}
              </tr>
            </thead>
            <tbody>{renderBody()}</tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPage={setPage} />

        <div className="table-card__footer">
          <span className="footer-hint" />
        </div>
      </div>

      <ProviderModal
        key={modalOpen ? (editing?.id_proveedor ?? editing?.id ?? 'new') : 'closed'}
        open={modalOpen} editing={editing} onClose={cerrarModal} onSave={handleSaved}
      />

      <ConfirmModal
        open={confirmOpen}
        proveedorNombre={confirmProv?.nombre_razon_social ?? confirmProv?.razon_social ?? ''}
        onConfirm={ejecutarDeshabilitar} onCancel={cerrarConfirm} loading={confirmLoading}
      />

      <ToastContainer toasts={toasts} />
    </div>
  )
}