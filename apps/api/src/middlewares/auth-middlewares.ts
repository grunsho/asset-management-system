import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, TokenPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'

// Extender el tipo Request de Express para adjuntar el usuario autenticado
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { permissions: string[] }
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Acceso no autorizado: Token no proporcionado' })
  }

  try {
    const decoded = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    const permissions = user.role.permissions.map((p) => p.permission.code)

    req.user = {
      userId: user.id,
      role: user.role.name,
      permissions,
    }

    next()
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' })
  }
}

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const isAdmin = req.user.role === 'ADMIN'
    const hasPermission =
      isAdmin || req.user.permissions.includes(requiredPermission)

    if (!hasPermission) {
      return res.status(403).json({
        error: `Permiso insuficiente. Requiere: ${requiredPermission}`,
      })
    }

    next()
  }
}
