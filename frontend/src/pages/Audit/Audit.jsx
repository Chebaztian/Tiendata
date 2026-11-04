/**
 * Audit.jsx — Tiendata | MS-09 Frontend
 * Vista: Auditoría y Trazabilidad
 *
 * Ruta:  /auditoria
 * Acceso: Solo Administrador (controlado por AdminRoute en App.jsx)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAuditLogs } from '../../api/audit.js'
import './audit.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG
══════════════════════════════════════════════════ */
const IconAlert = () => (
  <svg className="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconClose = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconFilter = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IconRefresh = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconEye = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconHistory = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4H1" />
    <polyline points="1 3 1 7 5 7" />
  </svg>
)
const IconSpinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
  </svg>
)
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
const MODULOS = [
  { val: '',           label: 'Todos' },
  { val: 'auth',       label: 'Autenticación' },
  { val: 'usuarios',   label: 'Usuarios' },
  { val: 'productos',  label: 'Productos' },
  { val: 'categorias', label: 'Categorías' },
  { val: 'inventario', label: 'Inventario' },
]

const ACCIONES = [
  { val: '',                       label: 'Todas' },
  { val: 'login_exitoso',          label: 'Login exitoso' },
  { val: 'login_fallido',          label: 'Login fallido' },
  { val: 'crear_usuario',          label: 'Crear usuario' },
  { val: 'actualizar_usuario',     label: 'Actualizar usuario' },
  { val: 'eliminar_usuario',       label: 'Eliminar usuario' },
  { val: 'crear_categoria',        label: 'Crear categoría' },
  { val: 'actualizar_categoria',   label: 'Actualizar categoría' },
  { val: 'eliminar_categoria',     label: 'Eliminar categoría' },
  { val: 'crear_producto',         label: 'Crear producto' },
  { val: 'actualizar_producto',    label: 'Actualizar producto' },
  { val: 'eliminar_producto',      label: 'Eliminar producto' },
  { val: 'registrar_movimiento',   label: 'Registrar movimiento' },
  { val: 'registrar_ajuste',       label: 'Registrar ajuste' },
]

function getActionVariant(accion) {
  const a = String(accion || '').toLowerCase()
  if (a.includes('exitoso')) return 'success'
  if (a.includes('fallido')) return 'danger'
  if (a.startsWith('crear')) return 'info'
  if (a.startsWith('actualizar')) return 'warning'
  if (a.startsWith('eliminar')) return 'danger'
  if (a.includes('ajuste')) return 'warning'
  if (a.includes('movimiento')) return 'info'
  return 'default'
}

function getModuleVariant(modulo) {
  const m = String(modulo || '').toLowerCase()
  if (m === 'auth') return 'auth'
  if (m === 'usuarios') return 'users'
  if (m === 'inventario') return 'inventory'
  if (m === 'productos') return 'products'
  if (m === 'categorias') return 'categories'
  return 'default'
}

