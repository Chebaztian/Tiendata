import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginRequest } from './auth.js'
import { isUnauthorizedApiResponse } from './sessionInterceptor.js'
import { decodeJwtPayload, getTokenExpiryMs, isTokenExpired } from '../utils/jwt.js'

function mockFetchOnce(status, body) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('loginRequest', () => {
  it('envía el identificador (correo o usuario) y la contraseña', async () => {
    const fetchMock = mockFetchOnce(200, { success: true, data: { token: 't' } })
    await loginRequest('admin', 'Admin1234')
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ identificador: 'admin', contrasena: 'Admin1234' })
  })

  it('en 401 informa los intentos restantes', async () => {
    mockFetchOnce(401, {
      success: false,
      error: { code: 'AUTH_INVALID_CREDENTIALS', details: { intentos_restantes: 1 } },
    })
    await expect(loginRequest('admin', 'mala')).rejects.toMatchObject({
      status: 401,
      message: 'Usuario, correo o contraseña incorrectos. Te queda 1 intento.',
    })
  })

  it('en 423 muestra el mensaje del servidor con los minutos restantes', async () => {
    mockFetchOnce(423, {
      success: false,
      error: { code: 'AUTH_ACCOUNT_BLOCKED', message: 'Cuenta bloqueada. Intente de nuevo en 7 minutos' },
    })
    await expect(loginRequest('admin', 'x')).rejects.toMatchObject({
      status: 423,
      message: 'Cuenta bloqueada. Intente de nuevo en 7 minutos',
    })
  })

  it('sin conexión devuelve un mensaje claro', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(loginRequest('admin', 'x')).rejects.toMatchObject({
      status: 0,
      message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
    })
  })
})

describe('isUnauthorizedApiResponse', () => {
  const unauthorized = { status: 401 }
  const auth = { headers: { Authorization: 'Bearer abc' } }

  it('detecta 401 en llamadas autenticadas', () => {
    expect(isUnauthorizedApiResponse('/api/products', auth, unauthorized)).toBe(true)
  })

  it('ignora llamadas sin token, otras respuestas y rutas /auth/', () => {
    expect(isUnauthorizedApiResponse('/api/products', {}, unauthorized)).toBe(false)
    expect(isUnauthorizedApiResponse('/api/products', auth, { status: 403 })).toBe(false)
    expect(isUnauthorizedApiResponse('/api/auth/login', auth, unauthorized)).toBe(false)
  })
})

describe('utils/jwt', () => {
  const payload = { id_usuario: 1, nombre: 'Ñandú', exp: 2000000000 }
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const token = `h.${encoded}.s`

  it('decodifica el payload, incluidos caracteres no ASCII', () => {
    expect(decodeJwtPayload(token)).toEqual(payload)
    expect(getTokenExpiryMs(token)).toBe(2000000000 * 1000)
  })

  it('maneja tokens inválidos', () => {
    expect(decodeJwtPayload('no-es-un-jwt')).toBeNull()
    expect(getTokenExpiryMs(null)).toBeNull()
    expect(isTokenExpired('basura')).toBe(false)
    expect(isTokenExpired(token, 2000000000 * 1000)).toBe(true)
  })
})
