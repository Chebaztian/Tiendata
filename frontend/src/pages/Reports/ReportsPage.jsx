/**
 * ReportsPage.jsx — Tiendata  |  MS-07 + MS-12 Frontend
 * Vista: Reportes de Inventario + Exportación
 *
 * Ruta:    /reportes
 * Roles:   Administrador y Operador (operador solo lectura, sin exportar)
 * Tipos:   movements | sales | stock
 *
 * MS-07 (Juan Sebastian): generación de reportes con filtros y tabla.
 * MS-12 (Juan Camilo):    descarga de archivos PDF / Excel / CSV mediante
 *                         POST /api/export, solo para Administrador.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getReport,
  getReportFiltersCatalog,
  REPORT_TYPES,
  REPORT_FILTERS,
  MOVEMENT_FILTER_OPTIONS,
} from '../../api/reports.js'
import {
  exportarDatos,
  descargarBlob,
  buildExportPayload,
} from '../../api/exports.js'
import './reports.css'

/* ══════════════════════════════════════════════════
   ÍCONOS SVG
══════════════════════════════════════════════════ */
const IconChart = () => (
  <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconFilter = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)
const IconClose = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconAlert = () => (
  <svg className="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IconSpinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round"/>
  </svg>
)
const IconEmpty = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconDownload = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

