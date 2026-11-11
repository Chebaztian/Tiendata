// Contexto y constantes de sesión (separados del Provider para Fast Refresh)
import { createContext } from 'react'

export const AuthContext = createContext(null)

// Renovar el token este tiempo antes de que expire
export const REFRESH_MARGIN_MS = 60 * 1000

export const SESSION_MESSAGES = {
  expired: 'Tu sesión expiró. Inicia sesión de nuevo.',
  inactivity: 'Tu sesión se cerró por inactividad. Inicia sesión de nuevo.',
  otherTab: 'La sesión se cerró en otra pestaña.',
}
