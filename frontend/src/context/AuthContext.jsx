// Guarda y recupera el JWT de localStorage 


import { createContext, useState, useEffect, useCallback } from 'react'
import { logoutRequest } from '../api/auth.js'

export const AuthContext = createContext(null)

const TOKEN_KEY = 'tiendata_token'
const USER_KEY = 'tiendata_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // { id_usuario, rol, nombre }
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // cargando sesión inicial

  // Al montar: recuperar sesión guardada en localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        // Datos corruptos — limpiar
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  /**
   * Guardar sesión tras login exitoso
   * @param {{ token, id_usuario, rol, nombre }} loginData
   */
  const login = useCallback((loginData) => {
    const { token: newToken, id_usuario, rol, nombre } = loginData
    const userData = { id_usuario, rol, nombre }

    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))

    setToken(newToken)
    setUser(userData)
  }, [])

  /**
   * Cerrar sesión: limpia localStorage y estado
   */
const logout = useCallback(async () => {
  try {
    await logoutRequest()
  } catch (error) {
    console.warn('Error al cerrar sesión en el servidor:', error)
  } finally {
    // Siempre limpia localmente — independiente de la respuesta del servidor
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }
}, [])

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}