/* ══════════════════════════════════════════════════
   HOOK: TOASTS
══════════════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random()
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
          <span className={`toast-dot toast-dot--${t.type}`}/>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TARJETAS DE RESUMEN
══════════════════════════════════════════════════ */
function SummaryCards({ summary, reportType }) {
  if (!summary) return null
  const cards = [
    { label: 'Registros',        value: summary.total_items ?? 0,    format: 'number' },
    { label: 'Cantidad total',   value: summary.total_quantity ?? 0, format: 'number' },
    {
      label: reportType === 'stock' ? 'Valor inventario' : 'Valor total',
      value: summary.total_value ?? 0,
      format: 'currency',
    },
  ]
  return (
    <div className="summary-cards">
      {cards.map(card => (
        <div key={card.label} className="summary-card">
          <span className="summary-card__label">{card.label}</span>
          <span className="summary-card__value">
            {card.format === 'currency'
              ? `$${Number(card.value).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : Number(card.value).toLocaleString('es-CO')}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   TABLA DE RESULTADOS
══════════════════════════════════════════════════ */
function BadgeTipo({ tipo }) {
  const label = tipo === 'entrada' ? 'Entrada' : tipo === 'salida' ? 'Salida' : tipo === 'ajuste' ? 'Ajuste' : tipo
  return (
    <span className={`badge-tipo badge-tipo--${tipo}`}>
      <span className="badge-dot"/>
      {label}
    </span>
  )
}

function ReportTable({ columns, items }) {
  if (!columns || !items) return null

  function renderCell(col, item) {
    const val = item[col.key]
    if (col.key === 'tipo') return <BadgeTipo tipo={val} />
    if (col.key === 'valor_total' || col.key === 'precio_unitario') {
      return val != null
        ? `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
        : '—'
    }
    if (col.key === 'cantidad' || col.key === 'stock_anterior' || col.key === 'stock_posterior') {
      return val != null ? Number(val).toLocaleString('es-CO') : '—'
    }
    return val ?? '—'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="report-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                <IconEmpty />
                <span>No hay datos para los filtros seleccionados.</span>
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id_movimiento ?? item.id_producto ?? idx}>
                {columns.map(col => (
                  <td key={col.key} className={col.key === 'producto' ? 'td-bold' : ''}>
                    {renderCell(col, item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { user } = useAuth()
  const isAdmin  = user?.rol === 'Administrador'

  const { toasts, addToast } = useToast()

  // Tipo de reporte seleccionado
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value)

  // Catálogo para filtros
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // Filtros actuales
  const [filters, setFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    categoria: '',
    producto: '',
    tipo: '',
  })

  // Resultado del reporte
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [generated, setGenerated]   = useState(false)
  const [bannerMsg, setBannerMsg]   = useState(null)

  // Estado de exportación: null cuando idle, 'CSV' | 'EXCEL' | 'PDF' cuando descargando
  const [exportingFormat, setExportingFormat] = useState(null)

  // Cargar catálogo al montar
  useEffect(() => {
    async function loadCatalog() {
      setCatalogLoading(true)
      try {
        const { categories: cats, products: prods } = await getReportFiltersCatalog()
        setCategories(cats)
        setProducts(prods)
      } catch {
        // fallo silencioso — los selects quedan vacíos
      } finally {
        setCatalogLoading(false)
      }
    }
    loadCatalog()
  }, [])

  function handleReportTypeChange(type) {
    setReportType(type)
    setReportData(null)
    setGenerated(false)
    setBannerMsg(null)
    setFilters({ fecha_inicio: '', fecha_fin: '', categoria: '', producto: '', tipo: '' })
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'categoria' ? { producto: '' } : {}),
    }))
    setBannerMsg(null)
  }

  function handleClearFilters() {
    setFilters({ fecha_inicio: '', fecha_fin: '', categoria: '', producto: '', tipo: '' })
    setReportData(null)
    setGenerated(false)
    setBannerMsg(null)
  }

  async function handleGenerate() {
    setBannerMsg(null)
    setLoading(true)
    try {
      const data = await getReport(reportType, filters)
      setReportData(data)
      setGenerated(true)
    } catch (err) {
      setBannerMsg(err.message ?? 'No fue posible generar el reporte.')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  /* ── MS-12: Exportación al backend (solo Administrador) ───────── */
  async function handleExportFormat(formato) {
    if (!reportData?.items?.length) {
      addToast('No hay datos para exportar.', 'error')
      return
    }
    setExportingFormat(formato)
    try {
      const payload = buildExportPayload({ reportType, filters, formato })
      const { blob, filename, total } = await exportarDatos(payload)
      descargarBlob(blob, filename)
      addToast(
        `Archivo ${formato} descargado · ${total.toLocaleString('es-CO')} ${total === 1 ? 'registro' : 'registros'}.`,
        'success'
      )
    } catch (err) {
      if (err.code === 'EXPORT_DATA_NOT_FOUND' || err.status === 404) {
        addToast('No se encontraron datos con los filtros seleccionados.', 'error')
      } else if (err.code === 'EXPORT_LIMIT_EXCEEDED' || err.status === 413) {
        addToast('El volumen supera el límite (100.000 registros). Aplica filtros más específicos.', 'error')
      } else if (err.status === 403) {
        addToast('No tienes permisos para exportar datos.', 'error')
      } else {
        addToast(err.message ?? 'No fue posible exportar los datos.', 'error')
      }
    } finally {
      setExportingFormat(null)
    }
  }

  const supportedFilters = REPORT_FILTERS[reportType] ?? []
  const filteredProducts = filters.categoria
    ? products.filter(p => String(p.id_categoria) === String(filters.categoria))
    : products

  const hayDatos = (reportData?.items?.length ?? 0) > 0
  const showExportButtons = isAdmin && generated && hayDatos

  return (
    <div className="rp-page">

      {/* Cabecera */}
      <div className="rp-page__header">
        <div className="rp-page__heading">
          <h2 className="rp-page__title">Reportes</h2>
          <p className="rp-page__subtitle">Genera y exporta reportes de movimientos, ventas y stock</p>
        </div>
      </div>

      {/* Selector de tipo de reporte */}
      <div className="rp-type-tabs">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.value}
            type="button"
            className={`rp-type-tab ${reportType === rt.value ? 'active' : ''}`}
            onClick={() => handleReportTypeChange(rt.value)}
          >
            <IconChart />
            {rt.label}
          </button>
        ))}
      </div>

      {/* Panel de filtros */}
      <div className="rp-card">
        <div className="rp-card__header">
          <span className="rp-card__title">Filtros</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearFilters}>
            <IconClose />
            Limpiar
          </button>
        </div>

        <div className="rp-filters">
          {supportedFilters.includes('fecha_inicio') && (
            <div className="filter-field">
              <label className="filter-label">Fecha inicio</label>
              <input
                type="date"
                name="fecha_inicio"
                className="filter-input"
                value={filters.fecha_inicio}
                onChange={handleFilterChange}
                max={filters.fecha_fin || undefined}
              />
            </div>
          )}
          {supportedFilters.includes('fecha_fin') && (
            <div className="filter-field">
              <label className="filter-label">Fecha fin</label>
              <input
                type="date"
                name="fecha_fin"
                className="filter-input"
                value={filters.fecha_fin}
                onChange={handleFilterChange}
                min={filters.fecha_inicio || undefined}
              />
            </div>
          )}
          {supportedFilters.includes('categoria') && (
            <div className="filter-field">
              <label className="filter-label">Categoría</label>
              <select
                name="categoria"
                className="filter-select"
                value={filters.categoria}
                onChange={handleFilterChange}
                disabled={catalogLoading}
              >
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={`category-${c.id_categoria ?? c.nombre_categoria}`} value={c.id_categoria}>
                    {c.nombre_categoria}
                  </option>
                ))}
              </select>
            </div>
          )}
          {supportedFilters.includes('producto') && (
            <div className="filter-field">
              <label className="filter-label">Producto</label>
              <select
                name="producto"
                className="filter-select"
                value={filters.producto}
                onChange={handleFilterChange}
                disabled={catalogLoading}
              >
                <option value="">Todos</option>
                {filteredProducts.map(p => (
                  <option key={`product-${p.id_producto ?? p.nombre}`} value={p.id_producto}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {supportedFilters.includes('tipo') && (
            <div className="filter-field">
              <label className="filter-label">Tipo movimiento</label>
              <select
                name="tipo"
                className="filter-select"
                value={filters.tipo}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {MOVEMENT_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="rp-card__footer">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? <><IconSpinner /> Generando…</> : <><IconFilter /> Generar reporte</>}
          </button>

          {/* MS-12: botones de descarga (solo Administrador) */}
          {showExportButtons && (
            <div className="rp-export-group">
              <span className="rp-export-label">Exportar:</span>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => handleExportFormat('CSV')}
                disabled={exportingFormat !== null}
                title="Descargar como CSV"
              >
                {exportingFormat === 'CSV' ? <IconSpinner /> : <IconDownload />}
                CSV
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => handleExportFormat('EXCEL')}
                disabled={exportingFormat !== null}
                title="Descargar como Excel"
              >
                {exportingFormat === 'EXCEL' ? <IconSpinner /> : <IconDownload />}
                Excel
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => handleExportFormat('PDF')}
                disabled={exportingFormat !== null}
                title="Descargar como PDF"
              >
                {exportingFormat === 'PDF' ? <IconSpinner /> : <IconDownload />}
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Banner error */}
      {bannerMsg && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert />
          <span>{bannerMsg}</span>
          <button
            className="alert-banner__close"
            onClick={() => setBannerMsg(null)}
            type="button"
            aria-label="Cerrar"
          >
            <IconClose />
          </button>
        </div>
      )}

      {/* Resultados */}
      {loading && (
        <div className="rp-loading">
          <IconSpinner />
          <span>Generando reporte…</span>
        </div>
      )}

      {!loading && generated && reportData && (
        <>
          <SummaryCards summary={reportData.summary} reportType={reportType} />

          <div className="rp-card rp-card--table">
            <div className="rp-card__header">
              <span className="rp-card__title">
                {REPORT_TYPES.find(r => r.value === reportType)?.label}
              </span>
              <span className="rp-table-count">
                {reportData.items?.length ?? 0}{' '}
                {reportData.items?.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <ReportTable
              columns={reportData.columns}
              items={reportData.items}
            />
            {reportData.meta?.generatedAt && (
              <div className="rp-card__info">
                Generado el{' '}
                {new Date(reportData.meta.generatedAt).toLocaleString('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !generated && (
        <div className="rp-empty-state">
          <IconEmpty />
          <p>Selecciona los filtros y presiona <strong>Generar reporte</strong> para ver los resultados.</p>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
