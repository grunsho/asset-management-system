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
  reason: z.string().optional(),
})

const updateAssetSchema = z
  .object({
    tagCode: z.string().min(3, 'El código TAG es requerido').optional(),
    name: z.string().min(2, 'El nombre del activo es requerido').optional(),
    serialNumber: z.string().nullable().optional(),
    categoryId: z.string().uuid('ID de categoría inválido').optional(),
    locationId: z.string().uuid('ID de ubicación inválido').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })

const assetQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(AssetStatus).optional(),
    categoryId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    search: z.string().trim().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  })
  .refine(
    ({ fromDate, toDate }) => !fromDate || !toDate || fromDate <= toDate,
    {
      path: ['toDate'],
      message: 'La fecha final debe ser posterior o igual a la fecha inicial',
    },
  )

// GET /api/v1/assets - Listar activos
router.get('/', checkPermission('ASSET_READ'), async (req, res, next) => {
  try {
    const query = assetQuerySchema.parse(req.query)
    const result = await AssetService.getAssets(query)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/assets - Crear activo
router.post('/', checkPermission('ASSET_CREATE'), async (req, res, next) => {
  try {
    const validatedData = createAssetSchema.parse(req.body)
    const asset = await AssetService.createAsset(validatedData)
    res.status(201).json(asset)
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/assets/:id - Actualizar un activo
router.put(
  '/:id',
  checkPermission('ASSET_UPDATE'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const assetId = req.params.id as string
      const validatedData = updateAssetSchema.parse(req.body)

      const updatedAsset = await AssetService.updateAsset({
        id: assetId,
        ...validatedData,
      })

      res.json({
        message: 'Activo actualizado con éxito',
        asset: updatedAsset,
      })
    } catch (error) {
      next(error)
    }
  },
)

// GET /api/v1/assets/:id - Detalle completo con historial
router.get('/:id', checkPermission('ASSET_READ'), async (req, res, next) => {
  try {
    const asset = await AssetService.getAssetById(req.params.id as string)
    res.json(asset)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/assets/:id - Eliminar activo
router.delete(
  '/:id',
  checkPermission('ASSET_DELETE'),
  async (req, res, next) => {
    try {
      await AssetService.deleteAsset(req.params.id as string)
      res.json({ message: 'Activo eliminado con éxito' })
    } catch (error) {
      next(error)
    }
  },
)

// PATCH /api/v1/assets/:id/status - Cambiar estado con auditoría
router.patch(
  '/:id/status',
  checkPermission('ASSET_UPDATE_STATUS'),
  async (req: AuthenticatedRequest, res: Response, next) => {
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
      next(error)
    }
  },
)

// GET /api/v1/assets/:id/logs - Obtener historial de auditoría de un activo
router.get(
  '/:id/logs',
  checkPermission('ASSET_READ'),
  async (req, res, next) => {
    try {
      const logs = await AssetService.getAssetLogs(req.params.id as string)
      res.json(logs)
    } catch (error) {
      next(error)
    }
  },
)

export default router
