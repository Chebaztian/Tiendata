/**
 * BarcodePage.jsx — Tiendata | MS-08 Frontend
 * Vista: Códigos de Barras
 *
 * Ruta:   /codigos-barras
 * Roles:
 *   Administrador → búsqueda, validación y generación de códigos EAN-13
 *   Operador      → búsqueda y validación
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { lookupBarcode, validateBarcode, generateBarcode } from '../../api/barcode.js'
import './barcode.css'

/* ── Íconos SVG ─────────────────────────────────── */
const IconBarcode = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h2M7 5h1M12 5h1M17 5h1M21 5h-2M3 19h2M7 19h1M12 19h1M17 19h1M21 19h-2"/>
    <line x1="3" y1="5" x2="3" y2="19"/><line x1="6" y1="5" x2="6" y2="19"/>
    <line x1="9" y1="5" x2="9" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="15" y1="5" x2="15" y2="19"/><line x1="18" y1="5" x2="18" y2="19"/>
    <line x1="21" y1="5" x2="21" y2="19"/>
  </svg>
)
const IconSearch = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconCheck = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconGenerate = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)
const IconCopy = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const IconAlert = () => (
  <svg className="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IconClose = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconSpinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" stroke="currentColor" strokeLinecap="round"/>
  </svg>
)
const IconScan = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
  </svg>
)
const IconPackage = () => (
  <svg style={{ width: 28, height: 28 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

/* ── Toast ─────────────────────────────────────── */
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
          <span className={`toast-dot toast-dot--${t.type}`}/>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ── Barcode Visual (SVG fake bars) ─────────────── */
function BarcodeVisual({ code }) {
  if (!code) return null
  // Genera barras visuales pseudo-aleatorias basadas en el código
  const widths = code.split('').map(ch => {
    const n = parseInt(ch, 10)
    return [1, 2, 1, 3, 1, 2, 2, 1, 3, 2][n] ?? 1
  })
  let x = 0
  const bars = []
  widths.forEach((w, i) => {
    if (i % 2 === 0) {
      bars.push({ x, w })
    }
    x += w + 1
  })
  const totalW = x

  return (
    <div className="bc-visual">
      <svg viewBox={`0 0 ${totalW} 60`} className="bc-svg" aria-label={`Código de barras: ${code}`}>
        {bars.map((bar, i) => (
          <rect key={i} x={bar.x} y={0} width={bar.w} height={52} fill="#111827"/>
        ))}
      </svg>
      <div className="bc-number">{code}</div>
    </div>
  )
}

/* ── Panel: Búsqueda por código ─────────────────── */
function PanelBusqueda({ addToast }) {
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const inputRef                = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSearch(e) {
    e?.preventDefault()
    const c = code.trim()
    if (!c) return
    if (!/^\d{13}$/.test(c)) {
      setError('El código debe ser EAN-13 (exactamente 13 dígitos numéricos).')
      setResult(null)
      return
    }
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const resp = await lookupBarcode(c)
      setResult(resp?.data ?? resp)
    } catch (err) {
      if (err.status === 404) {
        setError('Código no encontrado en el sistema.')
      } else if (err.status === 422) {
        setError('Formato EAN-13 inválido.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch()
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="bc-panel">
      <div className="bc-panel__header">
        <div className="bc-panel__icon-wrap bc-panel__icon-wrap--primary">
          <IconScan />
        </div>
        <div>
          <h3 className="bc-panel__title">Búsqueda por código de barras</h3>
          <p className="bc-panel__sub">Escanea o ingresa un código EAN-13 para consultar el producto</p>
        </div>
      </div>

      <div className="bc-search-row">
        <div className="bc-search-wrap">
          <input
            ref={inputRef}
            type="text"
            className="bc-search-input"
            placeholder="Escanea o ingresa un código EAN-13 (13 dígitos)…"
            value={code}
            onChange={e => { setCode(e.target.value); setError(null); setResult(null) }}
            onKeyDown={handleKeyDown}
            maxLength={13}
            autoFocus
            autoComplete="off"
          />
          <span className="bc-search-kbd">Enter</span>
        </div>
        <button
          className="btn btn--primary"
          onClick={handleSearch}
          disabled={loading || !code.trim()}
          type="button"
        >
          {loading ? <><IconSpinner /> Buscando…</> : <><IconSearch /> Buscar</>}
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => { setCode(''); setResult(null); setError(null); inputRef.current?.focus() }}
          type="button"
          disabled={!code && !result && !error}
        >
          <IconClose /> Limpiar
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert />
          <span>{error}</span>
          <button className="alert-banner__close" onClick={() => setError(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {result && (
        <div className="bc-result-card">
          <div className="bc-result-card__left">
            <BarcodeVisual code={result.codigo_barras} />
          </div>
          <div className="bc-result-card__right">
            <div className="bc-result-card__name">{result.nombre}</div>
            <div className="bc-result-card__code">{result.codigo_barras}</div>

            <div className="bc-result-grid">
              <div className="bc-result-field">
                <span className="bc-result-label">Precio venta</span>
                <span className="bc-result-value bc-result-value--primary">
                  {formatCurrency(result.precio_venta)}
                </span>
              </div>
              <div className="bc-result-field">
                <span className="bc-result-label">Precio compra</span>
                <span className="bc-result-value">{formatCurrency(result.precio_compra)}</span>
              </div>
              <div className="bc-result-field">
                <span className="bc-result-label">Stock actual</span>
                <span className={`bc-result-value ${
                  result.stock_actual <= (result.stock_minimo ?? 0)
                    ? 'bc-result-value--warn'
                    : 'bc-result-value--ok'
                }`}>
                  {result.stock_actual} unidades
                  {result.stock_minimo != null && result.stock_actual <= result.stock_minimo && (
                    <span className="bc-stock-warn-chip">Stock bajo</span>
                  )}
                </span>
              </div>
              <div className="bc-result-field">
                <span className="bc-result-label">Stock mínimo</span>
                <span className="bc-result-value">{result.stock_minimo ?? '—'}</span>
              </div>
              {result.ubicacion && (
                <div className="bc-result-field">
                  <span className="bc-result-label">Ubicación</span>
                  <span className="bc-result-value">{result.ubicacion}</span>
                </div>
              )}
              {result.fecha_vencimiento && (
                <div className="bc-result-field">
                  <span className="bc-result-label">Vencimiento</span>
                  <span className="bc-result-value">{result.fecha_vencimiento}</span>
                </div>
              )}
            </div>

            <div className="bc-result-card__id">
              ID producto: <strong>#{result.id_producto}</strong>
            </div>
          </div>
        </div>
      )}

      {!result && !error && !loading && (
        <div className="bc-empty">
          <div className="bc-empty__icon">
            <IconPackage />
          </div>
          <p className="bc-empty__text">Ingresa un código EAN-13 para consultar el producto asociado</p>
          <p className="bc-empty__sub">Compatible con lectores USB HID — el lector escribe el código automáticamente</p>
        </div>
      )}
    </div>
  )
}

/* ── Panel: Validar código ───────────────────────── */
function PanelValidar({ addToast }) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  async function handleValidate(e) {
    e?.preventDefault()
    const c = code.trim()
    if (!c) return
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const resp = await validateBarcode(c)
      setResult(resp?.data ?? resp)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bc-panel">
      <div className="bc-panel__header">
        <div className="bc-panel__icon-wrap bc-panel__icon-wrap--validate">
          <IconCheck />
        </div>
        <div>
          <h3 className="bc-panel__title">Validar código EAN-13</h3>
          <p className="bc-panel__sub">Verifica el formato y dígito verificador de cualquier código</p>
        </div>
      </div>

      <div className="bc-search-row">
        <div className="bc-search-wrap" style={{ flex: 1 }}>
          <input
            type="text"
            className="bc-search-input"
            placeholder="Ingresa el código a validar…"
            value={code}
            onChange={e => { setCode(e.target.value); setResult(null); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleValidate()}
            maxLength={13}
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn--outline-blue"
          onClick={handleValidate}
          disabled={loading || !code.trim()}
          type="button"
        >
          {loading ? <><IconSpinner /> Validando…</> : <><IconCheck /> Validar</>}
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => { setCode(''); setResult(null); setError(null) }}
          type="button"
        >
          <IconClose /> Limpiar
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert /><span>{error}</span>
          <button className="alert-banner__close" onClick={() => setError(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {result !== null && (
        <div className={`bc-validation-result ${result.valid ? 'bc-validation-result--ok' : 'bc-validation-result--error'}`}>
          <div className="bc-validation-result__icon">
            {result.valid
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            }
          </div>
          <div className="bc-validation-result__body">
            <div className="bc-validation-result__title">
              {result.valid ? 'Código EAN-13 válido' : 'Código inválido'}
            </div>
            <div className="bc-validation-result__detail">
              {result.valid
                ? `Dígito verificador correcto: ${result.checksum}`
                : result.message ?? 'El código no cumple con el estándar EAN-13'
              }
            </div>
            {result.valid && (
              <div className="bc-validation-result__code">
                <BarcodeVisual code={code.trim()} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Panel: Generar código (solo Admin) ─────────── */
function PanelGenerar({ addToast }) {
  const [prefix, setPrefix]   = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [error, setError]     = useState(null)
  const [copied, setCopied]   = useState(false)

  async function handleGenerate() {
    setError(null)
    setGenerated(null)
    setLoading(true)
    try {
      const resp = await generateBarcode(prefix.trim())
      const data = resp?.data ?? resp
      setGenerated(data.code ?? data.codigo_barras ?? data)
      addToast('Código EAN-13 generado correctamente.', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!generated) return
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    addToast('Código copiado al portapapeles.', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bc-panel">
      <div className="bc-panel__header">
        <div className="bc-panel__icon-wrap bc-panel__icon-wrap--generate">
          <IconGenerate />
        </div>
        <div>
          <h3 className="bc-panel__title">Generar código EAN-13</h3>
          <p className="bc-panel__sub">Genera un código único válido con prefijo de empresa (opcional)</p>
        </div>
      </div>

      <div className="bc-generate-form">
        <div className="field">
          <label className="field__label">
            Prefijo de empresa <span className="field__optional">(opcional)</span>
          </label>
          <input
            type="text"
            className="field__input"
            placeholder="Ej: 770 (hasta 12 dígitos numéricos)"
            value={prefix}
            onChange={e => setPrefix(e.target.value.replace(/\D/g, '').slice(0, 12))}
            maxLength={12}
            autoComplete="off"
          />
          <span className="field__hint">
            El prefijo se configura globalmente en Configuración del sistema.
            Los dígitos restantes se generan automáticamente y se calcula el dígito verificador.
          </span>
        </div>

        <div className="form-footer">
          <button
            className="btn btn--primary btn--lg"
            onClick={handleGenerate}
            disabled={loading}
            type="button"
          >
            {loading ? <><IconSpinner /> Generando…</> : <><IconGenerate /> Generar código</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert /><span>{error}</span>
          <button className="alert-banner__close" onClick={() => setError(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      {generated && (
        <div className="bc-generated-result">
          <BarcodeVisual code={generated} />
          <div className="bc-generated-result__actions">
            <button
              className={`btn ${copied ? 'btn--success-solid' : 'btn--outline-blue'}`}
              onClick={handleCopy}
              type="button"
            >
              <IconCopy /> {copied ? '¡Copiado!' : 'Copiar código'}
            </button>
          </div>
          <p className="bc-generated-result__hint">
            Código listo para asignar. Puedes copiarlo y usarlo al registrar un nuevo producto.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ───────────────────────── */
export default function BarcodePage() {
  const { user } = useAuth()
  const isAdmin  = user?.rol === 'Administrador'
  const [activeTab, setActiveTab] = useState('buscar')
  const { toasts, addToast } = useToast()

  const tabs = [
    { id: 'buscar',   label: 'Búsqueda rápida',   icon: <IconSearch />,   show: true },
    { id: 'validar',  label: 'Validar código',     icon: <IconCheck />,    show: true },
    { id: 'generar',  label: 'Generar código',     icon: <IconGenerate />, show: isAdmin },
  ].filter(t => t.show)

  return (
    <div className="bc-page">
      <div className="bc-page__header">
        <div className="bc-page__heading">
          <h2 className="bc-page__title">Códigos de barras</h2>
          <p className="bc-page__subtitle">
            Busca, valida{isAdmin ? ' y genera' : ''} códigos EAN-13 · Estándar GS1
          </p>
        </div>
      </div>

      <div className="bc-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`bc-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bc-tab-content">
        {activeTab === 'buscar'  && <PanelBusqueda addToast={addToast} />}
        {activeTab === 'validar' && <PanelValidar addToast={addToast} />}
        {activeTab === 'generar' && isAdmin && <PanelGenerar addToast={addToast} />}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}