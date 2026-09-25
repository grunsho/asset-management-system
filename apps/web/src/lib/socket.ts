import { io, Socket } from 'socket.io-client'
import { getAccessToken } from './api'

// Conexión reutilizable para eventos en tiempo real
export const socket: Socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
  autoConnect: false,
  withCredentials: true,
  auth: (callback) => {
    callback({ token: getAccessToken() })
  },
})
