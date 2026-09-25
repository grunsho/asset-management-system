import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetStatus } from '@prisma/client'

const mocks = vi.hoisted(() => ({
  asset: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  assetLog: {
    create: vi.fn(),
  },
  transaction: vi.fn(),
  emit: vi.fn(),
}))

vi.mock('../../../apps/api/src/lib/prisma', () => ({
  prisma: {
    asset: mocks.asset,
    assetLog: mocks.assetLog,
    $transaction: mocks.transaction,
  },
}))

vi.mock('../../../apps/api/src/lib/socket', () => ({
  getIO: () => ({ emit: mocks.emit }),
}))

import { AssetService } from '../../../apps/api/src/services/asset-service'

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aplica filtros y paginación al listar activos', async () => {
    mocks.asset.count.mockResolvedValue(21)
    mocks.asset.findMany.mockResolvedValue([{ id: 'asset-1' }])

    const result = await AssetService.getAssets({
      page: 2,
      limit: 10,
      status: AssetStatus.IN_MAINTENANCE,
      categoryId: 'category-id',
      locationId: 'location-id',
      search: 'pump',
    })

    expect(mocks.asset.count).toHaveBeenCalledWith({
      where: {
        status: AssetStatus.IN_MAINTENANCE,
        categoryId: 'category-id',
        locationId: 'location-id',
        OR: [
          { name: { contains: 'pump', mode: 'insensitive' } },
          { tagCode: { contains: 'pump', mode: 'insensitive' } },
          { category: { name: { contains: 'pump', mode: 'insensitive' } } },
          { location: { name: { contains: 'pump', mode: 'insensitive' } } },
        ],
      },
    })
    expect(mocks.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    )
    expect(result.pagination).toEqual({
      total: 21,
      page: 2,
      limit: 10,
      totalPages: 3,
    })
  })

  it('actualiza el estado y crea el log dentro de una transacción', async () => {
    const transaction = {
      asset: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'asset-1',
          status: AssetStatus.OPERATIONAL,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'asset-1',
          status: AssetStatus.IN_MAINTENANCE,
        }),
      },
      assetLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    }
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transaction),
    )

    const result = await AssetService.updateStatus({
      assetId: 'asset-1',
      newStatus: AssetStatus.IN_MAINTENANCE,
      userId: 'operator-1',
      reason: 'Mantención preventiva',
    })

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(transaction.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asset-1' },
        data: { status: AssetStatus.IN_MAINTENANCE },
      }),
    )
    expect(transaction.assetLog.create).toHaveBeenCalledWith({
      data: {
        assetId: 'asset-1',
        userId: 'operator-1',
        previousStatus: AssetStatus.OPERATIONAL,
        newStatus: AssetStatus.IN_MAINTENANCE,
        reason: 'Mantención preventiva',
      },
    })
    expect(mocks.emit).toHaveBeenCalledWith('asset:status_changed', result)
  })

  it('rechaza una transición al mismo estado sin escribir', async () => {
    const transaction = {
      asset: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'asset-1',
          status: AssetStatus.OPERATIONAL,
        }),
        update: vi.fn(),
      },
      assetLog: {
        create: vi.fn(),
      },
    }
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transaction),
    )

    await expect(
      AssetService.updateStatus({
        assetId: 'asset-1',
        newStatus: AssetStatus.OPERATIONAL,
        userId: 'operator-1',
      }),
    ).rejects.toThrow('SAME_STATUS')

    expect(transaction.asset.update).not.toHaveBeenCalled()
    expect(transaction.assetLog.create).not.toHaveBeenCalled()
  })

  it('rechaza el cambio de estado de un activo inexistente', async () => {
    const transaction = {
      asset: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      assetLog: {
        create: vi.fn(),
      },
    }
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transaction),
    )

    await expect(
      AssetService.updateStatus({
        assetId: 'missing-id',
        newStatus: AssetStatus.OUT_OF_SERVICE,
        userId: 'operator-1',
      }),
    ).rejects.toThrow('NOT_FOUND')

    expect(transaction.asset.update).not.toHaveBeenCalled()
    expect(transaction.assetLog.create).not.toHaveBeenCalled()
  })
})
