/**
 * AlertsPage.jsx — Tiendata  |  MS-06 Frontend
 * Vista: Alertas de Stock
 *
 * Ruta:       /alertas
 * Roles:      Administrador y Operador
 * Tipos:
 *   - low-stock      → stock ≤ stock mínimo
 *   - high-stock     → stock ≥ stock máximo
 *   - expiring-soon  → vencimiento ≤ 7 días
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAlerts, getCategoriasActivas } from '../../api/alerts.js'
import './alerts.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG
══════════════════════════════════════════════════ */
const IconArrowDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)
const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 13, height: 13 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconFilter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
const IconPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
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
   HELPERS
══════════════════════════════════════════════════ */
const ALERT_TYPE_META = {
  'low-stock': {
    label: 'Stock bajo',
    shortLabel: 'Stock bajo',
    badgeClass: 'badge-alert--low',
    rowClass: 'row--low',
    kpiClass: 'al-kpi-card--low',
    iconClass: 'al-kpi-icon--low',
    chipActive: 'active--low',
    barClass: 'stock-bar-fill--low',
    numClass: 'stock-bar-num--low',
    Icon: IconArrowDown,
  },
  'high-stock': {
    label: 'Stock alto',
    shortLabel: 'Stock alto',
    badgeClass: 'badge-alert--high',
    rowClass: 'row--high',
    kpiClass: 'al-kpi-card--high',
    iconClass: 'al-kpi-icon--high',
    chipActive: 'active--high',
    barClass: 'stock-bar-fill--high',
    numClass: 'stock-bar-num--high',
    Icon: IconArrowUp,
  },
  'expiring-soon': {
    label: 'Próximo a vencer',
    shortLabel: 'Por vencer',
    badgeClass: 'badge-alert--expiring',
    rowClass: 'row--expiring',
    kpiClass: 'al-kpi-card--expiring',
    iconClass: 'al-kpi-icon--expiring',
    chipActive: 'active--expiring',
    barClass: 'stock-bar-fill--expiring',
    numClass: 'stock-bar-num--expiring',
    Icon: IconClock,
  },
}

const ALL_TYPES = ['low-stock', 'high-stock', 'expiring-soon']

function formatTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

function DaysBadge({ days }) {
  if (days === null || days === undefined) return <span style={{ color: 'var(--al-text-soft)' }}>—</span>
  if (days <= 2) return <span className="days-badge days-badge--urgent">{days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}</span>
  if (days <= 7) return <span className="days-badge days-badge--warning">{`${days} días`}</span>
  return <span className="days-badge days-badge--ok">{`${days} días`}</span>
}

