import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyAccessToken } from './jwt'
import { prisma } from './prisma'

let io: SocketIOServer | null = null

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token

      if (typeof token !== 'string' || !token) {
        return next(new Error('Token no proporcionado'))
      }

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
        return next(new Error('Usuario inactivo o no encontrado'))
      }

      const permissions = user.role.permissions.map(
        (item) => item.permission.code,
      )
      if (!permissions.includes('ASSET_READ')) {
        return next(new Error('Permiso insuficiente'))
      }

      socket.data.user = {
        userId: user.id,
        role: user.role.name,
        permissions,
      }
      next()
    } catch {
      next(new Error('Token inválido o expirado'))
    }
  })

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`)

    // Unirse a salas de monitoreo específicas si fuera necesario
    socket.on('join:assets', () => {
      socket.join('assets_room')
    })

    socket.on('disconnect', () => {
      console.log(`❌ Cliente WebSocket desconectado: ${socket.id}`)
    })
  })

  return io
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado')
  }
  return io
}
