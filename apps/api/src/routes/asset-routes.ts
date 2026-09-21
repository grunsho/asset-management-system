import { Router, Response } from 'express'
import { z } from 'zod'
import { AssetStatus } from '@prisma/client'
import {
  authenticateToken,
  checkPermission,
  AuthenticatedRequest,
} from '../middlewares/auth-middlewares'
import { AssetService } from '../services/asset-service'

const router = Router()

// Midleware de autenticación global para todo el módulo de activos
router.use(authenticateToken)

// Esquemas Zod para validación de entrada
const createAssetSchema = z.object({
  tagCode: z.string().min(3, 'El código TAG es requerido'),
  name: z.string().min(2, 'El nombre del activo es requerido'),
  serialNumber: z.string().optional(),
  categoryId: z.string().uuid('ID de categoría inválido'),
  locationId: z.string().uuid('ID de ubicación inválido'),
})

const updateStatusSchema = z.object({
  status: z.enum(AssetStatus, {
    error: 'Estado de activo no válido',
  }),
  reason: z.string().optional,
})

// GET /api/v1/assets - Listar activos
router.get('/', checkPermission('ASSET_READ'), async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined
    const status = req.query.status as AssetStatus | undefined
    const search = req.query.search as string | undefined

    const result = await AssetService.getAssets({ page, limit, status, search })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar activos' })
  }
})

// POST /api/v1/assets - Crear activo
router.post('/', checkPermission('ASSET_CREATE'), async (req, res) => {
  try {
    const validatedData = createAssetSchema.parse(req.body)
    const asset = await AssetService.createAsset(validatedData)
    res.status(201).json(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Error al crear el activo' })
  }
})

// PATCH /api/v1/assets/:id/status - Cambiar estado con auditoría
router.patch(
  '/:id/status',
  checkPermission('ASSET_UPDATE_STATUS'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assetId = req.params.id as string
      const { status, reason } = updateStatusSchema.parse(req.body) as z.infer<
        typeof updateStatusSchema
      >
      const userId = req.user!.userId

      const updatedAsset = await AssetService.updateStatus({
        assetId,
        newStatus: status,
        userId,
        reason: reason as string | undefined,
      })

      res.json({
        message: 'Estado del activo actualizado con éxito',
        asset: updatedAsset,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues })
      }
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          return res.status(404).json({ error: 'Activo no encontrado' })
        }
        if (error.message === 'SAME_STATUS') {
          return res
            .status(400)
            .json({ error: 'El activo ya se encuentra en ese estado' })
        }
      }
      res
        .status(500)
        .json({ error: 'Error al actualizar el estado del activo' })
    }
  },
)

// GET /api/v1/assets/:id/logs - Obtener historial de auditoría de un activo
router.get('/:id/logs', checkPermission('ASSET_READ'), async (req, res) => {
  try {
    const logs = await AssetService.getAssetLogs(req.params.id as string)
    res.json(logs)
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Error al obtener el historial de auditoría' })
  }
})

export default router
