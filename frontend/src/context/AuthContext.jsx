// Sesión del usuario: guarda el JWT en localStorage, lo valida al cargar,
// lo renueva antes de expirar si hubo actividad y cierra la sesión cuando
// expira, cuando el servidor responde 401 o cuando se cierra en otra pestaña.

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TOKEN_KEY,
  USER_KEY,
  logoutRequest,
  refreshRequest,
  verifyRequest,
} from '../api/auth.js'
import { installUnauthorizedInterceptor } from '../api/sessionInterceptor.js'
import { getTokenExpiryMs, isTokenExpired } from '../utils/jwt.js'
import { AuthContext, REFRESH_MARGIN_MS, SESSION_MESSAGES } from './auth-context.js'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']

function readStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  if (!token || !rawUser) return null
  try {
    return { token, user: JSON.parse(rawUser) }
  } catch {
    return null
  }
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }) {
  // Sesión guardada al cargar la app: se valida con el servidor antes de usarla
  const [initialSession] = useState(() => {
    const stored = readStoredSession()
    if (!stored) return { status: 'none' }
    if (isTokenExpired(stored.token)) return { status: 'expired' }
    return { status: 'pending', stored }
  })

  const [user, setUser] = useState(null) // { id_usuario, rol, nombre }
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(initialSession.status === 'pending')
  const [sessionMessage, setSessionMessage] = useState(
    initialSession.status === 'expired' ? SESSION_MESSAGES.expired : null,
  )

  const tokenRef = useRef(null)
  const lastActivityRef = useRef(0)

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  /** Cierra la sesión solo en el cliente (el token ya no es válido). */
  const expireSession = useCallback((message = SESSION_MESSAGES.expired) => {
    clearStoredSession()
    tokenRef.current = null
    setToken(null)
    setUser(null)
    setSessionMessage(message)
  }, [])

  const applyToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    tokenRef.current = newToken
    setToken(newToken)
  }, [])

  // ── Al montar: recuperar y validar la sesión guardada ───────────────────
  useEffect(() => {
    if (initialSession.status !== 'pending') {
      clearStoredSession() // restos incompletos o token expirado
      return undefined
    }

    let cancelled = false
    const { stored } = initialSession

    verifyRequest(stored.token)
      .then((data) => {
        if (cancelled) return
        const userData = { id_usuario: data.id_usuario, rol: data.rol, nombre: data.nombre }
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        tokenRef.current = stored.token
        setToken(stored.token)
        setUser(userData)
      })
      .catch((error) => {
        if (cancelled) return
        if (error.status === 401) {
          expireSession(SESSION_MESSAGES.expired)
        } else {
          // Servidor no disponible: se conserva la sesión local; si el token
          // ya no es válido, la primera llamada a la API devolverá 401.
          tokenRef.current = stored.token
          setToken(stored.token)
          setUser(stored.user)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialSession, expireSession])

  // ── 401 en cualquier llamada autenticada → sesión expirada ──────────────
  useEffect(
    () =>
      installUnauthorizedInterceptor(() => {
        if (tokenRef.current) expireSession(SESSION_MESSAGES.expired)
      }),
    [expireSession],
  )

  // ── Registrar actividad del usuario ──────────────────────────────────────
  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now()
    }
    markActivity()
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true }),
    )
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity))
    }
  }, [])

  // ── Renovación antes de expirar (solo si hubo actividad) ────────────────
  useEffect(() => {
    if (!token) return undefined
    const expiresAt = getTokenExpiryMs(token)
    if (!expiresAt) return undefined

    const sessionStartedAt = Date.now()
    let expiryTimer
    let cancelled = false

    const scheduleExpiry = (message) => {
      expiryTimer = setTimeout(
        () => expireSession(message),
        Math.max(0, expiresAt - Date.now()),
      )
    }

    const refreshTimer = setTimeout(async () => {
      if (lastActivityRef.current <= sessionStartedAt) {
        scheduleExpiry(SESSION_MESSAGES.inactivity)
        return
      }
      try {
        const data = await refreshRequest(token)
        if (!cancelled) applyToken(data.token)
      } catch (error) {
        if (cancelled) return
        if (error.status === 401) expireSession(SESSION_MESSAGES.expired)
        else scheduleExpiry(SESSION_MESSAGES.expired) // sin conexión: esperar a la expiración
      }
    }, Math.max(0, expiresAt - REFRESH_MARGIN_MS - Date.now()))

    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      clearTimeout(expiryTimer)
    }
  }, [token, applyToken, expireSession])

  // ── Sincronizar entre pestañas ───────────────────────────────────────────
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== TOKEN_KEY) return
      if (!event.newValue) {
        if (tokenRef.current) expireSession(SESSION_MESSAGES.otherTab)
      } else if (event.newValue !== tokenRef.current) {
        // Otra pestaña renovó el token o inició sesión
        const stored = readStoredSession()
        tokenRef.current = event.newValue
        setToken(event.newValue)
        if (stored?.user) setUser(stored.user)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [expireSession])

  /**
   * Guardar sesión tras login exitoso
   * @param {{ token, id_usuario, rol, nombre }} loginData
   */
  const login = useCallback(
    (loginData) => {
      const { token: newToken, id_usuario, rol, nombre } = loginData
      const userData = { id_usuario, rol, nombre }

      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      applyToken(newToken)
      setUser(userData)
      setSessionMessage(null)
    },
    [applyToken],
  )

  /** Cerrar sesión: revoca el token en el servidor y limpia el estado local. */
  const logout = useCallback(async () => {
    const currentToken = tokenRef.current
    clearStoredSession()
    tokenRef.current = null
    setToken(null)
    setUser(null)
    setSessionMessage(null)
    await logoutRequest(currentToken)
  }, [])

  const clearSessionMessage = useCallback(() => setSessionMessage(null), [])

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        sessionMessage,
        clearSessionMessage,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
