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
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const payload = { userId: user.id, role: user.role.name }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Guardar Refresh Token en cookies HTTP-Only segura
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    })

    res.json({
      message: 'Autenticación exitosa',
      accessToken,
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
    res.status(500).json({ error: 'Error en el servidor durante el login' })
  }
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
