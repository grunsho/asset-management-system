// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

vi.mock('../../../apps/web/src/lib/api', () => ({
  api: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    put: mocks.apiPut,
  },
}))

vi.mock('../../../apps/web/src/components/CreateAttributeModal', () => ({
  CreateAttributeModal: () => null,
}))

import { AssetModal } from '../../../apps/web/src/components/AssetModal'

describe('AssetModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiGet.mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === '/categories'
            ? [{ id: 'category-1', name: 'Bombas' }]
            : [{ id: 'location-1', name: 'Planta Norte' }],
      }),
    )
  })

  it('muestra los detalles de validación del contrato API normalizado', async () => {
    mocks.apiPost.mockRejectedValue({
      response: {
        data: {
          error: 'La solicitud contiene datos inválidos',
          code: 'VALIDATION_ERROR',
          details: [
            {
              path: ['tagCode'],
              message: 'El código TAG es requerido',
            },
          ],
        },
      },
    })

    render(<AssetModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Ej. PUMP-01'), {
      target: { value: 'PU' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('Ej. Bomba Centrífuga Principal 50HP'),
      {
        target: { value: 'Bomba de prueba' },
      },
    )
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2)
    })
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'category-1' },
    })
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'location-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Activo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'tagCode: El código TAG es requerido',
    )
    expect(mocks.apiPost).toHaveBeenCalledOnce()
  })
})
