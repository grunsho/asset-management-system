import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  authenticateToken,
  checkPermission,
} from '../middlewares/auth-middlewares'
import { AssetService, buildAssetWhere } from '../services/asset-service'
import { prisma } from '../lib/prisma'
import { AssetStatus } from '@prisma/client'

const router = Router()

const reportFilterFields = {
  status: z.enum(AssetStatus).optional(),
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
}

const withDateRangeValidation = <T extends z.ZodType>(schema: T) =>
  schema.refine(
    (query: any) =>
      !query.fromDate || !query.toDate || query.fromDate <= query.toDate,
    {
      path: ['toDate'],
      message: 'La fecha final debe ser posterior o igual a la fecha inicial',
    },
  )

const reportQuerySchema = withDateRangeValidation(
  z.object({ format: z.literal('csv'), ...reportFilterFields }),
)
const reportMetricsQuerySchema = withDateRangeValidation(
  z.object(reportFilterFields),
)

// GET /api/v1/reports/export?format=csv
router.get(
  '/export',
  authenticateToken,
  checkPermission('ASSET_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = reportQuerySchema.parse(req.query)
      const assets = await prisma.asset.findMany({
        where: buildAssetWhere(query),
        include: {
          category: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Definición de cabeceras CSV
      const headers = [
        'ID',
        'Tag Code',
        'Nombre',
        'Número de Serie',
        'Categoría',
        'Ubicación',
        'Estado',
        'Fecha de Actualización',
      ]

      // Mapeo de filas
      const rows = assets.map((a) => [
        a.id,
        `"${a.tagCode || ''}"`,
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.serialNumber || ''}"`,
        `"${a.category?.name || 'Sin Categoría'}"`,
        `"${a.location?.name || 'Sin Ubicación'}"`,
        a.status,
        a.updatedAt.toISOString(),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n')

      // Configuración de respuesta HTTP para descarga de archivo
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=inventario_activos_${Date.now()}.csv`,
      )

      return res.status(200).send(csvContent)
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/metrics',
  authenticateToken,
  checkPermission('ASSET_READ'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = reportMetricsQuerySchema.parse(req.query)
      const metrics = await AssetService.getAssetMetrics(query)
      res.json(metrics)
    } catch (error) {
      next(error)
    }
  },
)

export default router
