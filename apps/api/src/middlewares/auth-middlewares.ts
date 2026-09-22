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
  const token = authHeader && authHeader.split(' ')[1] // Formato: "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Acceso no autorizado: Token no proporcionado' })
  }

  try {
    const decoded = verifyAccessToken(token)

    let permissions = decoded.permissions || []

    if (!permissions.length) {
      const userRole = await prisma.role.findUnique({
        where: { name: decoded.role as any },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })

      permissions = userRole?.permissions.map((p) => p.permission.code) || []
    }

    req.user = {
      ...decoded,
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

    const hasPermission = req.user.permissions.includes(requiredPermission)

    if (!hasPermission) {
      return res.status(403).json({
        error: `Permiso insuficiente. Requiere: ${requiredPermission}`,
      })
    }

    next()
  }
}
