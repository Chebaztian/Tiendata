/**
 * Categories.jsx — Tiendata  |  MS-03 Frontend
 * Vista: Gestión de Categorías
 *
 * Ruta:        /categorias
 * Rol admin:   CRUD completo (crear, editar, habilitar, deshabilitar)
 * Rol operador: Solo lectura del listado
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  enableCategoria,
  deleteCategoria,
} from '../../api/categories.js'
import './categories.css'

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
const IconCheck = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
const IconTag = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
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
const IconEnable = () => (
  <svg className="confirm-modal__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
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
   MODAL DE CONFIRMACIÓN (deshabilitar / habilitar)
══════════════════════════════════════════════════ */
function ConfirmModal({ open, variant, categoryName, onConfirm, onCancel, loading }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const isDisable = variant === 'disable'

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="modal confirm-modal">
        {/* Ícono central */}
        <div className={`confirm-modal__icon-wrap confirm-modal__icon-wrap--${isDisable ? 'danger' : 'success'}`}>
          {isDisable ? <IconWarning /> : <IconEnable />}
        </div>

        {/* Contenido */}
        <div className="confirm-modal__body">
          <h3 className="confirm-modal__title" id="confirm-modal-title">
            {isDisable ? 'Deshabilitar categoría' : 'Habilitar categoría'}
          </h3>
          <p className="confirm-modal__text">
            {isDisable
              ? <>Vas a deshabilitar la categoría <strong>{categoryName}</strong>. No se eliminará del sistema, pero dejará de estar disponible para nuevos productos.</>
              : <>Vas a habilitar la categoría <strong>{categoryName}</strong>. Quedará disponible nuevamente para asignar productos.</>
            }
          </p>
          {isDisable && (
            <p className="confirm-modal__warning">
              Si la categoría tiene productos activos, la operación será rechazada.
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="confirm-modal__footer">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${isDisable ? 'btn--danger-solid' : 'btn--success'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? <><IconSpinner /> Procesando…</>
              : isDisable ? <> Deshabilitar</> : <> Habilitar</>
            }
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
  return (
    <span className={`badge-estado badge-estado--${estado}`}>
      <span className="badge-dot" />
      {estado === 'activo' ? 'Activo' : 'Inactivo'}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   MODAL CREAR / EDITAR
══════════════════════════════════════════════════ */
function CategoryModal({ open, editing, onClose, onSave }) {
  const [form, setForm]         = useState({
    nombre_categoria: editing?.nombre_categoria ?? '',
    descripcion:      editing?.descripcion ?? '',
  })
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving]     = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

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
    const nombre = form.nombre_categoria.trim()
    if (!nombre) {
      setErrors({ nombre_categoria: 'El nombre es obligatorio.' })
      inputRef.current?.focus()
      return
    }
    setErrors({})
    setApiError(null)
    setSaving(true)
    try {
      const payload = {
        nombre_categoria: nombre,
        ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
      }
      if (editing) {
        await updateCategoria(editing.id, payload)
        onSave('Categoría actualizada correctamente.')
      } else {
        await createCategoria(payload)
        onSave('Categoría creada correctamente.')
      }
    } catch (err) {
      // Muestra el mensaje del servidor directamente al usuario
      if (err.status === 409) {
        setApiError(err.message)
        setErrors({ nombre_categoria: 'Nombre duplicado.' })
        inputRef.current?.select()
      } else {
        setApiError(err.message ?? 'No fue posible guardar. Intenta nuevamente.')
      }
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal__header">
          <div className="modal__header-left">
            <div className="modal__icon-wrap">
              <IconTag />
            </div>
            <h3 className="modal__title" id="modal-title">
              {editing ? 'Editar categoría' : 'Nueva categoría'}
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

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          <div className={`field ${errors.nombre_categoria ? 'field--error' : ''}`}>
            <label htmlFor="inputNombre" className="field__label">
              Nombre de la categoría <span className="required">*</span>
            </label>
            <input
              ref={inputRef}
              id="inputNombre"
              name="nombre_categoria"
              type="text"
              className="field__input"
              placeholder="Ej: Lácteos"
              maxLength={80}
              autoComplete="off"
              value={form.nombre_categoria}
              onChange={handleChange}
            />
            {errors.nombre_categoria && (
              <span className="field__error-msg">{errors.nombre_categoria}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="inputDesc" className="field__label">
              Descripción <span className="field__optional">(opcional)</span>
            </label>
            <input
              id="inputDesc"
              name="descripcion"
              type="text"
              className="field__input"
              placeholder="Descripción breve de la categoría"
              maxLength={200}
              autoComplete="off"
              value={form.descripcion}
              onChange={handleChange}
            />
          </div>
        </form>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><IconSpinner /> Guardando…</> : (editing ? 'Guardar cambios' : 'Crear categoría')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function Categories() {
  const { user }  = useAuth()
  const isAdmin   = user?.rol === 'Administrador'

  const [categorias,   setCategorias]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const [bannerMsg,    setBannerMsg]    = useState(null)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editing,      setEditing]      = useState(null)

  // Estado para modales de confirmación
  const [confirmOpen,    setConfirmOpen]    = useState(false)
  const [confirmVariant, setConfirmVariant] = useState('disable') 
  const [confirmCat,     setConfirmCat]     = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const { toasts, addToast } = useToast()

  const cargarCategorias = useCallback(async () => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const data = await getCategorias(filtroEstado)
      const lista = Array.isArray(data)
        ? data
        : (data.categorias ?? data.data?.categorias ?? [])
      setCategorias(lista)
    } catch (err) {
      // Muestra el mensaje del servidor, no el código de error
      setBannerMsg({
        text: err.message ?? 'No fue posible cargar las categorías. Intenta nuevamente.',
        type: 'error',
      })
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [filtroEstado])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])

  function abrirCrear()     { setEditing(null); setModalOpen(true) }
  function abrirEditar(cat) { setEditing(cat);  setModalOpen(true) }
  function cerrarModal()    { setModalOpen(false); setEditing(null) }
  function handleSaved(msg) { cerrarModal(); addToast(msg, 'success'); cargarCategorias() }

  /* ── Confirmación deshabilitar ── */
  function pedirConfirmDeshabilitar(cat) {
    setConfirmCat(cat)
    setConfirmVariant('disable')
    setConfirmOpen(true)
  }

  /* ── Confirmación habilitar ── */
  function pedirConfirmHabilitar(cat) {
    setConfirmCat(cat)
    setConfirmVariant('enable')
    setConfirmOpen(true)
  }

  function cerrarConfirm() {
    setConfirmOpen(false)
    setConfirmCat(null)
    setConfirmLoading(false)
  }

  async function ejecutarConfirm() {
    if (!confirmCat) return
    setConfirmLoading(true)
    try {
      if (confirmVariant === 'disable') {
        await deleteCategoria(confirmCat.id)
        cerrarConfirm()
        addToast('Categoría deshabilitada correctamente.', 'success')
      } else {
        await enableCategoria(confirmCat.id)
        cerrarConfirm()
        addToast('Categoría habilitada correctamente.', 'success')
      }
      cargarCategorias()
    } catch (err) {
      cerrarConfirm()
      // Error 409 = categoría en uso → banner visible arriba de la tabla
      if (err.status === 409) {
        setBannerMsg({ text: err.message, type: 'error' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        // Cualquier otro error → toast con el mensaje del servidor
        addToast(err.message ?? 'No fue posible completar la operación.', 'error')
      }
    }
  }

  const FILTROS = [
    { val: 'activo',   label: 'Activos' },
    { val: 'inactivo', label: 'Inactivos' },
    { val: 'todos',    label: 'Todos' },
  ]

  function renderBody() {
    if (loading) {
      return (
        <tr>
          <td colSpan={isAdmin ? 4 : 3} className="table-empty">
            <IconSpinner />
            <span>Cargando categorías…</span>
          </td>
        </tr>
      )
    }
    if (!categorias.length) {
      return (
        <tr>
          <td colSpan={isAdmin ? 4 : 3} className="table-empty">
            <IconTag />
            <span>No hay categorías para mostrar.</span>
          </td>
        </tr>
      )
    }
    return categorias.map(cat => {
      const activo = cat.estado === 'activo' || cat.estado === true
      return (
        <tr key={cat.id}>
          <td className="td-nombre">{cat.nombre_categoria}</td>
          <td className="td-desc">
            {cat.descripcion ? cat.descripcion : <span className="text-muted">—</span>}
          </td>
          <td><BadgeEstado estado={activo ? 'activo' : 'inactivo'} /></td>
          {isAdmin && (
            <td className="td-actions">
              <div className="actions-group">
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => abrirEditar(cat)}
                  title="Editar categoría"
                >
                   Editar
                </button>
                {activo ? (
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => pedirConfirmDeshabilitar(cat)}
                    title="Deshabilitar categoría"
                  >
                     Deshabilitar
                  </button>
                ) : (
                  <button
                    className="btn btn--success btn--sm"
                    onClick={() => pedirConfirmHabilitar(cat)}
                    title="Habilitar categoría"
                  >
                     Habilitar
                  </button>
                )}
              </div>
            </td>
          )}
        </tr>
      )
    })
  }

  return (
    <div className="cat-page">

      <div className="cat-page__header">
        <div className="cat-page__heading">
          <h2 className="cat-page__title">Gestión de categorías</h2>
          <p className="cat-page__subtitle">Organiza el catálogo de productos por categoría</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary btn--lg" onClick={abrirCrear}>
          
            Nueva categoría
          </button>
        )}
      </div>

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

      <div className="table-card">
        <div className="table-card__toolbar">
          <div className="filter-bar">
            <span className="filter-bar__label">Estado:</span>
            <select
              className="filter-select"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              aria-label="Filtrar por estado"
            >
              {FILTROS.map(f => (
                <option key={f.val} value={f.val}>{f.label}</option>
              ))}
            </select>
          </div>
          {!loading && (
            <span className="table-card__count">
              {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
            </span>
          )}
        </div>

        <table className="cat-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Estado</th>
              {isAdmin && <th className="th-actions">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {renderBody()}
          </tbody>
        </table>

        <div className="table-card__footer">
          
          {!isAdmin && <span className="footer-role">Modo lectura</span>}
        </div>
      </div>

      {/* Modal crear / editar */}
      <CategoryModal
        key={modalOpen ? (editing?.id ?? 'new') : 'closed'}
        open={modalOpen}
        editing={editing}
        onClose={cerrarModal}
        onSave={handleSaved}
      />

      {/* Modal confirmación deshabilitar / habilitar */}
      <ConfirmModal
        open={confirmOpen}
        variant={confirmVariant}
        categoryName={confirmCat?.nombre_categoria ?? ''}
        onConfirm={ejecutarConfirm}
        onCancel={cerrarConfirm}
        loading={confirmLoading}
      />

      <ToastContainer toasts={toasts} />
    </div>
  )
}