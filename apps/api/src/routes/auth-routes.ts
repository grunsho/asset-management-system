import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt'
import {
  authenticateToken,
  AuthenticatedRequest,
} from '../middlewares/auth-middlewares'
import { HttpError } from '../middlewares/error-middleware'

const router = Router()

// Esquema de validación para login usando Zod
const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

const getPermissionCodes = (role: {
  permissions?: Array<{ permission: { code: string } }> | null
}): string[] => {
  return role.permissions?.map(({ permission }) => permission.code) || []
}

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' })
    }

    const permissions = getPermissionCodes(user.role)
    const payload = {
      userId: user.id,
      role: user.role.name,
      permissions,
    }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Guardar Refresh Token en cookies HTTP-Only segura
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      message: 'Autenticación exitosa',
      accessToken,
      permissions,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/auth/refresh (Renovación de Access Token vía Cookie)
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token no proporcionado',
        code: 'REFRESH_TOKEN_MISSING',
      })
    }

    const payload = verifyRefreshToken(refreshToken) as {
      userId: string
      role: string
    }

    if (!payload) {
      return res
        .status(403)
        .json({ error: 'Refresh token inválido o expirado' })
    }

    // Verificar que el usuario siga activo
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return next(
        new HttpError(403, 'USER_INACTIVE', 'Usuario inactivo o no encontrado'),
      )
    }

    const permissions = getPermissionCodes(user.role)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role.name,
      permissions,
    })

    return res.json({ accessToken: newAccessToken, permissions })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/auth/logout (Limpiar cookie)
router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
  res.json({ message: 'Sesión cerrada con éxito' })
})

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: {
            select: { name: true },
          },
        },
      })

      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')
      }

      res.json({
        user: {
          ...user,
          role: user.role.name,
        },
        permissions: req.user?.permissions || [],
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router
