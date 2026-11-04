/**
 * ConfigPage.jsx — Tiendata | MS-11 Frontend
 * Vista: Configuración del sistema
 *
 * Ruta:  /configuracion
 * Roles: Solo Administrador
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getConfig, updateConfig } from '../../api/config.js'
import './config.css'

/* ── Íconos ─────────────────────────────────────── */
const IconSettings = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93A10 10 0 1 1 4.93 19.07M20 12a8 8 0 0 0-8-8"/>
  </svg>
)
const IconSave = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IconRefresh = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
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
const IconCheck = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconBarcode = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <line x1="3" y1="5" x2="3" y2="19"/><line x1="6" y1="5" x2="6" y2="19"/>
    <line x1="9" y1="5" x2="9" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="15" y1="5" x2="15" y2="19"/><line x1="18" y1="5" x2="18" y2="19"/>
    <line x1="21" y1="5" x2="21" y2="19"/>
  </svg>
)
const IconLock = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconBell = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconUser = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
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

/* ── Definición de parámetros del sistema ────────── */
const CONFIG_PARAMS = [
  {
    key: 'stock_minimo_global',
    label: 'Stock mínimo global',
    description: 'Umbral por defecto para alertas de stock bajo cuando el producto no tiene stock mínimo propio.',
    type: 'integer',
    min: 0,
    unit: 'unidades',
    icon: <IconLock />,
    section: 'Alertas e inventario',
  },
  {
    key: 'dias_expiracion_alertas',
    label: 'Días para alerta de vencimiento',
    description: 'Número de días de anticipación para generar alertas de productos próximos a vencer.',
    type: 'integer',
    min: 1,
    unit: 'días',
    icon: <IconBell />,
    section: 'Alertas e inventario',
  },
  {
    key: 'max_intentos_login',
    label: 'Máx. intentos de inicio de sesión',
    description: 'Cantidad de intentos fallidos de login antes de bloquear temporalmente la cuenta.',
    type: 'integer',
    min: 1,
    unit: 'intentos',
    icon: <IconUser />,
    section: 'Seguridad',
  },
  {
    key: 'tiempo_bloqueo_minutos',
    label: 'Tiempo de bloqueo',
    description: 'Duración del bloqueo de cuenta en minutos tras superar el máximo de intentos.',
    type: 'integer',
    min: 1,
    unit: 'minutos',
    icon: <IconLock />,
    section: 'Seguridad',
  },
]

