// Comunicación con el servicio de autenticación MS-01
// Endpoints: POST /api/auth/login | POST /api/auth/logout

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Clave del token JWT en localStorage — compartida con AuthContext
const TOKEN_KEY = 'tiendata_token'

export async function loginRequest(correo, contrasena) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ correo, contrasena }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Error de conexión con el servidor. Inténtalo de nuevo.')
  }

  if (response.ok) return data

  if (response.status === 401) throw new Error('Correo o contraseña incorrectos.')
  if (response.status === 423) throw new Error(data?.error?.message || 'Cuenta bloqueada. Demasiados intentos fallidos.')
  if (response.status === 403) throw new Error('Tu cuenta está deshabilitada. Contacta al Administrador.')

  throw new Error(data?.mensaje || 'Error inesperado. Inténtalo de nuevo.')
}

// Cierra sesión contra POST /api/auth/logout
export async function logoutRequest() {
  const token = localStorage.getItem(TOKEN_KEY)
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    }
  } catch {
    console.warn('No se pudo contactar el servidor para logout. Limpiando sesión local.')
  } finally {
    // Siempre limpiar el token local — independiente de la respuesta del servidor
    localStorage.removeItem(TOKEN_KEY)
  }
}

export { TOKEN_KEY }