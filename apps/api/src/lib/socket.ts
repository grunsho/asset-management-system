import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

let io: SocketIOServer | null = null

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
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
