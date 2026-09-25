// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiPatch: vi.fn(),
}))

vi.mock('../../../apps/web/src/lib/api', () => ({
  api: {
    patch: mocks.apiPatch,
  },
}))

import { ChangeStatusModal } from '../../../apps/web/src/components/ChangeStatusModal'

const asset = {
  id: 'asset-1',
  tagCode: 'PUMP-42',
  name: 'Bomba principal',
  status: 'IN_MAINTENANCE' as const,
  categoryId: 'category-1',
  locationId: 'location-1',
  updatedAt: '2026-09-25T10:00:00.000Z',
}

describe('ChangeStatusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inicializa el estado actual y registra el motivo al enviar', async () => {
    mocks.apiPatch.mockResolvedValue({ data: {} })
    const onSuccess = vi.fn()
    const onClose = vi.fn()

    render(
      <ChangeStatusModal
        isOpen
        asset={asset}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('IN_MAINTENANCE')
    })
    fireEvent.change(screen.getByPlaceholderText(/Mantención preventiva/), {
      target: { value: 'Falla detectada' },
    })
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'OUT_OF_SERVICE' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Estado' }))

    await waitFor(() => {
      expect(mocks.apiPatch).toHaveBeenCalledWith('/assets/asset-1/status', {
        status: 'OUT_OF_SERVICE',
        reason: 'Falla detectada',
      })
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('muestra el error devuelto por la API y conserva el formulario', async () => {
    mocks.apiPatch.mockRejectedValue({
      response: { data: { error: 'El activo ya se encuentra en ese estado' } },
    })

    render(
      <ChangeStatusModal
        isOpen
        asset={asset}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/Mantención preventiva/), {
      target: { value: 'Falla detectada' },
    })
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('IN_MAINTENANCE')
    })
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'OPERATIONAL' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Estado' }))

    expect(
      await screen.findByText('El activo ya se encuentra en ese estado'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Falla detectada')).toBeInTheDocument()
  })
})
