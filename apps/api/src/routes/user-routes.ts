import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { RoleName } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  authenticateToken,
  AuthenticatedRequest,
  checkPermission,
} from '../middlewares/auth-middlewares'
import { HttpError } from '../middlewares/error-middleware'

const router = Router()
router.use(authenticateToken, checkPermission('USER_MANAGE'))

const createUserSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
  roleId: z.string().uuid(),
})

const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    roleId: z.string().uuid().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })

router.get('/roles', async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    })
    res.json(roles)
  } catch (error) {
    next(error)
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
    })
    res.json(users)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body)
    const role = await prisma.role.findUnique({ where: { id: input.roleId } })
    if (!role) {
      throw new HttpError(400, 'INVALID_ROLE', 'El rol seleccionado no existe')
    }

    const passwordHash = await bcrypt.hash(input.password, 12)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        roleId: input.roleId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    })
    res.status(201).json(user)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.params.id as string
    const input = updateUserSchema.parse(req.body)
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })
    if (!existingUser) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')
    }

    if (input.roleId) {
      const targetRole = await prisma.role.findUnique({
        where: { id: input.roleId },
      })
      if (!targetRole) {
        throw new HttpError(
          400,
          'INVALID_ROLE',
          'El rol seleccionado no existe',
        )
      }
    }

    const isRemovingActiveAdmin =
      existingUser.isActive &&
      existingUser.role.name === RoleName.ADMIN &&
      (input.isActive === false ||
        (input.roleId !== undefined && input.roleId !== existingUser.roleId))

    if (isRemovingActiveAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: {
          isActive: true,
          role: { name: RoleName.ADMIN },
          id: { not: userId },
        },
      })
      if (otherActiveAdmins === 0) {
        throw new HttpError(
          409,
          'LAST_ACTIVE_ADMIN',
          'No se puede desactivar o cambiar el rol del último administrador activo',
        )
      }
    }

    if (
      req.user?.userId === userId &&
      (input.isActive === false ||
        (input.roleId !== undefined && input.roleId !== existingUser.roleId))
    ) {
      throw new HttpError(
        409,
        'SELF_ROLE_CHANGE',
        'No puedes desactivar tu propia cuenta ni cambiar tu propio rol',
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
})

export default router
