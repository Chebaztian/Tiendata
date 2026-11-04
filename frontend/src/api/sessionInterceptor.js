// Detecta respuestas 401 en cualquier llamada autenticada a la API
// (todas las api/*.js usan fetch con "Authorization: Bearer ...") para
// cerrar la sesión local cuando el token expiró o fue revocado.
// Las rutas /auth/* se excluyen: AuthContext gestiona sus propios errores.

function getAuthorizationHeader(input, init) {
  const headers = init?.headers ?? (input instanceof Request ? input.headers : undefined)
  if (!headers) return null
  try {
    return new Headers(headers).get('Authorization')
  } catch {
    return null
  }
}

function getUrl(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  return ''
}

export function isUnauthorizedApiResponse(input, init, response) {
  if (response?.status !== 401) return false
  const authorization = getAuthorizationHeader(input, init)
  if (!authorization || !authorization.startsWith('Bearer ')) return false
  return !/\/auth\//.test(getUrl(input))
}

/**
 * Envuelve window.fetch. Devuelve una función que restaura el fetch original.
 * @param {() => void} onUnauthorized
 */
export function installUnauthorizedInterceptor(onUnauthorized) {
  const originalFetch = window.fetch

  const wrappedFetch = async (input, init) => {
    const response = await originalFetch(input, init)
    if (isUnauthorizedApiResponse(input, init, response)) {
      onUnauthorized()
    }
    return response
  }

  window.fetch = wrappedFetch

  return () => {
    if (window.fetch === wrappedFetch) {
      window.fetch = originalFetch
    }
  }
}
