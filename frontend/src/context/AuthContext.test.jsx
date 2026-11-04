import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { SESSION_MESSAGES, REFRESH_MARGIN_MS } from './auth-context.js'
import { useAuth } from '../hooks/useAuth.js'
import { TOKEN_KEY, USER_KEY } from '../api/auth.js'

function makeToken(expInSeconds, extra = {}) {
  const encode = (obj) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const exp = Math.floor(Date.now() / 1000) + expInSeconds
  return `${encode({ alg: 'HS256' })}.${encode({ id_usuario: 1, exp, ...extra })}.firma`
}

function jsonResponse(status, body) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function Probe() {
  const { isAuthenticated, isLoading, user, sessionMessage, token } = useAuth()
  return (
    <div>
      <span data-testid="state">{isLoading ? 'loading' : isAuthenticated ? 'in' : 'out'}</span>
      <span data-testid="user">{user?.nombre ?? ''}</span>
      <span data-testid="message">{sessionMessage ?? ''}</span>
      <span data-testid="token">{token ?? ''}</span>
    </div>
  )
}

const storedUser = { id_usuario: 1, rol: 'Administrador', nombre: 'Guardado' }

describe('AuthProvider', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sin sesión guardada queda desautenticado sin llamar al servidor', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('out')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('valida la sesión guardada con /auth/verify y usa los datos del servidor', async () => {
    const token = makeToken(1800)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation(() =>
      jsonResponse(200, { success: true, data: { valid: true, id_usuario: 1, rol: 'Administrador', nombre: 'Del Servidor' } }),
    )

    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'))
    expect(screen.getByTestId('user')).toHaveTextContent('Del Servidor')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/verify$/)
  })

  it('descarta un token ya expirado sin llamar al servidor', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(-10))
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))

    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('out')
    expect(screen.getByTestId('message')).toHaveTextContent(SESSION_MESSAGES.expired)
    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cierra la sesión si verify responde 401 (token revocado)', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(1800))
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation(() =>
      jsonResponse(401, { success: false, error: { code: 'AUTH_TOKEN_REVOKED', message: 'Token revocado' } }),
    )

    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'))
    expect(screen.getByTestId('message')).toHaveTextContent(SESSION_MESSAGES.expired)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('conserva la sesión local si el servidor no responde', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(1800))
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))

    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'))
    expect(screen.getByTestId('user')).toHaveTextContent('Guardado')
  })

  it('un 401 en cualquier llamada autenticada de la API cierra la sesión', async () => {
    const token = makeToken(1800)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation((url) =>
      /\/auth\/verify/.test(url)
        ? jsonResponse(200, { success: true, data: { id_usuario: 1, rol: 'Administrador', nombre: 'Ana' } })
        : jsonResponse(401, { success: false, error: { code: 'AUTH_TOKEN_EXPIRED' } }),
    )

    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'))

    await act(async () => {
      await window.fetch('http://localhost:3000/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      })
    })

    expect(screen.getByTestId('state')).toHaveTextContent('out')
    expect(screen.getByTestId('message')).toHaveTextContent(SESSION_MESSAGES.expired)
  })

  it('renueva el token antes de expirar si hubo actividad', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const oldToken = makeToken(120)
    const newToken = makeToken(1800, { jti: 'nuevo' })
    localStorage.setItem(TOKEN_KEY, oldToken)
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation((url) =>
      /\/auth\/refresh/.test(url)
        ? jsonResponse(200, { success: true, data: { token: newToken, expires_in: 1800 } })
        : jsonResponse(200, { success: true, data: { id_usuario: 1, rol: 'Administrador', nombre: 'Ana' } }),
    )

    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'))

    await act(async () => {
      vi.advanceTimersByTime(1000)
      window.dispatchEvent(new Event('keydown'))
      vi.advanceTimersByTime(120 * 1000 - REFRESH_MARGIN_MS)
    })

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent(newToken))
    expect(localStorage.getItem(TOKEN_KEY)).toBe(newToken)
  })

  it('sin actividad deja expirar la sesión y muestra el aviso de inactividad', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    localStorage.setItem(TOKEN_KEY, makeToken(120))
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    fetchMock.mockImplementation(() =>
      jsonResponse(200, { success: true, data: { id_usuario: 1, rol: 'Administrador', nombre: 'Ana' } }),
    )

    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'))

    await act(async () => {
      vi.advanceTimersByTime(121 * 1000)
    })

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'))
    expect(screen.getByTestId('message')).toHaveTextContent(SESSION_MESSAGES.inactivity)
    expect(fetchMock.mock.calls.some(([url]) => /\/auth\/refresh/.test(url))).toBe(false)
  })
})
