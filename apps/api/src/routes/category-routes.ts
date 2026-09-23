import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma' // O tu instancia de Prisma Client
import {
  authenticateToken,
  checkPermission,
} from '../middlewares/auth-middlewares'

const router = Router()

router.use(authenticateToken)

const createCategorySchema = z.object({
  name: z.string().min(2, 'El nombre de la categoría es requerido'),
})

// GET /api/v1/categories - Listar categorías
router.get('/', checkPermission('ASSET_READ'), async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

// POST /api/v1/categories - Crear categoría
router.post('/', checkPermission('ASSET_CREATE'), async (req, res) => {
  try {
    const { name } = createCategorySchema.parse(req.body)

    const category = await prisma.category.create({
      data: { name },
    })

    res.status(201).json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Error al crear la categoría' })
    }
  }
})

// DELETE /api/v1/categories/:id
router.delete('/:id', checkPermission('ASSET_DELETE'), async (req, res) => {
  try {
    const { id } = req.params as { id: string }

    // Validar si existen activos asociados
    const count = await prisma.asset.count({ where: { categoryId: id } })
    if (count > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la categoría. Tiene ${count} activo(s) asociado(s).`,
      })
    }

    await prisma.category.delete({ where: { id } })
    res.json({ message: 'Categoría eliminada con éxito.' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la categoría' })
  }
})

export default router
