// src/pages/Users/UsersPage.jsx
// Gestión de Usuarios — MS-02
//
//   - Tabla paginada con filtro por estado y búsqueda local
//   - Modal crear usuario: nombre, correo, nombre de usuario (opcional),
//     contraseña, confirmar contraseña, rol, estado
//   - Modal editar: nombre, nombre de usuario, contraseña (opcional), rol, estado
//     (el correo NO es editable tras la creación)
//   - Modal confirmación para deshabilitar
//   - Validaciones completas según requerimientos
//   - Mensajes de error específicos por código del backend
//   - Toast de feedback
//   - Operador NO tiene acceso a esta página (guard en App.jsx)

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUsers, createUser, updateUser, disableUser, unlockUser } from '../../api/users'
import { useAuth } from '../../hooks/useAuth'
import './users.css'

/* ── Iconos SVG inline ───────────────────────────────────────────── */
function IcoPlus()  { return <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IcoEdit()  { return <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IcoBan()   { return <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> }
function IcoClose() { return <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IcoSearch(){ return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IcoCheck() { return <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IcoWarn()  { return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IcoChevL() { return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function IcoChevR() { return <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> }
function IcoSpinner() { return <svg className="u-spinner" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round"/></svg> }

/* ── Helpers ─────────────────────────────────────────────────────── */
function getInitials(nombre = '') {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}
function getRolLabel(idRol) {
  return idRol === 1 ? 'Administrador' : 'Operador'
}
function mapApiError(err) {
  const map = {
    USER_EMAIL_ALREADY_EXISTS:    'Este correo ya está en uso.',
    USER_USERNAME_ALREADY_EXISTS: 'Este nombre de usuario ya está en uso.',
    ADMIN_SELF_DISABLE_FORBIDDEN: 'Un administrador no puede deshabilitarse a sí mismo.',
    USER_NOT_FOUND:               'Usuario no encontrado.',
  }
  if (err.code === 'VALIDATION_ERROR') return err.message || 'Verifica los datos ingresados.'
  return map[err.code] || err.message || 'Error inesperado. Intenta de nuevo.'
}

/* ── Estado vacío del formulario ─────────────────────────────────── */
const EMPTY_FORM = {
  nombre:     '',
  correo:     '',
  nombre_usuario: '',
  contrasena: '',
  confirmar:  '',
  id_rol:     2,
  estado:     'activo',
}

/* ── Validaciones ────────────────────────────────────────────────── */
// Mismo criterio que el backend: 3-30 caracteres, letras, números, . _ -
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

function normalizeUsername(value = '') {
  return value.trim().toLowerCase()
}

function validate(form, isEditing) {
  const errors = {}
  if (!form.nombre.trim())
    errors.nombre = 'El nombre completo es obligatorio.'
  const username = normalizeUsername(form.nombre_usuario)
  if (username && !USERNAME_PATTERN.test(username))
    errors.nombre_usuario = 'Entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo (sin @ ni espacios).'
  if (!isEditing) {
    if (!form.correo.trim())
      errors.correo = 'El correo es obligatorio.'
    if (!form.contrasena)
      errors.contrasena = 'La contraseña es obligatoria.'
    else if (form.contrasena.length < 8)
      errors.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(form.contrasena))
      errors.contrasena = 'Debe incluir letras y números.'
    if (!form.confirmar)
      errors.confirmar = 'Debes confirmar la contraseña.'
    else if (form.contrasena && form.contrasena !== form.confirmar)
      errors.confirmar = 'Las contraseñas no coinciden.'
  } else {
    if (form.contrasena) {
      if (form.contrasena.length < 8)
        errors.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
      else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(form.contrasena))
        errors.contrasena = 'Debe incluir letras y números.'
      if (form.contrasena !== form.confirmar)
        errors.confirmar = 'Las contraseñas no coinciden.'
    }
  }
  return errors
}

/** Texto del tooltip de bloqueo: hasta cuándo o si es indefinido. */
function blockedUntilLabel(bloqueoHasta) {
  if (!bloqueoHasta) return 'Bloqueo indefinido'
  const hora = new Date(bloqueoHasta).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `Bloqueado hasta las ${hora}`
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const { user: authUser } = useAuth()

  /* ── Estado tabla ── */
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tableError,   setTableError]   = useState(null)
  const [search,       setSearch]       = useState('')
  const [filterEstado, setFilterEstado] = useState('activo')
  const [page,         setPage]         = useState(1)
  const [pagination,   setPagination]   = useState({ total: 0, totalPages: 1, size: 10 })

  /* ── Modal crear / editar ── */
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingUser,  setEditingUser]  = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [fieldErrors,  setFieldErrors]  = useState({})
  const [formLoading,  setFormLoading]  = useState(false)
  const [formApiError, setFormApiError] = useState('')

  /* ── Modal confirmar deshabilitar ── */
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [targetUser,   setTargetUser]   = useState(null)
  const [disabling,    setDisabling]    = useState(false)
  const [disableError, setDisableError] = useState('')

  /* ── Toasts ── */
  /* Desbloqueo de cuentas */
  const [unlockingId,  setUnlockingId]  = useState(null)

  const [toasts,  setToasts]  = useState([])
  const toastRef = useRef(0)

  function showToast(message, type = 'success') {
    const id = ++toastRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }

  /* ── Cargar usuarios ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setTableError(null)
    try {
      const data = await getUsers({ page, size: 10, estado: filterEstado })
      setUsers(data.items || [])
      setPagination({
        total:      data.total      ?? 0,
        totalPages: data.totalPages ?? 1,
        size:       data.size       ?? 10,
      })
    } catch (err) {
      setTableError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }, [page, filterEstado])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { setPage(1)  }, [filterEstado])

  const visible = users.filter(u =>
    u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    u.correo?.toLowerCase().includes(search.toLowerCase()) ||
    u.nombre_usuario?.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Abrir modal crear ── */
  function openCreate() {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormApiError('')
    setModalOpen(true)
  }

  /* ── Abrir modal editar ── */
  function openEdit(u) {
    setEditingUser(u)
    setForm({
      nombre:     u.nombre ?? '',
      correo:     u.correo ?? '',
      nombre_usuario: u.nombre_usuario ?? '',
      contrasena: '',
      confirmar:  '',
      id_rol:     u.id_rol ?? 2,
      estado:     u.estado === false ? 'inactivo' : 'activo',
    })
    setFieldErrors({})
    setFormApiError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingUser(null)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'id_rol' ? Number(value) : value }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
    setFormApiError('')
  }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault()
    const isEditing = !!editingUser
    const errors = validate(form, isEditing)
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setFormLoading(true)
    setFormApiError('')
    try {
      if (isEditing) {
        const changes = {}
        if (form.nombre.trim() !== editingUser.nombre)      changes.nombre = form.nombre.trim()
        const username = normalizeUsername(form.nombre_usuario)
        if (username !== (editingUser.nombre_usuario ?? '')) changes.nombre_usuario = username
        if (Number(form.id_rol) !== Number(editingUser.id_rol)) changes.id_rol = form.id_rol
        if ((form.estado === 'activo') !== editingUser.estado)  changes.estado = form.estado
        if (form.contrasena) changes.contrasena = form.contrasena
        if (Object.keys(changes).length === 0) { showToast('Sin cambios para guardar.', 'info'); closeModal(); return }
        await updateUser(editingUser.id_usuario, changes)
        showToast('Usuario actualizado correctamente.')
      } else {
        await createUser({
          nombre:     form.nombre.trim(),
          correo:     form.correo.trim(),
          ...(normalizeUsername(form.nombre_usuario)
            ? { nombre_usuario: normalizeUsername(form.nombre_usuario) }
            : {}),
          contrasena: form.contrasena,
          id_rol:     form.id_rol,
          estado:     form.estado,
        })
        showToast('Usuario creado correctamente.')
      }
      closeModal()
      fetchUsers()
    } catch (err) {
      setFormApiError(mapApiError(err))
    } finally {
      setFormLoading(false)
    }
  }

  /* ── Deshabilitar ── */
  function openConfirm(u) {
    setTargetUser(u)
    setDisableError('')
    setConfirmOpen(true)
  }

  async function handleDisable() {
    if (!targetUser) return
    setDisabling(true)
    setDisableError('')
    try {
      await disableUser(targetUser.id_usuario, authUser)
      showToast(`"${targetUser.nombre}" fue deshabilitado.`)
      setConfirmOpen(false)
      setTargetUser(null)
      fetchUsers()
    } catch (err) {
      setDisableError(mapApiError(err))
    } finally {
      setDisabling(false)
    }
  }

  async function handleUnlock(u) {
    setUnlockingId(u.id_usuario)
    try {
      await unlockUser(u.id_usuario)
      showToast(`"${u.nombre}" fue desbloqueado.`)
      fetchUsers()
    } catch (err) {
      showToast(mapApiError(err), 'error')
    } finally {
      setUnlockingId(null)
    }
  }

  function pageNumbers() {
    const t = pagination.totalPages
    if (t <= 6) return Array.from({ length: t }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '…', t]
    if (page >= t - 2) return [1, '…', t - 3, t - 2, t - 1, t]
    return [1, '…', page - 1, page, page + 1, '…', t]
  }

  const isEditing = !!editingUser

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Encabezado ── */}
      <div className="u-page-header">
        <div className="u-page-heading">
          <h2 className="u-page-title">Gestión de usuarios</h2>
          <p className="u-page-subtitle">Administra las cuentas de acceso al sistema</p>
        </div>
        <button className="u-btn u-btn--primary u-btn--lg" onClick={openCreate}>
           Nuevo usuario
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="u-toolbar">
        <div className="u-search-box">
          <span className="u-search-icon"><IcoSearch /></span>
          <input
            className="u-search-input"
            type="text"
            placeholder="Buscar por nombre o usuario…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="u-filter-bar">
          <span className="u-filter-label">Estado:</span>
          <select
            className="u-filter-select"
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {/* ── Card tabla ── */}
      <div className="u-table-card">

        {loading ? (
          <div className="u-table-state">
            <IcoSpinner />
            <p>Cargando usuarios…</p>
          </div>
        ) : tableError ? (
          <div className="u-table-state">
            <p>{tableError}</p>
            <button className="u-btn u-btn--ghost" style={{ marginTop: 12 }} onClick={fetchUsers}>
              Reintentar
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="u-table-state">
            <p>{search ? 'Sin resultados para la búsqueda.' : 'No hay usuarios en este estado.'}</p>
          </div>
        ) : (
          <table className="u-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th className="u-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(u => {
                const isSelf = u.id_usuario === authUser?.id_usuario
                const activo = u.estado !== false
                return (
                  <tr key={u.id_usuario}>
                    <td>
                      <div className="u-user-cell">
                        <div className="u-avatar">{getInitials(u.nombre)}</div>
                        <div className="u-user-names">
                          <span className="u-user-name">{u.nombre}</span>
                          {u.nombre_usuario && (
                            <span className="u-user-handle">@{u.nombre_usuario}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="u-td-muted">{u.correo}</td>
                    <td>
                      <span className={`u-badge u-badge--${u.id_rol === 1 ? 'admin' : 'operator'}`}>
                        {getRolLabel(u.id_rol)}
                      </span>
                    </td>
                    <td>
                      <div className="u-status-stack">
                      <span className={`u-badge u-badge--${activo ? 'active' : 'inactive'}`}>
                        <span className="u-badge-dot" />
                        {activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {u.bloqueo_vigente && (
                        <span
                          className="u-badge u-badge--blocked"
                          title={blockedUntilLabel(u.bloqueo_hasta)}
                        >
                          <span className="u-badge-dot" />
                          Bloqueado
                        </span>
                      )}
                      </div>
                    </td>
                    <td className="u-td-muted">
                      {u.fecha_creacion
                        ? new Date(u.fecha_creacion).toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="u-td-actions">
                      <div className="u-actions-group">
                        <button
                          className="u-btn u-btn--outline u-btn--sm"
                          title="Editar usuario"
                          onClick={() => openEdit(u)}
                        >
                           Editar
                        </button>
                        {u.bloqueo_vigente && (
                          <button
                            className="u-btn u-btn--warning u-btn--sm"
                            title={`Quitar el bloqueo por intentos fallidos. ${blockedUntilLabel(u.bloqueo_hasta)}`}
                            onClick={() => handleUnlock(u)}
                            disabled={unlockingId === u.id_usuario}
                          >
                            {unlockingId === u.id_usuario ? 'Desbloqueando…' : 'Desbloquear'}
                          </button>
                        )}
                        <button
                          className="u-btn u-btn--danger u-btn--sm"
                          title={isSelf ? 'No puedes deshabilitarte a ti mismo' : 'Deshabilitar'}
                          onClick={() => openConfirm(u)}
                          disabled={isSelf || !activo}
                        >
                           Deshabilitar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {!loading && !tableError && pagination.totalPages > 1 && (
          <div className="u-pagination">
            <span className="u-pagination-info">
              {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} · página {page} de {pagination.totalPages}
            </span>
            <div className="u-pagination-controls">
              <button className="u-btn-page" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <IcoChevL />
              </button>
              {pageNumbers().map((n, i) =>
                n === '…'
                  ? <span key={`sep${i}`} className="u-page-sep">…</span>
                  : <button key={n} className={`u-btn-page${page === n ? ' u-btn-page--active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              )}
              <button className="u-btn-page" onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}>
                <IcoChevR />
              </button>
            </div>
          </div>
        )}

        {/* Pie */}
        <div className="u-table-footer">
          
        </div>
      </div>

      {/* ══ MODAL CREAR / EDITAR ══ */}
      {modalOpen && (
        <div
          className="u-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="u-modal-title"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="u-modal">
            <div className="u-modal__header">
              <h2 className="u-modal__title" id="u-modal-title">
                {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button className="u-modal__close" onClick={closeModal} aria-label="Cerrar modal">
                <IcoClose />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="u-modal__body">
                <div className="u-form-grid">

                  <div className="u-form-field">
                    <label htmlFor="f-nombre">Nombre completo</label>
                    <input id="f-nombre" name="nombre" type="text" placeholder="Ej: Juan Pérez"
                      value={form.nombre} onChange={handleChange}
                      className={fieldErrors.nombre ? 'is-error' : ''}
                      disabled={formLoading} autoFocus />
                    {fieldErrors.nombre && <span className="u-field-error">{fieldErrors.nombre}</span>}
                  </div>

                  <div className="u-form-field">
                    <label htmlFor="f-correo">
                      Correo
                      {isEditing && <span className="u-field-hint" style={{ marginLeft: 4 }}>(no editable)</span>}
                    </label>
                    <input id="f-correo" name="correo" type="text" placeholder="Ej: jperez@tiendata.com"
                      value={form.correo} onChange={handleChange}
                      className={fieldErrors.correo ? 'is-error' : ''}
                      disabled={formLoading || isEditing} />
                    {fieldErrors.correo
                      ? <span className="u-field-error">{fieldErrors.correo}</span>
                      : !isEditing && <span className="u-field-hint">Debe ser único. No se puede cambiar después.</span>
                    }
                  </div>

                  <div className="u-form-field">
                    <label htmlFor="f-nombre-usuario">
                      Nombre de usuario
                      <span className="u-field-hint" style={{ marginLeft: 4 }}>(opcional)</span>
                    </label>
                    <input id="f-nombre-usuario" name="nombre_usuario" type="text" placeholder="Ej: jperez"
                      value={form.nombre_usuario} onChange={handleChange}
                      autoCapitalize="none" spellCheck={false}
                      className={fieldErrors.nombre_usuario ? 'is-error' : ''}
                      disabled={formLoading} />
                    {fieldErrors.nombre_usuario
                      ? <span className="u-field-error">{fieldErrors.nombre_usuario}</span>
                      : <span className="u-field-hint">Permite iniciar sesión con este nombre en lugar del correo.</span>
                    }
                  </div>

                  <div className="u-form-field">
                    <label htmlFor="f-contrasena">
                      Contraseña
                      {isEditing && <span className="u-field-hint" style={{ marginLeft: 4 }}>(dejar vacío para no cambiar)</span>}
                    </label>
                    <input id="f-contrasena" name="contrasena" type="password"
                      placeholder={isEditing ? '••••••••' : 'Mín. 8 caracteres con letras y números'}
                      value={form.contrasena} onChange={handleChange}
                      className={fieldErrors.contrasena ? 'is-error' : ''}
                      disabled={formLoading} autoComplete="new-password" />
                    {fieldErrors.contrasena
                      ? <span className="u-field-error">{fieldErrors.contrasena}</span>
                      : <span className="u-field-hint">Mínimo 8 caracteres con letras y números.</span>
                    }
                  </div>

                  <div className="u-form-field">
                    <label htmlFor="f-confirmar">Confirmar contraseña</label>
                    <input id="f-confirmar" name="confirmar" type="password" placeholder="Repite la contraseña"
                      value={form.confirmar} onChange={handleChange}
                      className={fieldErrors.confirmar ? 'is-error' : ''}
                      disabled={formLoading} autoComplete="new-password" />
                    {fieldErrors.confirmar && <span className="u-field-error">{fieldErrors.confirmar}</span>}
                  </div>

                  <div className="u-form-field">
                    <label htmlFor="f-rol">Rol</label>
                    <select id="f-rol" name="id_rol" value={form.id_rol} onChange={handleChange} disabled={formLoading}>
                      <option value={1}>Administrador</option>
                      <option value={2}>Operador</option>
                    </select>
                  </div>

                  {isEditing && (
                    <div className="u-form-field">
                      <label htmlFor="f-estado">Estado</label>
                      <select id="f-estado" name="estado" value={form.estado} onChange={handleChange} disabled={formLoading}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  )}

                  {formApiError && (
                    <div className="u-form-error-banner">
                      <IcoWarn />
                      {formApiError}
                    </div>
                  )}
                </div>
              </div>

              <div className="u-modal__footer">
                <button type="button" className="u-btn u-btn--ghost" onClick={closeModal} disabled={formLoading}>
                  Cancelar
                </button>
                <button type="submit" className="u-btn u-btn--primary" disabled={formLoading}>
                  {formLoading
                    ? <><IcoSpinner /> Guardando…</>
                    : <><IcoCheck /> {isEditing ? 'Guardar cambios' : 'Crear usuario'}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL CONFIRMAR DESHABILITAR ══ */}
      {confirmOpen && targetUser && (
        <div
          className="u-modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false) }}
        >
          <div className="u-modal u-confirm-modal">
            <div className="u-confirm-icon-wrap">
              <IcoWarn />
            </div>
            <div className="u-confirm-body">
              <h3 className="u-confirm-title">Deshabilitar usuario</h3>
              <p className="u-confirm-text">
                Vas a deshabilitar a <strong>{targetUser.nombre}</strong>. El usuario perderá
                acceso al sistema inmediatamente. Esta acción puede revertirse editando su estado.
              </p>
              {disableError && (
                <div className="u-form-error-banner">
                  <IcoWarn /> {disableError}
                </div>
              )}
            </div>
            <div className="u-confirm-footer">
              <button className="u-btn u-btn--ghost" onClick={() => setConfirmOpen(false)} disabled={disabling}>
                Cancelar
              </button>
              <button className="u-btn u-btn--danger-solid" onClick={handleDisable} disabled={disabling}>
                {disabling ? <><IcoSpinner /> Deshabilitando…</> : <> Deshabilitar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOASTS ══ */}
      <div className="u-toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`u-toast u-toast--${t.type}`}>
            <span className={`u-toast-dot u-toast-dot--${t.type}`} />
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}