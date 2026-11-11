// Lectura del payload de un JWT en el cliente (sin verificar la firma).
// Solo se usa para conocer la expiración y programar la renovación;
// la validez real siempre la decide el servidor (GET /api/auth/verify).

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Expiración del token en milisegundos, o null si no se puede leer. */
export function getTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token)
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null
}

export function isTokenExpired(token, now = Date.now()) {
  const exp = getTokenExpiryMs(token)
  return exp !== null && exp <= now
}
