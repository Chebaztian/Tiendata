import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './login.jsx'

const authState = vi.hoisted(() => ({ value: null }))
const loginRequestMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => authState.value }))
vi.mock('../../api/auth', () => ({ loginRequest: loginRequestMock }))

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    loginRequestMock.mockReset()
    authState.value = {
      login: vi.fn(),
      sessionMessage: null,
      clearSessionMessage: vi.fn(),
    }
  })

  it('permite ingresar con nombre de usuario', async () => {
    loginRequestMock.mockResolvedValue({
      data: { token: 't', id_usuario: 1, rol: 'Operador', nombre: 'Op' },
    })
    renderLogin()

    fireEvent.change(screen.getByLabelText('Correo o usuario'), { target: { value: ' operador1 ' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(authState.value.login).toHaveBeenCalled())
    expect(loginRequestMock).toHaveBeenCalledWith('operador1', 'Clave1234')
  })

  it('muestra el aviso de sesión finalizada', () => {
    authState.value.sessionMessage = 'Tu sesión expiró. Inicia sesión de nuevo.'
    renderLogin()
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró')
  })

  it('muestra el bloqueo como advertencia', async () => {
    const error = Object.assign(new Error('Cuenta bloqueada. Intente de nuevo en 5 minutos'), {
      status: 423,
    })
    loginRequestMock.mockRejectedValue(error)
    renderLogin()

    fireEvent.change(screen.getByLabelText('Correo o usuario'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('5 minutos')
    expect(alert).toHaveClass('warning')
  })
})
