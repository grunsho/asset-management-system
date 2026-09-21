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

export class AssetService {
  // 1. Obtener activos paginados con filtros
  static async getAssets(params: {
    page?: number
    limit?: number
    status?: AssetStatus
    search?: string
  }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    const where: any = {}
    if (params.status) where.status = params.status
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { tagCode: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { name: true } },
          location: { select: { name: true } },
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

  // 2. Crear un nuevo activo
  static async createAsset(data: CreateAssetInput) {
    return prisma.asset.create({
      data,
      include: {
        category: true,
        location: true,
      },
    })
  }

  // 3. Transición de Estado con Log de Auditoría Transaccional
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
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: { status: newStatus },
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

      return updatedAsset
    })

    // Emitir evento en tiempo real a los clientes conectados
    try {
      getIO().emit('asset:status_changed', {
        assetId: updatedAsset.id,
        newStatus: updatedAsset.status,
        updatedAt: updatedAsset.updatedAt,
      })
    } catch (error) {
      console.error('Error emitiendo evento de WebSocket:', error)
    }

    return updatedAsset
  }

  // 4. Obtener historial de auditoría de un activo
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
