import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import logo from '../../assets/images/logo.svg'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({ correo: '', contrasena: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorType, setErrorType] = useState('error')

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMsg) setErrorMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!formData.correo.trim() || !formData.contrasena) {
      setErrorMsg('Por favor completa todos los campos.')
      setErrorType('error')
      return
    }

    setIsLoading(true)
    try {
      const data = await loginRequest(formData.correo.trim(), formData.contrasena)
      login(data.data)
      navigate(data.data.rol === 'Administrador' ? '/dashboard/admin' : '/dashboard', { replace: true })
    } catch (err) {
      const message = err.message || 'Error desconocido.'
      setErrorType(message.includes('bloqueada') ? 'warning' : 'error')
      setErrorMsg(message)
    } finally {
      setIsLoading(false)
    }
  }

  const hasError = !!errorMsg

  return (
    <>
      <header className="login-topbar">
        <div className="login-topbar-logo">
          <img src={logo} alt="Tiendata" />
        </div>
        <div className="login-topbar-text">
          <span className="login-topbar-name">Tiendata</span>
          <span className="login-topbar-desc">Sistema de Gestión y Control de Inventarios</span>
        </div>
      </header>

      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Iniciar sesión</h1>
            <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {hasError && (
            <div className={`error-message ${errorType === 'warning' ? 'warning' : ''}`} role="alert">
              <span className="error-icon">
                {errorType === 'warning' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </span>
              <div>
                <strong>Error de autenticación</strong><br />
                {errorMsg}
              </div>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                name="correo"
                type="email"
                autoComplete="email"
                placeholder="usuario@ejemplo.com"
                value={formData.correo}
                onChange={handleChange}
                disabled={isLoading}
                className={hasError ? 'input-error' : ''}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={formData.contrasena}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={hasError ? 'input-error' : ''}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading && <span className="spinner" aria-hidden="true" />}
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}