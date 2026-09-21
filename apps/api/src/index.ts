import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

import authRoutes from './routes/auth-routes'
import assetRoutes from './routes/asset-routes'
import { initSocket } from './lib/socket'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4000

// Inicializar WebSockets
initSocket(httpServer)

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // Permitir envío de cookies HTTP-Only
  }),
)
app.use(express.json())
app.use(cookieParser())

// Endpoint de Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Registrar rutas de la API
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/assets', assetRoutes)

httpServer.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`)
  console.log(`⚡ Servidor WebSocket listo`)
})
