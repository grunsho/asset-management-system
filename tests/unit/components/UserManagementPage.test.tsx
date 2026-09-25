// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../../../apps/web/src/lib/api', () => ({
  api: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    patch: mocks.apiPatch,
  },
}))

vi.mock('../../../apps/web/src/context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

import { UserManagementPage } from '../../../apps/web/src/pages/UserManagementPage'

const roles = [
  { id: 'role-admin', name: 'ADMIN' },
  { id: 'role-operator', name: 'OPERATOR' },
  { id: 'role-viewer', name: 'VIEWER' },
]

const user = {
  id: 'user-1',
  email: 'operator@example.test',
  firstName: 'Operador',
  lastName: 'Prueba',
  isActive: true,
  createdAt: '2026-09-25T10:00:00.000Z',
  role: { id: 'role-operator', name: 'OPERATOR' },
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <UserManagementPage />
    </MemoryRouter>,
  )

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.test' },
    })
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/users') return Promise.resolve({ data: [user] })
      if (url === '/users/roles') return Promise.resolve({ data: roles })
      return Promise.reject(new Error(`Unexpected API GET: ${url}`))
    })
  })

  it('lista usuarios y guarda un cambio de rol', async () => {
    mocks.apiPatch.mockResolvedValue({
      data: { ...user, role: { id: 'role-viewer', name: 'VIEWER' } },
    })

    renderPage()

    expect(await screen.findByText('operator@example.test')).toBeInTheDocument()
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Rol de operator@example.test' }),
      {
        target: { value: 'role-viewer' },
      },
    )

    await waitFor(() => {
      expect(mocks.apiPatch).toHaveBeenCalledWith('/users/user-1', {
        roleId: 'role-viewer',
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cambios guardados para operator@example.test.',
    )
  })

  it('envía un usuario nuevo con el rol seleccionado', async () => {
    mocks.apiPost.mockResolvedValue({ data: { id: 'new-user' } })

    renderPage()
    await waitFor(() => {
      expect(
        screen.getAllByRole('option', { name: 'VIEWER' }).length,
      ).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Nuevo' },
    })
    fireEvent.change(screen.getByLabelText('Apellido'), {
      target: { value: 'Usuario' },
    })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'new@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña inicial'), {
      target: { value: 'SafePassword123!' },
    })
    fireEvent.change(screen.getByLabelText('Rol del nuevo usuario'), {
      target: { value: 'role-viewer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/users', {
        email: 'new@example.test',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        password: 'SafePassword123!',
        roleId: 'role-viewer',
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Usuario creado.',
    )
  })
})