function formatAccion(accion) {
  if (!accion) return '—'
  return String(accion).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatModulo(modulo) {
  if (!modulo) return '—'
  return String(modulo).charAt(0).toUpperCase() + String(modulo).slice(1)
}

function formatFecha(iso) {
  if (!iso) return { fecha: '—', hora: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { fecha: iso, hora: '' }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return { fecha: `${dd}/${mm}/${yyyy}`, hora: `${hh}:${mi}:${ss}` }
}

function formatValue(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

/* ══════════════════════════════════════════════════
   BADGES
══════════════════════════════════════════════════ */
function BadgeAccion({ accion }) {
  const variant = getActionVariant(accion)
  return (
    <span className={`badge-accion badge-accion--${variant}`}>
      <span className="badge-dot" />
      {formatAccion(accion)}
    </span>
  )
}

function BadgeModulo({ modulo }) {
  const variant = getModuleVariant(modulo)
  return (
    <span className={`badge-modulo badge-modulo--${variant}`}>
      {formatModulo(modulo)}
    </span>
  )
}

/* ══════════════════════════════════════════════════
   MODAL DETALLE
══════════════════════════════════════════════════ */
function DetailModal({ log, onClose }) {
  useEffect(() => {
    if (!log) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [log, onClose])

  if (!log) return null

  const { fecha, hora } = formatFecha(log.fecha)
  const detalleEntries = Object.entries(log.detalle || {})
  const previos = log.datos_previos || {}
  const nuevos = log.datos_nuevos || {}
  const camposCambiados = [...new Set([...Object.keys(previos), ...Object.keys(nuevos)])]
  const variant = getActionVariant(log.accion)

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal audit-modal">
        <div className="modal__header">
          <div className="modal__header-left">
            <div className={`modal__icon-wrap modal__icon-wrap--${variant}`}>
              <IconShield />
            </div>
            <div>
              <h3 className="modal__title" id="audit-detail-title">
                {formatAccion(log.accion)}
              </h3>
              <p className="modal__subtitle">
                {fecha} · {hora}
              </p>
            </div>
          </div>
          <button className="btn-icon-only" onClick={onClose} aria-label="Cerrar" type="button">
            <IconClose />
          </button>
        </div>

        <div className="modal__body audit-modal__body">
          {/* Información general */}
          <section className="audit-section">
            <h4 className="audit-section__title">Información general</h4>
            <dl className="audit-info-grid">
              <div className="audit-info-row">
                <dt>Usuario</dt>
                <dd>
                  {log.usuario?.nombre ? (
                    <>
                      {log.usuario.nombre}
                      {log.usuario.rol && <span className="audit-meta"> · {log.usuario.rol}</span>}
                      {log.usuario.id_usuario && <span className="audit-meta"> · ID {log.usuario.id_usuario}</span>}
                    </>
                  ) : (
                    <span className="text-muted">Sistema</span>
                  )}
                </dd>
              </div>
              <div className="audit-info-row">
                <dt>Módulo</dt>
                <dd><BadgeModulo modulo={log.modulo} /></dd>
              </div>
              <div className="audit-info-row">
                <dt>Entidad</dt>
                <dd>
                  {log.entidad ?? '—'}
                  {log.id_entidad ? <span className="audit-meta"> · ID {log.id_entidad}</span> : null}
                </dd>
              </div>
              {log.id_sesion && (
                <div className="audit-info-row">
                  <dt>Sesión</dt>
                  <dd className="audit-mono">{log.id_sesion}</dd>
                </div>
              )}
              <div className="audit-info-row">
                <dt>ID Log</dt>
                <dd className="audit-mono">#{log.id_log}</dd>
              </div>
            </dl>
          </section>

          {/* Detalle del evento */}
          {detalleEntries.length > 0 && (
            <section className="audit-section">
              <h4 className="audit-section__title">Detalle del evento</h4>
              <dl className="audit-info-grid">
                {detalleEntries.map(([key, value]) => (
                  <div className="audit-info-row" key={key}>
                    <dt>{key.replace(/_/g, ' ')}</dt>
                    <dd>{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Cambios registrados */}
          {camposCambiados.length > 0 && (
            <section className="audit-section">
              <h4 className="audit-section__title">Cambios registrados</h4>
              <table className="audit-changes-table">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Después</th>
                  </tr>
                </thead>
                <tbody>
                  {camposCambiados.map(campo => (
                    <tr key={campo}>
                      <td className="audit-changes-table__field">{campo}</td>
                      <td className="audit-changes-table__before">
                        {previos[campo] === undefined ? <span className="text-muted">—</span> : formatValue(previos[campo])}
                      </td>
                      <td className="audit-changes-table__after">
                        {nuevos[campo] === undefined ? <span className="text-muted">—</span> : formatValue(nuevos[campo])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function Audit() {
  const { user } = useAuth()

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [bannerMsg, setBannerMsg] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)

  // Filtros (estado del formulario)
  const [fUsuario, setFUsuario] = useState('')
  const [fModulo, setFModulo]   = useState('')
  const [fAccion, setFAccion]   = useState('')
  const [fFecha,  setFFecha]    = useState('')

  // Filtros aplicados (los que están realmente vigentes en la consulta)
  const filtrosActivosRef = useRef({})

  const PAGE_SIZE = 20

  const cargar = useCallback(async (pg = 1, filtros = {}) => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const params = { page: pg, size: PAGE_SIZE, ...filtros }
      const resp = await getAuditLogs(params)
      const data = resp.data ?? resp
      setLogs(data.logs ?? data.items ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
      setPage(pg)
    } catch (err) {
      setBannerMsg(err.message ?? 'No fue posible cargar los logs de auditoría.')
      setLogs([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar(1, {})
  }, [cargar])

  function handleFiltrar(e) {
    e.preventDefault()
    const filtros = {}
    if (fUsuario.trim()) filtros.usuario = fUsuario.trim()
    if (fModulo)         filtros.modulo  = fModulo
    if (fAccion)         filtros.accion  = fAccion
    if (fFecha)          filtros.fecha   = fFecha
    filtrosActivosRef.current = filtros
    cargar(1, filtros)
  }

  function handleLimpiar() {
    setFUsuario('')
    setFModulo('')
    setFAccion('')
    setFFecha('')
    filtrosActivosRef.current = {}
    cargar(1, {})
  }

  function cambiarPagina(nuevaPagina) {
    cargar(nuevaPagina, filtrosActivosRef.current)
  }

  return (
    <div className="audit-page">

      {/* Cabecera */}
      <div className="audit-page__header">
        <div className="audit-page__heading">
          <h2 className="audit-page__title">Auditoría y trazabilidad</h2>
          <p className="audit-page__subtitle">
            Registro inmutable de eventos críticos del sistema · Solo lectura
          </p>
        </div>
        <div className="audit-role-chip">
          <IconShield />
          {user?.rol}
        </div>
      </div>

      {/* Card principal */}
      <div className="audit-card">

        {/* Toolbar de filtros */}
        <form className="audit-toolbar" onSubmit={handleFiltrar}>
          <div className="audit-toolbar__filters">
            <div className="filter-field">
              <label className="filter-label">Usuario</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Nombre o ID"
                value={fUsuario}
                onChange={e => setFUsuario(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label className="filter-label">Módulo</label>
              <select
                className="filter-select"
                value={fModulo}
                onChange={e => setFModulo(e.target.value)}
              >
                {MODULOS.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label className="filter-label">Acción</label>
              <select
                className="filter-select"
                value={fAccion}
                onChange={e => setFAccion(e.target.value)}
              >
                {ACCIONES.map(a => (
                  <option key={a.val} value={a.val}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label className="filter-label">Fecha</label>
              <input
                type="date"
                className="filter-input"
                value={fFecha}
                onChange={e => setFFecha(e.target.value)}
              />
            </div>
          </div>
          <div className="audit-toolbar__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleLimpiar}
              disabled={loading}
              title="Limpiar filtros"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={loading}
            >
              <IconFilter />
              Filtrar
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => cargar(page, filtrosActivosRef.current)}
              disabled={loading}
              title="Refrescar"
            >
              <IconRefresh />
            </button>
          </div>
        </form>

        {/* Banner de error */}
        {bannerMsg && (
          <div className="alert-banner alert-banner--error" role="alert">
            <IconAlert />
            <span>{bannerMsg}</span>
            <button
              className="alert-banner__close"
              onClick={() => setBannerMsg(null)}
              type="button"
              aria-label="Cerrar alerta"
            >
              <IconClose />
            </button>
          </div>
        )}

        {/* Tabla de logs */}
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th className="th-actions">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    <IconSpinner />
                    <span>Cargando registros de auditoría…</span>
                  </td>
                </tr>
              ) : !logs.length ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    <IconHistory />
                    <span>No hay registros que coincidan con los filtros aplicados.</span>
                  </td>
                </tr>
              ) : logs.map(log => {
                const { fecha, hora } = formatFecha(log.fecha)
                return (
                  <tr key={log.id_log}>
                    <td className="td-fecha">
                      <span className="td-fecha__date">{fecha}</span>
                      <span className="td-fecha__time">{hora}</span>
                    </td>
                    <td>
                      {log.usuario?.nombre ? (
                        <>
                          <span className="td-user__name">{log.usuario.nombre}</span>
                          {log.usuario.rol && (
                            <span className="td-user__rol">{log.usuario.rol}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Sistema</span>
                      )}
                    </td>
                    <td><BadgeModulo modulo={log.modulo} /></td>
                    <td><BadgeAccion accion={log.accion} /></td>
                    <td>
                      <span className="td-entidad">{log.entidad ?? '—'}</span>
                      {log.id_entidad && (
                        <span className="td-entidad__id">ID {log.id_entidad}</span>
                      )}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => setSelectedLog(log)}
                        title="Ver detalle del evento"
                      >
                        <IconEye />
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pagination">
          <span className="pagination__info">
            {total > 0
              ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} ${total === 1 ? 'registro' : 'registros'}`
              : 'Sin resultados'}
          </span>
          <div className="pagination__controls">
            <button
              className="page-btn"
              onClick={() => cambiarPagina(page - 1)}
              disabled={page <= 1 || loading}
              aria-label="Página anterior"
            >
              <IconChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg
              if (totalPages <= 5) pg = i + 1
              else if (page <= 3) pg = i + 1
              else if (page >= totalPages - 2) pg = totalPages - 4 + i
              else pg = page - 2 + i
              return (
                <button
                  key={pg}
                  className={`page-btn ${pg === page ? 'active' : ''}`}
                  onClick={() => cambiarPagina(pg)}
                  disabled={loading}
                >
                  {pg}
                </button>
              )
            })}
            <button
              className="page-btn"
              onClick={() => cambiarPagina(page + 1)}
              disabled={page >= totalPages || loading}
              aria-label="Página siguiente"
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}