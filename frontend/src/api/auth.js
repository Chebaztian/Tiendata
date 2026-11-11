// Comunicación con el servicio de autenticación MS-01
// Endpoints: POST /api/auth/login | POST /api/auth/logout
//            POST /api/auth/refresh | GET /api/auth/verify

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Claves en localStorage — compartidas con AuthContext y el resto de api/*.js
export const TOKEN_KEY = 'tiendata_token'
export const USER_KEY = 'tiendata_user'

/** Error de autenticación con el status HTTP (0 = sin conexión) y código del backend. */
export class AuthRequestError extends Error {
  constructor(message, { status = 0, code, details } = {}) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function authFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AuthRequestError('No se pudo conectar con el servidor. Verifica tu conexión.')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Respuesta sin JSON (p. ej. un error del proxy)
  }

  if (response.ok && data) return data

  throw new AuthRequestError(data?.error?.message || 'Error inesperado. Inténtalo de nuevo.', {
    status: response.status,
    code: data?.error?.code,
    details: data?.error?.details,
  })
}

/**
 * Inicia sesión con correo o nombre de usuario.
 * @returns {{ success, data: { token, id_usuario, nombre, rol, expires_in } }}
 */
export async function loginRequest(identificador, contrasena) {
  try {
    return await authFetch('/auth/login', {
      method: 'POST',
      body: { identificador, contrasena },
    })
  } catch (error) {
    if (!(error instanceof AuthRequestError) || error.status === 0) throw error

    if (error.status === 401) {
      const restantes = error.details?.intentos_restantes
      const extra =
        typeof restantes === 'number'
          ? ` Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}.`
          : ''
      error.message = `Usuario, correo o contraseña incorrectos.${extra}`
    } else if (error.status === 429) {
      error.message = error.message || 'Demasiados intentos fallidos. Intenta de nuevo más tarde.'
    } else if (error.status === 423) {
      error.message = error.message || 'Cuenta bloqueada. Demasiados intentos fallidos.'
    } else if (error.status === 403) {
      error.message = error.message || 'Tu cuenta está deshabilitada. Contacta al Administrador.'
    } else if (error.status >= 500) {
      error.message = 'El servidor no está disponible en este momento. Inténtalo de nuevo.'
    }
    throw error
  }
}

/** Valida el token contra el servidor. Devuelve { id_usuario, nombre, rol, ... }. */
export async function verifyRequest(token) {
  const data = await authFetch('/auth/verify', { token })
  return data.data
}

/** Renueva el token. Devuelve { token, expires_in }. El token anterior queda revocado. */
export async function refreshRequest(token) {
  const data = await authFetch('/auth/refresh', { method: 'POST', token })
  return data.data
}

/** Cierra sesión en el servidor. Nunca lanza: la sesión local se limpia igualmente. */
export async function logoutRequest(token = localStorage.getItem(TOKEN_KEY)) {
  if (!token) return
  try {
    await authFetch('/auth/logout', { method: 'POST', token })
  } catch {
    console.warn('No se pudo cerrar la sesión en el servidor. Limpiando sesión local.')
  }
}