/* ── Campo de configuración individual ───────────── */
function ConfigField({ param, currentValue, onSave, saving, addToast }) {
  const [editing, setEditing]   = useState(false)
  const [inputVal, setInputVal] = useState(String(currentValue ?? ''))
  const [error, setError]       = useState(null)
  const [localSaving, setLocalSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInputVal(String(currentValue ?? ''))
    setEditing(false)
    setError(null)
  }, [currentValue])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function validate(val) {
    const n = Number(val)
    if (val === '' || isNaN(n) || !Number.isInteger(n)) return 'Debe ser un número entero.'
    if (param.min != null && n < param.min) return `El valor mínimo es ${param.min}.`
    return null
  }

  function handleChange(e) {
    setInputVal(e.target.value)
    setError(null)
  }

  async function handleSave() {
    const err = validate(inputVal)
    if (err) { setError(err); return }
    setLocalSaving(true)
    try {
      await onSave(param.key, inputVal)
      setEditing(false)
      addToast(`"${param.label}" actualizado correctamente.`, 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setLocalSaving(false)
    }
  }

  function handleCancel() {
    setInputVal(String(currentValue ?? ''))
    setEditing(false)
    setError(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  const displayValue = currentValue != null ? currentValue : '—'

  return (
    <div className={`cfg-field ${editing ? 'cfg-field--editing' : ''}`}>
      <div className="cfg-field__icon-wrap">
        {param.icon}
      </div>
      <div className="cfg-field__body">
        <div className="cfg-field__meta">
          <span className="cfg-field__label">{param.label}</span>
          <span className="cfg-field__desc">{param.description}</span>
        </div>

        {editing ? (
          <div className="cfg-field__edit">
            <div className="cfg-field__input-wrap">
              <input
                ref={inputRef}
                type="number"
                className={`cfg-input ${error ? 'cfg-input--error' : ''}`}
                value={inputVal}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                min={param.min}
                step={1}
              />
              {param.unit && <span className="cfg-field__unit">{param.unit}</span>}
            </div>
            {error && <span className="cfg-field__error">{error}</span>}
            <div className="cfg-field__edit-actions">
              <button className="btn btn--ghost btn--sm" onClick={handleCancel} disabled={localSaving} type="button">
                <IconClose /> Cancelar
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={localSaving} type="button">
                {localSaving ? <><IconSpinner /> Guardando…</> : <><IconSave /> Guardar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="cfg-field__display">
            <span className="cfg-field__value">
              {displayValue}
              {param.unit && currentValue != null && (
                <span className="cfg-field__value-unit"> {param.unit}</span>
              )}
            </span>
            <button
              className="btn btn--outline-blue btn--sm"
              onClick={() => setEditing(true)}
              type="button"
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Componente principal ───────────────────────── */
export default function ConfigPage() {
  const [config, setConfig]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [bannerMsg, setBannerMsg] = useState(null)
  const { toasts, addToast }    = useToast()

  const cargar = useCallback(async () => {
    setLoading(true)
    setBannerMsg(null)
    try {
      const resp = await getConfig()
      const data = resp?.data ?? resp
      setConfig(typeof data === 'object' ? data : {})
    } catch (err) {
      setBannerMsg(err.message ?? 'No fue posible cargar la configuración del sistema.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleSave(key, value) {
    await updateConfig(key, value)
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // Agrupar parámetros por sección
  const sections = {}
  CONFIG_PARAMS.forEach(p => {
    if (!sections[p.section]) sections[p.section] = []
    sections[p.section].push(p)
  })

  return (
    <div className="cfg-page">
      <div className="cfg-page__header">
        <div className="cfg-page__heading">
          <h2 className="cfg-page__title">Configuración del sistema</h2>
          <p className="cfg-page__subtitle">
            Parámetros globales · Fuente única de verdad para alertas, seguridad y códigos de barras
          </p>
        </div>
        <button
          className="btn btn--ghost"
          onClick={cargar}
          disabled={loading}
          type="button"
        >
          <IconRefresh /> Actualizar
        </button>
      </div>

      {bannerMsg && (
        <div className="alert-banner alert-banner--error" role="alert">
          <IconAlert />
          <span>{bannerMsg}</span>
          <button className="alert-banner__close" onClick={() => setBannerMsg(null)} type="button">
            <IconClose />
          </button>
        </div>
      )}

      <div className="cfg-notice">
        <IconSettings />
        <span>
          Solo el <strong>Administrador</strong> puede modificar estos parámetros.
          Los cambios se aplican de inmediato a todos los módulos del sistema.
        </span>
      </div>

      {loading ? (
        <div className="cfg-loading">
          <IconSpinner />
          <span>Cargando parámetros del sistema…</span>
        </div>
      ) : (
        Object.entries(sections).map(([section, params]) => (
          <div key={section} className="cfg-section">
            <div className="cfg-section__header">
              <h3 className="cfg-section__title">{section}</h3>
              <span className="cfg-section__count">{params.length} parámetros</span>
            </div>
            <div className="cfg-section__body">
              {params.map((param, i) => (
                <div key={param.key}>
                  <ConfigField
                    param={param}
                    currentValue={config[param.key]}
                    onSave={handleSave}
                    addToast={addToast}
                  />
                  {i < params.length - 1 && <div className="cfg-divider"/>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}