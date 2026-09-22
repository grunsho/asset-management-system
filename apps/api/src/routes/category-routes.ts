import { Router } from 'express';
import { prisma } from '../lib/prisma'; // O tu instancia de Prisma Client

const router = Router();

// GET /api/v1/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(categories);
  } catch (error) {
    next(error);
  }
});

export default router;