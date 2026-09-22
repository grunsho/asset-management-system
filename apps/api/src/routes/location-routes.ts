import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/v1/locations
router.get('/', async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json(locations)
  } catch (error) {
    next(error)
  }
})

export default router
