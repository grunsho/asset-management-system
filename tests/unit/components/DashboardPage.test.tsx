// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  useAuth: vi.fn(),
  socketConnect: vi.fn(),
  socketEmit: vi.fn(),
  socketOn: vi.fn(),
  socketOff: vi.fn(),
  socketDisconnect: vi.fn(),
}))

vi.mock('../../../apps/web/src/lib/api', () => ({
  api: {
    get: mocks.apiGet,
    delete: mocks.apiDelete,
  },
}))

vi.mock('../../../apps/web/src/lib/socket', () => ({
  socket: {
    connect: mocks.socketConnect,
    emit: mocks.socketEmit,
    on: mocks.socketOn,
    off: mocks.socketOff,
    disconnect: mocks.socketDisconnect,
  },
}))

vi.mock('../../../apps/web/src/context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('../../../apps/web/src/components/AssetCharts', () => ({
  AssetCharts: () => null,
}))

vi.mock('../../../apps/web/src/components/AssetModal', () => ({
  AssetModal: () => null,
}))

vi.mock('../../../apps/web/src/components/AssetAuditModal', () => ({
  AssetAuditModal: () => null,
}))

vi.mock('../../../apps/web/src/components/ChangeStatusModal', () => ({
  ChangeStatusModal: () => null,
}))

import { DashboardPage } from '../../../apps/web/src/pages/DashboardPage'

const metrics = {
  total: 41,
  operational: 30,
  operationalPercentage: 73.17,
  inMaintenance: 8,
  outOfService: 3,
  critical: 3,
  byStatus: [{ status: 'OPERATIONAL', count: 30 }],
  byLocation: [{ locationId: 'location-1', name: 'Planta Norte', count: 41 }],
}

const assetPage = {
  data: [
    {
      id: 'asset-1',
      tagCode: 'PUMP-42',
      name: 'Bomba principal',
      status: 'OPERATIONAL',
      categoryId: 'category-1',
      locationId: 'location-1',
      category: { id: 'category-1', name: 'Bombas' },
      location: { id: 'location-1', name: 'Planta Norte' },
      updatedAt: '2026-09-25T10:00:00.000Z',
    },
  ],
  pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
}

const configureSuccessfulApi = () => {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/assets') return Promise.resolve({ data: assetPage })
    if (url === '/reports/metrics') return Promise.resolve({ data: metrics })
    if (url === '/categories' || url === '/locations') {
      return Promise.resolve({ data: [] })
    }
    return Promise.reject(new Error(`Unexpected API GET: ${url}`))
  })
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({
      user: { firstName: 'Test', lastName: 'User', role: 'ADMIN' },
      logout: vi.fn(),
      hasPermission: vi.fn().mockReturnValue(false),
    })
  })

  it('muestra el error de carga y permite recuperar los activos', async () => {
    let assetRequests = 0
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/assets') {
        assetRequests += 1
        return assetRequests === 1
          ? Promise.reject({
              response: { data: { error: 'API temporalmente no disponible' } },
            })
          : Promise.resolve({ data: assetPage })
      }
      if (url === '/reports/metrics') return Promise.resolve({ data: metrics })
      if (url === '/categories' || url === '/locations') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`Unexpected API GET: ${url}`))
    })

    render(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API temporalmente no disponible',
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Reintentar carga de activos' }),
    )

    expect(await screen.findByText('PUMP-42')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(assetRequests).toBe(2)
  })

  it('muestra métricas globales y envía la búsqueda como filtro server-side', async () => {
    configureSuccessfulApi()

    render(<DashboardPage />)

    expect(await screen.findByText('PUMP-42')).toBeInTheDocument()
    expect(screen.getByText('41')).toBeInTheDocument()
    expect(screen.getByText('30 (73.17%)')).toBeInTheDocument()

    fireEvent.change(
      screen.getByPlaceholderText('Buscar por nombre o código...'),
      { target: { value: 'PUMP' } },
    )

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith(
        '/assets',
        expect.objectContaining({
          params: expect.objectContaining({ search: 'PUMP' }),
        }),
      )
    })
    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith(
        '/reports/metrics',
        expect.objectContaining({
          params: expect.objectContaining({ search: 'PUMP' }),
        }),
      )
    })

    fireEvent.change(screen.getByLabelText('Fecha desde'), {
      target: { value: '2026-09-01' },
    })

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith(
        '/assets',
        expect.objectContaining({
          params: expect.objectContaining({ fromDate: '2026-09-01' }),
        }),
      )
      expect(mocks.apiGet).toHaveBeenCalledWith(
        '/reports/metrics',
        expect.objectContaining({
          params: expect.objectContaining({ fromDate: '2026-09-01' }),
        }),
      )
    })
  })
})
