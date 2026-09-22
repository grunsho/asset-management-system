import { io, Socket } from 'socket.io-client'

// Conexión reutilizable para eventos en tiempo real
export const socket: Socket = io('/', {
  autoConnect: false,
  withCredentials: true,
})
