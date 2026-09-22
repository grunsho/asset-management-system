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
router.post('/login', async (req, res) => {
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
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Error detallado durante el login:', error)
    return res
      .status(500)
      .json({ error: 'Error en el servidor durante el login' })
  }
})

// POST /api/v1/auth/refresh (Renovación de Access Token vía Cookie)
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token no proporcionado' })
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
      return res.status(403).json({ error: 'Usuario inactivo o no encontrado' })
    }

    const permissions = getPermissionCodes(user.role)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role.name,
      permissions,
    })

    return res.json({ accessToken: newAccessToken, permissions })
  } catch (error) {
    return res
      .status(403)
      .json({ error: 'Error al procesar el token de refresco' })
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
  async (req: AuthenticatedRequest, res: Response) => {
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
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }

      res.json({
        user,
        permissions: req.user?.permissions || [],
      })
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener datos del usuario' })
    }
  },
)

export default router
