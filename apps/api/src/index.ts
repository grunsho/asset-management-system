import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth-routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

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

// Rutas de Autenticación
app.use('/api/v1/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`)
})
