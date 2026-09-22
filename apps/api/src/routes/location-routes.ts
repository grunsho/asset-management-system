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
router.get('/', checkPermission('ASSET_READ'), async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(locations)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ubicaciones' })
  }
})

// POST /api/v1/locations - Crear ubicación
router.post('/', checkPermission('ASSET_CREATE'), async (req, res) => {
  try {
    const { name } = createLocationSchema.parse(req.body)

    const location = await prisma.location.create({
      data: { name },
    })

    res.status(201).json(location)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Error al crear la ubicación' })
  }
})

export default router
