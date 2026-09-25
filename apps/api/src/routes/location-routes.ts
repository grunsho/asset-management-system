import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  authenticateToken,
  checkPermission,
} from '../middlewares/auth-middlewares'

const router = Router()

router.use(authenticateToken)

const createLocationSchema = z.object({
  name: z.string().min(2, 'El nombre de la ubicación es requerido'),
})

// GET /api/v1/locations - Listar ubicaciones
router.get('/', checkPermission('ASSET_READ'), async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(locations)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/locations - Crear ubicación
router.post('/', checkPermission('ASSET_CREATE'), async (req, res, next) => {
  try {
    const { name } = createLocationSchema.parse(req.body)

    const location = await prisma.location.create({
      data: { name },
    })

    res.status(201).json(location)
  } catch (error) {
    next(error)
  }
})

export default router
