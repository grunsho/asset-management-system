import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'

import authRoutes from './routes/auth-routes'
import assetRoutes from './routes/asset-routes'
import categoryRoutes from './routes/category-routes'
import locationRoutes from './routes/location-routes'
import reportRoutes from './routes/report-routes'
import userRoutes from './routes/user-routes'
import { initSocket } from './lib/socket'
import { openapiDocument } from './docs/openapi'
import { validateJwtSecrets } from './lib/jwt'
import { errorMiddleware } from './middlewares/error-middleware'

dotenv.config()
validateJwtSecrets()

export const app = express()
export const httpServer = createServer(app)
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

app.get('/api/docs.json', (_req, res) => {
  res.json(openapiDocument)
})
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))

// Registrar rutas de la API
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/assets', assetRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/locations', locationRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/users', userRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', code: 'ROUTE_NOT_FOUND' })
})
app.use(errorMiddleware)

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API corriendo en http://localhost:${PORT}`)
    console.log(`⚡ Servidor WebSocket listo`)
  })
}
