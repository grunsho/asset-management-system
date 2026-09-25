// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../apps/web/src/context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

import { ProtectedRoute } from '../../../apps/web/src/components/ProtectedRoute'

const renderProtectedRoute = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute requiredPermission="ASSET_READ" />}>
          <Route path="/protected" element={<p>Contenido protegido</p>} />
        </Route>
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mocks.useAuth.mockReset()
  })

  it('muestra el estado de carga mientras verifica la sesión', () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      hasPermission: vi.fn(),
    })

    renderProtectedRoute()

    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument()
  })

  it('redirige al login si no hay sesión', () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      hasPermission: vi.fn(),
    })

    renderProtectedRoute()

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
  })

  it('bloquea al usuario sin el permiso requerido', () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasPermission: vi.fn().mockReturnValue(false),
    })

    renderProtectedRoute()

    expect(screen.getByText('Acceso no autorizado')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza el contenido con el permiso requerido', () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasPermission: vi.fn().mockReturnValue(true),
    })

    renderProtectedRoute()

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })
})