function StockBar({ current, min, max, type }) {
  const meta = ALERT_TYPE_META[type] || ALERT_TYPE_META['low-stock']
  let pct = 50
  let hint = ''

  if (type === 'low-stock' && min != null && min > 0) {
    pct = Math.min(100, Math.round((current / min) * 100))
    hint = `Mín: ${min}`
  } else if (type === 'high-stock' && max != null && max > 0) {
    pct = Math.min(100, Math.round((current / max) * 100))
    hint = `Máx: ${max}`
  } else if (type === 'expiring-soon') {
    pct = 40
    hint = ''
  }

  return (
    <div className="stock-bar-wrap">
      <div className="stock-bar-row">
        <span className={`stock-bar-num ${meta.numClass}`}>{current ?? '—'}</span>
        <div className="stock-bar-track">
          <div
            className={`stock-bar-fill ${meta.barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {hint && <span className="stock-bar-label">{hint}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   KPI CARD
══════════════════════════════════════════════════ */
function KpiCard({ type, count, isActive, onClick }) {
  const meta = ALERT_TYPE_META[type]
  const { Icon } = meta
  const subtitles = {
    'low-stock':      'En o por debajo del mínimo',
    'high-stock':     'En o por encima del máximo',
    'expiring-soon':  'Vencen en 7 días o menos',
  }
  return (
    <div
      className={`al-kpi-card ${meta.kpiClass}${isActive ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      title={`Filtrar por ${meta.label}`}
    >
      <div className={`al-kpi-icon ${meta.iconClass}`}>
        <Icon />
      </div>
      <div className="al-kpi-info">
        <div className="al-kpi-count">{count}</div>
        <div className="al-kpi-label">{meta.shortLabel}</div>
        <div className="al-kpi-hint">{subtitles[type]}</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function AlertsPage() {
  const [alerts, setAlerts]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [bannerMsg, setBannerMsg]     = useState(null)
  const [categorias, setCategorias]   = useState([])
  const [generatedAt, setGeneratedAt] = useState(null)

  // Filtros
  const [selectedTypes, setSelectedTypes]   = useState([])   // [] = todos
  const [selectedCatId, setSelectedCatId]   = useState('')

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

  /* ── Cargar alertas ── */
  const cargar = useCallback(async () => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const params = {}
      if (selectedTypes.length > 0) params.types = selectedTypes
      if (selectedCatId) params.categoryId = selectedCatId

      const resp = await getAlerts(params)
      const list = resp?.data ?? []
      setAlerts(list)
      setGeneratedAt(resp?.meta?.generatedAt ?? null)
    } catch (err) {
      setBannerMsg(err.message ?? 'No fue posible cargar las alertas.')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [selectedTypes, selectedCatId])

  useEffect(() => { cargar() }, [cargar])

  /* ── Toggle de tipo de alerta ── */
  function toggleType(type) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  /* ── Contadores por tipo ── */
  const countByType = {}
  ALL_TYPES.forEach(t => {
    countByType[t] = alerts.filter(a => a.type === t).length
  })

  /* ── Render tabla ── */
  function renderRows() {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} style={{ textAlign: 'center', padding: '52px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--al-text-muted)' }}>
              <svg className="spinner" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>Analizando inventario…</span>
            </div>
          </td>
        </tr>
      )
    }

    if (alerts.length === 0) {
      return (
        <tr>
          <td colSpan={6}>
            <div className="al-empty">
              <div className={`al-empty__icon${selectedTypes.length > 0 || selectedCatId ? ' al-empty__icon--neutral' : ''}`}>
                {selectedTypes.length > 0 || selectedCatId
                  ? <IconPackage />
                  : <IconCheckCircle />
                }
              </div>
              <p className="al-empty__title">
                {selectedTypes.length > 0 || selectedCatId
                  ? 'Sin alertas con los filtros actuales'
                  : '¡Todo en orden!'
                }
              </p>
              <p className="al-empty__sub">
                {selectedTypes.length > 0 || selectedCatId
                  ? 'Intenta ajustar los filtros para ver más resultados.'
                  : 'No hay alertas de stock activas en este momento.'
                }
              </p>
            </div>
          </td>
        </tr>
      )
    }

    return alerts.map(alert => {
      const meta = ALERT_TYPE_META[alert.type] || {}
      return (
        <tr key={alert.id} className={meta.rowClass ?? ''}>
          <td>
            <span className={`badge-alert ${meta.badgeClass}`}>
              <span className="badge-dot" />
              {meta.label ?? alert.type}
            </span>
          </td>
          <td>
            <div style={{ fontWeight: 600 }}>{alert.productName ?? '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--al-text-soft)', marginTop: 2 }}>
              ID: {alert.productId}
            </div>
          </td>
          <td>
            <StockBar
              current={alert.currentStock}
              min={alert.minStock}
              max={alert.maxStock}
              type={alert.type}
            />
          </td>
          <td>
            {alert.type === 'expiring-soon' && alert.expirationDate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(alert.expirationDate)}</span>
                <DaysBadge days={alert.daysToExpire} />
              </div>
            ) : (
              <span style={{ color: 'var(--al-text-soft)', fontSize: 12 }}>—</span>
            )}
          </td>
          <td>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {alert.minStock != null && (
                <span style={{ fontSize: 12, color: 'var(--al-text-muted)' }}>
                  Mín: <strong>{alert.minStock}</strong>
                </span>
              )}
              {alert.maxStock != null && (
                <span style={{ fontSize: 12, color: 'var(--al-text-muted)' }}>
                  Máx: <strong>{alert.maxStock}</strong>
                </span>
              )}
              {alert.minStock == null && alert.maxStock == null && (
                <span style={{ color: 'var(--al-text-soft)', fontSize: 12 }}>—</span>
              )}
            </div>
          </td>
          <td>
            {alert.categoryId ? (
              <span style={{
                display: 'inline-block',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--al-primary-light)',
                border: '1px solid #BFDBFE',
                color: 'var(--al-primary-dark, #1D4ED8)',
                fontSize: 11.5,
                fontWeight: 600,
              }}>
                {alert.categoryId}
              </span>
            ) : (
              <span style={{ color: 'var(--al-text-soft)', fontSize: 12 }}>—</span>
            )}
          </td>
        </tr>
      )
    })
  }

  const totalAlertas = alerts.length
  const hayFiltros = selectedTypes.length > 0 || !!selectedCatId

  return (
    <div className="al-page">

      {/* ── Cabecera ── */}
      <div className="al-page__header">
        <div className="al-page__heading">
          <h2 className="al-page__title">Alertas de inventario</h2>
          <p className="al-page__subtitle">
            Monitoreo en tiempo real · stock bajo, alto y productos por vencer
          </p>
        </div>
        <button
          className="btn btn--ghost"
          onClick={cargar}
          disabled={loading}
          title="Actualizar alertas"
        >
          <IconRefresh />
          Actualizar
        </button>
      </div>

      {/* ── Banner error ── */}
      {bannerMsg && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert />
          <span>{bannerMsg}</span>
          <button className="alert-banner__close" onClick={() => setBannerMsg(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="al-kpi-grid">
        {ALL_TYPES.map(type => (
          <KpiCard
            key={type}
            type={type}
            count={loading ? '…' : countByType[type]}
            isActive={selectedTypes.includes(type)}
            onClick={() => toggleType(type)}
          />
        ))}
        {/* Card "todo OK" */}
        <div className="al-kpi-card al-kpi-card--ok" style={{ cursor: 'default' }}>
          <div className="al-kpi-icon al-kpi-icon--ok">
            <IconCheckCircle />
          </div>
          <div className="al-kpi-info">
            <div className="al-kpi-count" style={{ color: '#059669' }}>
              {loading ? '…' : totalAlertas}
            </div>
            <div className="al-kpi-label">Alertas activas</div>
            <div className="al-kpi-hint">
              {loading ? '' : totalAlertas === 0 ? 'Sin alertas · todo normal' : 'Requieren atención'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="al-filters">
        {/* Chips por tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span className="al-filter-label">Tipo de alerta</span>
          <div className="al-type-chips">
            {ALL_TYPES.map(type => {
              const meta = ALERT_TYPE_META[type]
              const { Icon } = meta
              const isActive = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  className={`al-type-chip${isActive ? ` ${meta.chipActive}` : ''}`}
                  onClick={() => toggleType(type)}
                >
                  <Icon />
                  {meta.label}
                </button>
              )
            })}
            {selectedTypes.length > 0 && (
              <button
                type="button"
                className="al-type-chip"
                onClick={() => setSelectedTypes([])}
                title="Limpiar filtro de tipo"
              >
                <IconClose />
                Todos
              </button>
            )}
          </div>
        </div>

        {/* Filtro por categoría */}
        <div className="al-filter-field">
          <span className="al-filter-label">Categoría</span>
          <select
            className="al-filter-select"
            value={selectedCatId}
            onChange={e => setSelectedCatId(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id || c.id_categoria} value={String(c.id || c.id_categoria)}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar */}
        {hayFiltros && (
          <div className="al-filter-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setSelectedTypes([]); setSelectedCatId('') }}
            >
              <IconClose />
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* ── Tabla de alertas ── */}
      <div className="al-table-card">
        <div className="al-table-card__toolbar">
          <span className="al-table-card__info">
            {loading
              ? 'Cargando alertas…'
              : `${totalAlertas} ${totalAlertas === 1 ? 'alerta activa' : 'alertas activas'}${hayFiltros ? ' (filtradas)' : ''}`
            }
          </span>
          {generatedAt && !loading && (
            <div className="refresh-info">
              <span className="refresh-dot" />
              Actualizado: {formatTs(generatedAt)}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="al-table">
            <thead>
              <tr>
                <th>Tipo de alerta</th>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Vencimiento</th>
                <th>Umbrales</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody>
              {renderRows()}
            </tbody>
          </table>
        </div>

        {!loading && totalAlertas > 0 && (
          <div style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--al-border)',
            background: 'var(--al-surface-2)',
            fontSize: 11,
            color: 'var(--al-text-soft)',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
           
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}