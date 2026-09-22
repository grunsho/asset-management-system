import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/v1/reports/export?format=csv
router.get(
  '/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assets = await prisma.asset.findMany({
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

export default router
