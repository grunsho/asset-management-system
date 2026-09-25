import { AssetStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { getIO } from '../lib/socket'

export interface CreateAssetInput {
  tagCode: string
  name: string
  serialNumber?: string
  categoryId: string
  locationId: string
}

export interface UpdateAssetStatusInput {
  assetId: string
  newStatus: AssetStatus
  userId: string
  reason?: string
}

export interface UpdateAssetInput {
  id: string
  tagCode?: string
  name?: string
  serialNumber?: string | null
  categoryId?: string
  locationId?: string
}

export interface AssetFilters {
  status?: AssetStatus
  categoryId?: string
  locationId?: string
  search?: string
  fromDate?: Date
  toDate?: Date
}

export const buildAssetWhere = (params: AssetFilters) => {
  const where: any = {}
  if (params.status) where.status = params.status
  if (params.categoryId) where.categoryId = params.categoryId
  if (params.locationId) where.locationId = params.locationId

  if (params.fromDate || params.toDate) {
    where.updatedAt = {
      ...(params.fromDate ? { gte: params.fromDate } : {}),
      ...(params.toDate ? { lte: params.toDate } : {}),
    }
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { tagCode: { contains: params.search, mode: 'insensitive' } },
      { category: { name: { contains: params.search, mode: 'insensitive' } } },
      { location: { name: { contains: params.search, mode: 'insensitive' } } },
    ]
  }

  return where
}

export class AssetService {
  // 1. Obtener activos paginados con filtros
  static async getAssets(
    params: {
      page?: number
      limit?: number
    } & AssetFilters,
  ) {
    const page = params.page || 1
    const limit = params.limit || 100
    const skip = (page - 1) * limit
    const where = buildAssetWhere(params)

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return {
      data: assets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  static async getAssetMetrics(filters: AssetFilters = {}) {
    const where = buildAssetWhere(filters)
    const [total, statusGroups, locationGroups] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.asset.groupBy({
        by: ['locationId'],
        where,
        _count: { _all: true },
      }),
    ])

    const counts = statusGroups.reduce(
      (result, group) => {
        result[group.status] = group._count._all
        return result
      },
      {} as Record<string, number>,
    )
    const locationIds = locationGroups.map((group) => group.locationId)
    const locations = locationIds.length
      ? await prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : []
    const locationNames = new Map(
      locations.map((location) => [location.id, location.name]),
    )

    return {
      total,
      operational: counts.OPERATIONAL || 0,
      operationalPercentage: total
        ? Number((((counts.OPERATIONAL || 0) / total) * 100).toFixed(2))
        : 0,
      inMaintenance: counts.IN_MAINTENANCE || 0,
      outOfService: counts.OUT_OF_SERVICE || 0,
      critical: counts.OUT_OF_SERVICE || 0,
      byStatus: statusGroups.map((group) => ({
        status: group.status,
        count: group._count._all,
      })),
      byLocation: locationGroups.map((group) => ({
        locationId: group.locationId,
        name: locationNames.get(group.locationId) || 'Sin Ubicación',
        count: group._count._all,
      })),
    }
  }

  static async getAssetById(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        logs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!asset) {
      throw new Error('NOT_FOUND')
    }

    return asset
  }

  // 2. Crear un nuevo activo
  static async createAsset(data: CreateAssetInput) {
    const createdAsset = await prisma.asset.create({
      data,
      include: {
        category: true,
        location: true,
      },
    })

    try {
      getIO().emit('asset:created', createdAsset)
    } catch (error) {
      console.error('Error emitiendo evento WebSocket de creación:', error)
    }

    return createdAsset
  }

  // 3. Actualización de Activo
  static async updateAsset(data: UpdateAssetInput) {
    const existingAsset = await prisma.asset.findUnique({
      where: { id: data.id },
    })

    if (!existingAsset) {
      throw new Error('NOT_FOUND')
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: data.id },
      data: {
        tagCode: data.tagCode,
        name: data.name,
        serialNumber: data.serialNumber,
        categoryId: data.categoryId,
        locationId: data.locationId,
      },
      include: {
        category: true,
        location: true,
      },
    })

    try {
      getIO().emit('asset:updated', updatedAsset)
    } catch (error) {
      console.error('Error emitiendo evento WebSocket de actualización:', error)
    }

    return updatedAsset
  }

  static async deleteAsset(id: string) {
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
    })

    if (!existingAsset) {
      throw new Error('NOT_FOUND')
    }

    await prisma.asset.delete({ where: { id } })

    try {
      getIO().emit('asset:deleted', { id })
    } catch (error) {
      console.error('Error emitiendo evento WebSocket de eliminación:', error)
    }
  }

  // 4. Transición de Estado con Log de Auditoría Transaccional
  static async updateStatus({
    assetId,
    newStatus,
    userId,
    reason,
  }: UpdateAssetStatusInput) {
    // Usamos una transacciónde Prisma para garantizar atomicidad
    const updatedAsset = await prisma.$transaction(async (tx) => {
      const currentAsset = await tx.asset.findUnique({
        where: { id: assetId },
      })

      if (!currentAsset) {
        throw new Error('NOT_FOUND')
      }

      if (currentAsset.status === newStatus) {
        throw new Error('SAME_STATUS')
      }

      // Actualizar el activo
      const asset = await tx.asset.update({
        where: { id: assetId },
        data: { status: newStatus },
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      })

      // Registrar la entrada inmutable en la tabla de auditoría (asset_logs)
      await tx.assetLog.create({
        data: {
          assetId,
          userId,
          previousStatus: currentAsset.status,
          newStatus,
          reason,
        },
      })

      return asset
    })

    // Emitir evento en tiempo real a los clientes conectados
    try {
      // const payload = {
      //   id: updatedAsset.id,
      //   status: updatedAsset.status,
      //   updatedAt: updatedAsset.updatedAt,
      // }

      getIO().emit('asset:updated', updatedAsset)
      getIO().emit('asset:status_changed', updatedAsset)
    } catch (error) {
      console.error('Error emitiendo evento de WebSocket:', error)
    }

    return updatedAsset
  }

  // 5. Obtener historial de auditoría de un activo
  static async getAssetLogs(assetId: string) {
    return prisma.assetLog.findMany({
      where: { assetId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
